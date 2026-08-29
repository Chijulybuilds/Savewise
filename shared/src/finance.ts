/**
 * The financial calculation engine.
 *
 * Pure functions over integer minor units. Nothing here reads the database, the
 * clock (a `now` is always injected) or the network, which is what makes the
 * behaviour worth testing — and makes the same numbers appear identically on the
 * server, in the client and in the seed script.
 */

import {
  BUDGET_WATCH_THRESHOLD,
  CONTRIBUTIONS_PER_MONTH,
  type BudgetHealth,
  type PlanFrequency,
} from './constants.js';
import { addMinor, divideCeil, maxMinor, subMinor, sumMinor, type Minor } from './money.js';
import { addDays, addMonths, daysBetween, monthsBetween } from './period.js';

/* -------------------------------------------------------------------------- */
/* Ratios                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Share of income kept, as a percentage. Returns `0` for a zero or negative
 * income rather than `Infinity` or `NaN`, so callers never have to guard.
 */
export function calculateSavingsRate(income: Minor, saved: Minor): number {
  if (income <= 0) return 0;
  return round2((saved / income) * 100);
}

/** Percentage of a target reached. Uncapped — going over target is meaningful. */
export function calculatePercentage(part: Minor, whole: Minor): number {
  if (whole <= 0) return 0;
  return round2((part / whole) * 100);
}

/** Percentage change between two periods. `null` when the base period is zero. */
export function calculateChange(previous: Minor, current: Minor): number | null {
  if (previous === 0) return null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/* -------------------------------------------------------------------------- */
/* Cash flow                                                                   */
/* -------------------------------------------------------------------------- */

export interface CashFlowInput {
  income: Minor;
  expenses: Minor;
  savings: Minor;
}

export interface CashFlow {
  income: Minor;
  expenses: Minor;
  savings: Minor;
  /** Income minus everything that left the account. Negative means overspending. */
  net: Minor;
  /** Income not yet allocated to an expense or a savings contribution. */
  unallocated: Minor;
  savingsRate: number;
  expenseRatio: number;
}

export function calculateMonthlyCashFlow({ income, expenses, savings }: CashFlowInput): CashFlow {
  const net = subMinor(income, addMinor(expenses, savings));
  return {
    income,
    expenses,
    savings,
    net,
    unallocated: maxMinor(net, 0),
    savingsRate: calculateSavingsRate(income, savings),
    expenseRatio: calculateSavingsRate(income, expenses),
  };
}

/* -------------------------------------------------------------------------- */
/* Budgets                                                                     */
/* -------------------------------------------------------------------------- */

export interface BudgetUsage {
  budgeted: Minor;
  spent: Minor;
  /** Never negative — an overspend is reported through `overspend`, not a negative remainder. */
  remaining: Minor;
  overspend: Minor;
  percentageUsed: number;
  health: BudgetHealth;
}

export function calculateBudgetUsage(budgeted: Minor, spent: Minor): BudgetUsage {
  const percentageUsed = calculatePercentage(spent, budgeted);
  const difference = subMinor(budgeted, spent);

  return {
    budgeted,
    spent,
    remaining: maxMinor(difference, 0),
    overspend: maxMinor(-difference, 0),
    percentageUsed,
    health: budgetHealth(budgeted, spent),
  };
}

export function budgetHealth(budgeted: Minor, spent: Minor): BudgetHealth {
  if (budgeted <= 0) return spent > 0 ? 'exceeded' : 'healthy';
  if (spent > budgeted) return 'exceeded';
  if (calculatePercentage(spent, budgeted) >= BUDGET_WATCH_THRESHOLD) return 'watch';
  return 'healthy';
}

/**
 * How far through the month we are, 0–100. Compared against `percentageUsed` it
 * answers the question a budget bar can't on its own: *is this pace sustainable?*
 */
export function monthElapsedPercentage(start: Date, end: Date, now: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, round2((elapsed / total) * 100)));
}

/** Straight-line projection of month-end spend from the run rate so far. */
export function projectMonthEndSpend(spent: Minor, elapsedPercentage: number): Minor {
  if (elapsedPercentage <= 0) return spent;
  return Math.round(spent / (elapsedPercentage / 100));
}

/* -------------------------------------------------------------------------- */
/* Goals                                                                       */
/* -------------------------------------------------------------------------- */

export type GoalPace = 'completed' | 'ahead' | 'on_track' | 'behind' | 'stalled' | 'no_deadline';

export interface GoalProgressInput {
  targetAmount: Minor;
  currentAmount: Minor;
  /** Optional — a goal without a deadline is still a goal. */
  deadline?: Date | string | null;
  /** What the user intends to put in each month. Drives the projection. */
  monthlyContribution?: Minor;
  createdAt?: Date | string | null;
}

