import {
  BUDGET_BUCKETS,
  budgetHealth,
  calculateBudgetUsage,
  calculatePercentage,
  categoryBucket,
  categoryLabel,
  endOfMonth,
  formatMonthKey,
  formatMoney,
  monthElapsedPercentage,
  projectMonthEndSpend,
  startOfMonth,
  sumMinor,
  toMonthKey,
  type BudgetCategoryDto,
  type BudgetDto,
  type BudgetQuery,
  type CreateBudgetInput,
  type MonthKey,
  type UpdateBudgetInput,
} from '@savewise/shared';

import { Budget, type BudgetDocument } from '../models/Budget.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { notify } from './notification.service.js';
import { spendByCategory, summariseMonth } from './transaction.service.js';

/**
 * Budgets.
 *
 * A budget document stores *intent* only: planned income, planned savings and a
 * limit per category. Actual spend is never written here — it is aggregated
 * from the transaction ledger every time a budget is read.
 *
 * That costs one extra aggregation per request and buys correctness: there is
 * no denormalised `spent` counter to drift when a transaction is edited,
 * back-dated, deleted or recategorised. If the numbers ever look wrong, there
 * is exactly one place to look.
 */

export async function listBudgets(userId: string, query: BudgetQuery): Promise<BudgetDto[]> {
  const budgets = await Budget.find({ userId }).sort({ month: -1 }).limit(query.limit).exec();

  return Promise.all(budgets.map((budget) => decorate(userId, budget)));
}

/**
 * Fetch one month's budget, or `null` when none has been created — the client
 * renders a "start a budget" empty state rather than treating it as an error.
 */
export async function getBudgetForMonth(
  userId: string,
  month: MonthKey,
): Promise<BudgetDto | null> {
  const budget = await Budget.findOne({ userId, month }).exec();
  return budget ? decorate(userId, budget) : null;
}

export async function getBudget(userId: string, id: string): Promise<BudgetDto> {
  const budget = await Budget.findOne({ _id: id, userId }).exec();
  if (!budget) throw AppError.notFound('Budget');
  return decorate(userId, budget);
}

export async function createBudget(userId: string, input: CreateBudgetInput): Promise<BudgetDto> {
  try {
    const budget = await Budget.create({
      userId,
      month: input.month,
      plannedIncome: input.plannedIncome,
      plannedSavings: input.plannedSavings,
      categories: input.categories,
      notes: input.notes ?? null,
    });
    return await decorate(userId, budget);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    ) {
      throw AppError.conflict(`A budget already exists for ${formatMonthKey(input.month)}`, {
        month: ['You already have a budget for that month'],
      });
    }
    throw error;
  }
}

export async function updateBudget(
  userId: string,
  id: string,
  input: UpdateBudgetInput,
): Promise<BudgetDto> {
  const budget = await Budget.findOne({ _id: id, userId }).exec();
  if (!budget) throw AppError.notFound('Budget');

  if (input.plannedIncome !== undefined) budget.plannedIncome = input.plannedIncome;
  if (input.plannedSavings !== undefined) budget.plannedSavings = input.plannedSavings;
  if (input.categories !== undefined) budget.categories = input.categories;
  if (input.notes !== undefined) budget.notes = input.notes;

  if (budget.plannedSavings > budget.plannedIncome) {
    throw AppError.unprocessable('Planned savings cannot exceed planned income', {
      plannedSavings: ['Planned savings cannot exceed planned income'],
    });
  }

  await budget.save();
  return decorate(userId, budget);
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  const result = await Budget.deleteOne({ _id: id, userId }).exec();
  if (result.deletedCount === 0) throw AppError.notFound('Budget');
}

/**
 * Compare this month's spend against its limits and record a notification for
 * any category that has been exceeded. Called after a transaction is written.
 * Deduplicated per category per month, so a user who overspends on food is told
 * once, not on every subsequent purchase.
 */
