import mongoose, { type FilterQuery, type PipelineStage } from 'mongoose';

import {
  endOfMonth,
  isCategoryValidForType,
  startOfMonth,
  subMinor,
  type CreateTransactionInput,
  type TransactionDto,
  type TransactionListDto,
  type TransactionQuery,
  type TransactionSummaryDto,
  type UpdateTransactionInput,
} from '@savewise/shared';

import { SavingsGoal } from '../models/SavingsGoal.js';
import {
  Transaction,
  type TransactionAttributes,
  type TransactionDocument,
} from '../models/Transaction.js';
import { AppError } from '../utils/AppError.js';
import { toTransactionDto } from './mappers.js';

/**
 * Transactions — the ledger.
 *
 * Every query in this module is scoped by `userId` taken from the verified
 * session, never from the request. There is no code path that reads a
 * transaction by id alone: ownership is part of the filter, so an IDOR attempt
 * returns "not found" because, for that user, it genuinely is.
 */

export async function listTransactions(
  userId: string,
  query: TransactionQuery,
): Promise<TransactionListDto> {
  const filter = buildFilter(userId, query);
  const skip = (query.page - 1) * query.pageSize;

  const sortField = query.sort;
  const sort: Record<string, 1 | -1> = {
    [sortField]: query.order === 'asc' ? 1 : -1,
    // A stable tiebreaker keeps pagination deterministic when several rows
    // share a date — otherwise a row can appear on two pages or on neither.
    _id: -1,
  };

  const [items, total, summary] = await Promise.all([
    Transaction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(query.pageSize)
      .populate<{ goalId: { name: string } | null }>('goalId', 'name')
      .exec(),
    Transaction.countDocuments(filter).exec(),
    summarise(filter),
  ]);

  return {
    items: items.map((item) => {
      const populated = item.goalId as unknown as { name?: string } | null;
      const goalName = populated && typeof populated.name === 'string' ? populated.name : null;
      return toTransactionDto(item as unknown as TransactionDocument, goalName);
    }),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    hasMore: skip + items.length < total,
    summary,
  };
}

export async function getTransaction(userId: string, id: string): Promise<TransactionDto> {
  const transaction = await Transaction.findOne({ _id: id, userId }).exec();
  if (!transaction) throw AppError.notFound('Transaction');
  return toTransactionDto(transaction);
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionDto> {
  const transaction = await Transaction.create({
    userId,
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description,
    date: input.date,
    notes: input.notes ?? null,
  });

  return toTransactionDto(transaction);
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionDto> {
  const transaction = await Transaction.findOne({ _id: id, userId }).exec();
  if (!transaction) throw AppError.notFound('Transaction');

  // Contributions are written by the goal and plan services alongside a balance
  // change. Editing one here would desynchronise the two, so it is refused and
  // the user is pointed at the operation that can do it safely.
  if (transaction.goalId || transaction.planId) {
    throw AppError.forbidden(
      'This entry was created by a savings contribution. Adjust it from the goal or plan it belongs to.',
    );
  }

  const nextType = input.type ?? transaction.type;
  const nextCategory = input.category ?? transaction.category;

  // Re-validated against the *stored* record: a partial update that changes only
  // the type could otherwise leave an impossible type/category pair behind.
  if (!isCategoryValidForType(nextCategory, nextType)) {
    throw AppError.unprocessable('That category does not apply to this transaction type', {
      category: ['That category does not apply to this transaction type'],
    });
  }

  transaction.set({
    type: nextType,
    category: nextCategory,
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.date !== undefined ? { date: input.date } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  });

  await transaction.save();
  return toTransactionDto(transaction);
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  const transaction = await Transaction.findOne({ _id: id, userId }).exec();
  if (!transaction) throw AppError.notFound('Transaction');

  if (transaction.goalId) {
    // Deleting the ledger entry alone would leave the goal balance overstated.
    // Roll the contribution back in the same breath.
    await SavingsGoal.updateOne(
      { _id: transaction.goalId, userId },
      { $inc: { currentAmount: -transaction.amount } },
    ).exec();
  }

  await transaction.deleteOne();
}

/* -------------------------------------------------------------------------- */
/* Aggregation                                                                 */
/* -------------------------------------------------------------------------- */

/** Income / expense / savings totals for whatever filter is in play. */
export async function summarise(
  filter: FilterQuery<TransactionAttributes>,
): Promise<TransactionSummaryDto> {
  const pipeline: PipelineStage[] = [
    { $match: filter },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ];

  const rows = await Transaction.aggregate<{ _id: string; total: number }>(pipeline).exec();
  const totals = { income: 0, expenses: 0, savings: 0 };

  for (const row of rows) {
    if (row._id === 'income') totals.income = row.total;
    else if (row._id === 'expense') totals.expenses = row.total;
    else if (row._id === 'saving') totals.savings = row.total;
  }

  return {
    ...totals,
    net: subMinor(totals.income, totals.expenses + totals.savings),
  };
}

export async function summariseMonth(
  userId: string,
  month: string,
): Promise<TransactionSummaryDto> {
  return summarise({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startOfMonth(month), $lt: endOfMonth(month) },
  });
}

/** Spend per category for a month, as a plain `{ category: minor }` map. */
export async function spendByCategory(
  userId: string,
  month: string,
): Promise<Record<string, number>> {
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: startOfMonth(month), $lt: endOfMonth(month) },
      },
    },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]).exec();

  return Object.fromEntries(rows.map((row) => [row._id, row.total]));
}

