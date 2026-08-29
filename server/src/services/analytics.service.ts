import mongoose from 'mongoose';

import {
  BUDGET_BUCKETS,
  calculateChange,
  calculatePercentage,
  calculateSavingsRate,
  categoryBucket,
  categoryLabel,
  endOfMonth,
  formatMonthKey,
  monthLabel,
  projectSavingsGrowth,
  recentMonths,
  shiftMonth,
  startOfMonth,
  subMinor,
  sumMinor,
  toMonthKey,
  type CategoryAnalyticsDto,
  type CategoryBreakdownDto,
  type MonthKey,
  type MonthlyPointDto,
  type OverviewDto,
  type SavingsAnalyticsDto,
  type SpendingAnalyticsDto,
} from '@savewise/shared';

import { SavingsGoal } from '../models/SavingsGoal.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { getBudgetForMonth } from './budget.service.js';
import { buildOverview } from './goal.service.js';
import { generateInsights } from './insight.service.js';
import { toTransactionDto } from './mappers.js';
import { monthlyTotals, spendByCategory, summariseMonth } from './transaction.service.js';

/**
 * Analytics.
 *
 * Every figure here comes from a MongoDB aggregation scoped to one user over a
 * bounded month range — the trend endpoints never load individual transactions
 * into Node. Response size is a function of the window (12 points), not of how
 * long the user has been saving.
 */

const TREND_MONTHS = 12;

/** The dashboard payload — one request, everything above the fold. */
export async function getOverview(
  userId: string,
  month: MonthKey = toMonthKey(),
): Promise<OverviewDto> {
  const user = await User.findById(userId).exec();
  if (!user) throw AppError.notFound('User');

  const previousMonth = shiftMonth(month, -1);
  const window = recentMonths(TREND_MONTHS, month);
  const firstMonth = window[0] ?? month;

  const [current, previous, totals, trendRows, budget, goals, categories, recent] =
    await Promise.all([
      summariseMonth(userId, month),
      summariseMonth(userId, previousMonth),
      lifetime(userId),
      monthlyTotals(userId, startOfMonth(firstMonth), endOfMonth(month)),
      getBudgetForMonth(userId, month),
      SavingsGoal.find({ userId }).exec(),
      categoryBreakdown(userId, month, previousMonth),
      Transaction.find({ userId })
        .sort({ date: -1, _id: -1 })
        .limit(6)
        .populate<{ goalId: { name: string } | null }>('goalId', 'name')
        .exec(),
    ]);

  const insights = await generateInsights(userId, month);

  return {
    month,
    monthLabel: formatMonthKey(month),
    currency: user.currency,
    // "Balance" is what the ledger says is left after everything that left the
    // account — never a custodial balance. Savewise holds no funds.
    totalBalance: subMinor(totals.income, totals.expenses),
    totalSaved: totals.savings,
    monthlyIncome: current.income,
    monthlyExpenses: current.expenses,
    monthlySavings: current.savings,
    savingsRate: calculateSavingsRate(current.income, current.savings),
    net: current.net,
    incomeChange: calculateChange(previous.income, current.income),
    expenseChange: calculateChange(previous.expenses, current.expenses),
    savingsChange: calculateChange(previous.savings, current.savings),
    budget: budget
      ? {
          exists: true,
          budgeted: budget.totals.budgeted,
          spent: budget.totals.spent,
          remaining: budget.totals.remaining,
          percentageUsed: budget.totals.percentageUsed,
          health: budget.totals.health,
        }
      : {
          exists: false,
          budgeted: 0,
          spent: current.expenses,
          remaining: 0,
          percentageUsed: 0,
          health: 'healthy',
        },
    goals: buildOverview(goals),
    trend: toTrend(window, trendRows),
    categories,
    recentTransactions: recent.map((item) => {
      const populated = item.goalId as unknown as { name?: string } | null;
      return toTransactionDto(
        item as never,
        populated && typeof populated.name === 'string' ? populated.name : null,
      );
    }),
    topInsight: insights[0] ?? null,
  };
}

export async function getSpendingAnalytics(
  userId: string,
  months = TREND_MONTHS,
): Promise<SpendingAnalyticsDto> {
  const window = recentMonths(months);
  const firstMonth = window[0] ?? toMonthKey();
  const rows = await monthlyTotals(userId, startOfMonth(firstMonth), endOfMonth(toMonthKey()));
  const points = toTrend(window, rows);

  const withActivity = points.filter((point) => point.expenses > 0 || point.income > 0);
  const divisor = Math.max(1, withActivity.length);

  return {
    months: points,
    averageMonthlyExpenses: Math.round(sumMinor(points.map((p) => p.expenses)) / divisor),
    averageMonthlyIncome: Math.round(sumMinor(points.map((p) => p.income)) / divisor),
    highestSpendMonth:
      points.reduce<MonthlyPointDto | null>(
        (best, point) => (!best || point.expenses > best.expenses ? point : best),
        null,
      ) ?? null,
  };
}