export async function checkBudgetAlerts(
  userId: string,
  month: MonthKey = toMonthKey(),
): Promise<void> {
  const [budget, user] = await Promise.all([
    Budget.findOne({ userId, month }).exec(),
    User.findById(userId).select('currency preferences').lean().exec(),
  ]);

  if (!budget || !user?.preferences.notifyOnBudgetExceeded) return;

  const spent = await spendByCategory(userId, month);
  const threshold = user.preferences.budgetAlertThreshold;

  for (const line of budget.categories) {
    if (line.budgeted <= 0) continue;
    const used = calculatePercentage(spent[line.category] ?? 0, line.budgeted);

    if (used > 100) {
      await notify({
        userId,
        type: 'budget_exceeded',
        title: `${categoryLabel(line.category)} budget exceeded`,
        body: `You have spent ${formatMoney(spent[line.category] ?? 0, user.currency)} of a ${formatMoney(line.budgeted, user.currency)} limit.`,
        href: '/budget',
        dedupeKey: `budget:${month}:${line.category}:exceeded`,
      });
    } else if (used >= threshold) {
      await notify({
        userId,
        type: 'budget_warning',
        title: `${categoryLabel(line.category)} is at ${Math.round(used)}%`,
        body: `${formatMoney(line.budgeted - (spent[line.category] ?? 0), user.currency)} left for the rest of ${formatMonthKey(month, 'long')}.`,
        href: '/budget',
        dedupeKey: `budget:${month}:${line.category}:warning`,
      });
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Decoration                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Join a stored budget with live spend from the ledger and derive every figure
 * the UI needs: per-category usage and health, month totals, bucket splits, and
 * a run-rate projection of where the month is heading.
 */
async function decorate(
  userId: string,
  budget: BudgetDocument,
  now = new Date(),
): Promise<BudgetDto> {
  const [spent, summary] = await Promise.all([
    spendByCategory(userId, budget.month),
    summariseMonth(userId, budget.month),
  ]);

  const categories: BudgetCategoryDto[] = budget.categories.map((line) => {
    const usage = calculateBudgetUsage(line.budgeted, spent[line.category] ?? 0);
    return {
      category: line.category,
      label: categoryLabel(line.category),
      bucket: categoryBucket(line.category),
      budgeted: usage.budgeted,
      spent: usage.spent,
      remaining: usage.remaining,
      overspend: usage.overspend,
      percentageUsed: usage.percentageUsed,
      health: usage.health,
    };
  });

  // Spend in categories the user never budgeted still counts against the month.
  const budgetedKeys = new Set(budget.categories.map((line) => line.category));
  for (const [category, amount] of Object.entries(spent)) {
    if (budgetedKeys.has(category as never) || amount === 0) continue;
    categories.push({
      category,
      label: categoryLabel(category),
      bucket: categoryBucket(category),
      budgeted: 0,
      spent: amount,
      remaining: 0,
      overspend: amount,
      percentageUsed: 100,
      health: 'exceeded',
    });
  }

  categories.sort((a, b) => b.budgeted - a.budgeted || b.spent - a.spent);

  const totalBudgeted = sumMinor(budget.categories.map((line) => line.budgeted));
  const totalSpent = summary.expenses;
  const totals = calculateBudgetUsage(totalBudgeted, totalSpent);

  const elapsed = monthElapsedPercentage(startOfMonth(budget.month), endOfMonth(budget.month), now);

  return {
    id: budget.id as string,
    month: budget.month,
    monthLabel: formatMonthKey(budget.month),
    plannedIncome: budget.plannedIncome,
    plannedSavings: budget.plannedSavings,
    categories,
    notes: budget.notes,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
    totals: {
      budgeted: totals.budgeted,
      spent: totals.spent,
      remaining: totals.remaining,
      overspend: totals.overspend,
      percentageUsed: totals.percentageUsed,
      health: budgetHealth(totalBudgeted, totalSpent),
      actualIncome: summary.income,
      actualSavings: summary.savings,
      unallocated: Math.max(0, budget.plannedIncome - totalBudgeted - budget.plannedSavings),
      monthElapsedPercentage: elapsed,
      projectedMonthEndSpend: projectMonthEndSpend(totalSpent, elapsed),
    },
    buckets: BUDGET_BUCKETS.map((bucket) => {
      const lines = categories.filter((line) => line.bucket === bucket);
      const budgeted =
        bucket === 'savings'
          ? budget.plannedSavings + sumMinor(lines.map((line) => line.budgeted))
          : sumMinor(lines.map((line) => line.budgeted));
      const bucketSpent =
        bucket === 'savings'
          ? summary.savings + sumMinor(lines.map((line) => line.spent))
          : sumMinor(lines.map((line) => line.spent));

      return {
        bucket,
        budgeted,
        spent: bucketSpent,
        percentageOfIncome: calculatePercentage(budgeted, budget.plannedIncome),
      };
    }),
  };
}