export interface MonthlyTotals {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

/**
 * Monthly totals across a date range, in one round trip.
 *
 * Grouping by a `$dateToString` month key inside MongoDB rather than pulling
 * every transaction into Node and reducing there is the difference between a
 * constant-size response and one that grows with the user's history.
 */
export async function monthlyTotals(
  userId: string,
  from: Date,
  to: Date,
): Promise<MonthlyTotals[]> {
  const rows = await Transaction.aggregate<{
    _id: { month: string; type: string };
    total: number;
  }>([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: from, $lt: to },
      },
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]).exec();

  const byMonth = new Map<string, MonthlyTotals>();
  for (const row of rows) {
    const key = row._id.month;
    const entry = byMonth.get(key) ?? { month: key, income: 0, expenses: 0, savings: 0 };
    if (row._id.type === 'income') entry.income = row.total;
    else if (row._id.type === 'expense') entry.expenses = row.total;
    else if (row._id.type === 'saving') entry.savings = row.total;
    byMonth.set(key, entry);
  }

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Lifetime totals — used for "total balance" and "total saved". */
export async function lifetimeTotals(userId: string): Promise<TransactionSummaryDto> {
  return summarise({ userId: new mongoose.Types.ObjectId(userId) });
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

function buildFilter(userId: string, query: TransactionQuery): FilterQuery<TransactionAttributes> {
  const filter: FilterQuery<TransactionAttributes> = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;
  if (query.goalId) filter.goalId = new mongoose.Types.ObjectId(query.goalId);

  const range: { $gte?: Date; $lt?: Date } = {};
  if (query.month) {
    range.$gte = startOfMonth(query.month);
    range.$lt = endOfMonth(query.month);
  }
  if (query.from) range.$gte = query.from;
  if (query.to) range.$lt = query.to;
  // `sanitizeFilter` is enabled globally to neutralise operator injection, so
  // an operator we genuinely intend must be marked as trusted. The bounds
  // themselves are `Date` objects produced by Zod, never raw client strings.
  if (range.$gte || range.$lt) filter.date = mongoose.trusted(range);

  if (query.search) {
    // Escaped before it becomes a RegExp: an unescaped `(` is a 500, and a
    // pattern like `(a+)+$` is a denial-of-service.
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ description: pattern }, { notes: pattern }];
  }

  return filter;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