export interface GoalProgress {
  targetAmount: Minor;
  currentAmount: Minor;
  remainingAmount: Minor;
  percentComplete: number;
  isComplete: boolean;
  daysRemaining: number | null;
  monthsRemaining: number | null;
  /** What they must save monthly to land exactly on the deadline. */
  requiredMonthlyContribution: Minor;
  /** When the current `monthlyContribution` would finish the goal. */
  projectedCompletionDate: Date | null;
  /** Months of deadline slack: positive is early, negative is late. */
  monthsAheadOfDeadline: number | null;
  pace: GoalPace;
}

export function calculateRemainingAmount(target: Minor, current: Minor): Minor {
  return maxMinor(subMinor(target, current), 0);
}

/**
 * The contribution needed each month to close `remaining` before the deadline.
 * Rounds *up* — under-contributing misses the date, and a user would rather be
 * told ₦41,667 than ₦41,666.
 */
export function calculateRequiredMonthlyContribution(
  remaining: Minor,
  monthsRemaining: number,
): Minor {
  if (remaining <= 0) return 0;
  if (monthsRemaining <= 0) return remaining;
  return divideCeil(remaining, Math.max(monthsRemaining, 1 / 30.4375));
}

/**
 * When a steady monthly contribution finishes the goal.
 * `null` when nothing is being contributed — an honest "never at this rate".
 */
export function calculateProjectedCompletion(
  remaining: Minor,
  monthlyContribution: Minor,
  from: Date,
): Date | null {
  if (remaining <= 0) return from;
  if (monthlyContribution <= 0) return null;
  const months = Math.ceil(remaining / monthlyContribution);
  if (months > 1200) return null; // beyond a century — treat as unreachable
  return addMonths(from, months);
}

export function calculateGoalProgress(
  goal: GoalProgressInput,
  now: Date = new Date(),
): GoalProgress {
  const targetAmount = goal.targetAmount;
  const currentAmount = goal.currentAmount;
  const remainingAmount = calculateRemainingAmount(targetAmount, currentAmount);
  const percentComplete = Math.min(100, calculatePercentage(currentAmount, targetAmount));
  const isComplete = remainingAmount === 0 && targetAmount > 0;

  const deadline = toDate(goal.deadline);
  const daysRemaining = deadline ? daysBetween(now, deadline) : null;
  const monthsRemaining = deadline ? round2(monthsBetween(now, deadline)) : null;

  const requiredMonthlyContribution = isComplete
    ? 0
    : calculateRequiredMonthlyContribution(remainingAmount, monthsRemaining ?? 0);

  const monthlyContribution = goal.monthlyContribution ?? 0;
  const projectedCompletionDate = isComplete
    ? now
    : calculateProjectedCompletion(remainingAmount, monthlyContribution, now);

  let monthsAheadOfDeadline: number | null = null;
  if (deadline && projectedCompletionDate) {
    monthsAheadOfDeadline = round2(
      (deadline.getTime() - projectedCompletionDate.getTime()) / (30.4375 * 86_400_000),
    );
  }

  return {
    targetAmount,
    currentAmount,
    remainingAmount,
    percentComplete,
    isComplete,
    daysRemaining,
    monthsRemaining,
    requiredMonthlyContribution,
    projectedCompletionDate,
    monthsAheadOfDeadline,
    pace: derivePace({ isComplete, deadline, monthlyContribution, monthsAheadOfDeadline }),
  };
}

function derivePace(input: {
  isComplete: boolean;
  deadline: Date | null;
  monthlyContribution: Minor;
  monthsAheadOfDeadline: number | null;
}): GoalPace {
  if (input.isComplete) return 'completed';
  if (input.monthlyContribution <= 0) return 'stalled';
  if (!input.deadline || input.monthsAheadOfDeadline === null) return 'no_deadline';
  if (input.monthsAheadOfDeadline >= 1) return 'ahead';
  if (input.monthsAheadOfDeadline >= -0.25) return 'on_track';
  return 'behind';
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

/* -------------------------------------------------------------------------- */
/* Savings plans                                                               */
/* -------------------------------------------------------------------------- */

export interface PlanProjectionInput {
  targetAmount: Minor;
  contributionAmount: Minor;
  frequency: PlanFrequency;
  contributedAmount: Minor;
  startDate: Date | string;
}

export interface PlanProjection {
  contributedAmount: Minor;
  remainingAmount: Minor;
  percentComplete: number;
  contributionsRemaining: number;
  totalContributions: number;
  /** Contribution normalised to a monthly figure, for comparing plans. */
  monthlyEquivalent: Minor;
  projectedCompletionDate: Date | null;
  nextContributionDate: Date | null;
}

const DAYS_PER_CONTRIBUTION: Record<PlanFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30.4375,
};