export async function getSavingsAnalytics(
  userId: string,
  months = TREND_MONTHS,
): Promise<SavingsAnalyticsDto> {
  const window = recentMonths(months);
  const firstMonth = window[0] ?? toMonthKey();

  const [rows, priorSavings, goals] = await Promise.all([
    monthlyTotals(userId, startOfMonth(firstMonth), endOfMonth(toMonthKey())),
    // Savings banked before the window still count toward the running balance,
    // otherwise the cumulative line would restart at zero every year.
    Transaction.aggregate<{ total: number }>([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'saving',
          date: { $lt: startOfMonth(firstMonth) },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).exec(),
    SavingsGoal.find({ userId, status: 'active' }).select('monthlyContribution').lean().exec(),
  ]);

  const points = toTrend(window, rows);

  let running = priorSavings[0]?.total ?? 0;
  const cumulative = points.map((point) => {
    running += point.savings;
    return { month: point.month, label: point.label, balance: running };
  });

  const monthsWithIncome = points.filter((point) => point.income > 0);
  const averageSavingsRate =
    monthsWithIncome.length > 0
      ? Math.round(
          (monthsWithIncome.reduce((sum, point) => sum + point.savingsRate, 0) /
            monthsWithIncome.length) *
            100,
        ) / 100
      : 0;

  // Project forward from what the user has actually committed to their goals,
  // not from an assumed rate of return. No interest is modelled.
  const committedMonthly = sumMinor(goals.map((goal) => goal.monthlyContribution ?? 0));
  const projection = projectSavingsGrowth(running, committedMonthly, 12).map((point) => ({
    month: point.month,
    label: point.month === 0 ? 'Now' : `+${point.month}m`,
    balance: point.balance,
  }));

  return {
    months: points,
    cumulative,
    averageSavingsRate,
    bestMonth:
      points.reduce<MonthlyPointDto | null>(
        (best, point) => (!best || point.savings > best.savings ? point : best),
        null,
      ) ?? null,
    projection,
  };
}

export async function getCategoryAnalytics(
  userId: string,
  month: MonthKey = toMonthKey(),
): Promise<CategoryAnalyticsDto> {
  const categories = await categoryBreakdown(userId, month, shiftMonth(month, -1));
  const total = sumMinor(categories.map((category) => category.amount));

  return {
    month,
    categories,
    total,
    buckets: BUDGET_BUCKETS.map((bucket) => {
      const amount = sumMinor(
        categories
          .filter((category) => category.bucket === bucket)
          .map((category) => category.amount),
      );
      return { bucket, amount, percentage: calculatePercentage(amount, total) };
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                   */
/* -------------------------------------------------------------------------- */

async function categoryBreakdown(
  userId: string,
  month: MonthKey,
  comparisonMonth: MonthKey,
): Promise<CategoryBreakdownDto[]> {
  const [current, previous] = await Promise.all([
    spendByCategory(userId, month),
    spendByCategory(userId, comparisonMonth),
  ]);

  const total = sumMinor(Object.values(current));

  return Object.entries(current)
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({
      category,
      label: categoryLabel(category),
      bucket: categoryBucket(category),
      amount,
      percentage: calculatePercentage(amount, total),
      changePercent: calculateChange(previous[category] ?? 0, amount),
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Pad an aggregation result out to a full window so charts have no gaps. */
function toTrend(
  window: MonthKey[],
  rows: { month: string; income: number; expenses: number; savings: number }[],
): MonthlyPointDto[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));

  return window.map((month) => {
    const row = byMonth.get(month) ?? { income: 0, expenses: 0, savings: 0 };
    return {
      month,
      label: monthLabel(month),
      income: row.income,
      expenses: row.expenses,
      savings: row.savings,
      net: subMinor(row.income, row.expenses + row.savings),
      savingsRate: calculateSavingsRate(row.income, row.savings),
    };
  });
}

async function lifetime(userId: string) {
  const rows = await Transaction.aggregate<{ _id: string; total: number }>([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]).exec();

  const totals = { income: 0, expenses: 0, savings: 0 };
  for (const row of rows) {
    if (row._id === 'income') totals.income = row.total;
    else if (row._id === 'expense') totals.expenses = row.total;
    else if (row._id === 'saving') totals.savings = row.total;
  }
  return totals;
}