export function calculatePlanProjection(
  plan: PlanProjectionInput,
  now: Date = new Date(),
): PlanProjection {
  const remainingAmount = calculateRemainingAmount(plan.targetAmount, plan.contributedAmount);
  const perMonth = CONTRIBUTIONS_PER_MONTH[plan.frequency];
  const monthlyEquivalent = Math.round(plan.contributionAmount * perMonth);

  const contributionsRemaining =
    plan.contributionAmount > 0 ? Math.ceil(remainingAmount / plan.contributionAmount) : 0;
  const totalContributions =
    plan.contributionAmount > 0 ? Math.ceil(plan.targetAmount / plan.contributionAmount) : 0;

  const start = toDate(plan.startDate) ?? now;
  const anchor = start > now ? start : now;

  const projectedCompletionDate =
    remainingAmount === 0
      ? now
      : plan.contributionAmount > 0 && contributionsRemaining <= 5000
        ? addDays(anchor, contributionsRemaining * DAYS_PER_CONTRIBUTION[plan.frequency])
        : null;

  return {
    contributedAmount: plan.contributedAmount,
    remainingAmount,
    percentComplete: Math.min(100, calculatePercentage(plan.contributedAmount, plan.targetAmount)),
    contributionsRemaining,
    totalContributions,
    monthlyEquivalent,
    projectedCompletionDate,
    nextContributionDate: remainingAmount === 0 ? null : nextOccurrence(start, plan.frequency, now),
  };
}

/** The next scheduled contribution date at or after `now`, from a start anchor. */
export function nextOccurrence(start: Date, frequency: PlanFrequency, now: Date): Date {
  if (start > now) return start;
  if (frequency === 'monthly') {
    let next = start;
    let guard = 0;
    while (next <= now && guard < 2400) {
      next = addMonths(next, 1);
      guard += 1;
    }
    return next;
  }
  const step = DAYS_PER_CONTRIBUTION[frequency];
  const elapsed = Math.max(0, daysBetween(start, now));
  return addDays(start, (Math.floor(elapsed / step) + 1) * step);
}

/* -------------------------------------------------------------------------- */
/* Projections                                                                 */
/* -------------------------------------------------------------------------- */

export interface GrowthPoint {
  month: number;
  balance: Minor;
  contributed: Minor;
}

/**
 * "What happens if I keep this up?" — a straight-line projection of total
 * savings. No interest is modelled: Savewise tracks money the user holds, it
 * does not promise a return.
 */
export function projectSavingsGrowth(
  startingBalance: Minor,
  monthlyContribution: Minor,
  months: number,
): GrowthPoint[] {
  const horizon = Math.max(0, Math.min(Math.trunc(months), 120));
  const points: GrowthPoint[] = [];
  for (let month = 0; month <= horizon; month += 1) {
    const contributed = monthlyContribution * month;
    points.push({
      month,
      contributed,
      balance: addMinor(startingBalance, contributed),
    });
  }
  return points;
}

/* -------------------------------------------------------------------------- */
/* Suggested starting plan                                                     */
/* -------------------------------------------------------------------------- */

export interface StartingPlan {
  income: Minor;
  essentials: Minor;
  savings: Minor;
  discretionary: Minor;
  savingsRate: number;
}

/**
 * Turn a stated income and savings ambition into a balanced starting split.
 *
 * Presented in the product as a *suggested starting plan*, never as advice. The
 * user's own savings target wins; essentials and discretionary spending then
 * share what is left, weighted toward essentials.
 */
export function buildStartingPlan(income: Minor, desiredMonthlySavings?: Minor): StartingPlan {
  if (income <= 0) {
    return { income: 0, essentials: 0, savings: 0, discretionary: 0, savingsRate: 0 };
  }

  const defaultSavings = Math.round(income * 0.2);
  const requested =
    desiredMonthlySavings && desiredMonthlySavings > 0 ? desiredMonthlySavings : defaultSavings;

  // Never let the suggestion leave less than half of income for living costs.
  const savings = Math.min(requested, Math.round(income * 0.5));
  const leftover = subMinor(income, savings);
  const essentials = Math.round(leftover * 0.75);
  const discretionary = subMinor(leftover, essentials);

  return {
    income,
    essentials,
    savings,
    discretionary,
    savingsRate: calculateSavingsRate(income, savings),
  };
}

/* -------------------------------------------------------------------------- */
/* Aggregation helpers                                                         */
/* -------------------------------------------------------------------------- */

export interface CategoryTotal {
  category: string;
  amount: Minor;
  percentage: number;
}

/** Turn raw category sums into a share-of-total breakdown, largest first. */
export function toCategoryBreakdown(totals: Record<string, Minor>): CategoryTotal[] {
  const entries = Object.entries(totals).filter(([, amount]) => amount !== 0);
  const total = sumMinor(entries.map(([, amount]) => amount));

  return entries
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: calculatePercentage(amount, total),
    }))
    .sort((a, b) => b.amount - a.amount);
}
