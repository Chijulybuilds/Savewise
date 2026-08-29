import mongoose from 'mongoose';

import {
  calculateChange,
  calculateGoalProgress,
  calculateSavingsRate,
  categoryLabel,
  formatMoney,
  formatMonthKey,
  formatPercent,
  shiftMonth,
  sumMinor,
  toMonthKey,
  type CurrencyCode,
  type InsightDto,
  type InsightSeverity,
  type Minor,
  type MonthKey,
} from '@savewise/shared';

import { SavingsGoal, type SavingsGoalDocument } from '../models/SavingsGoal.js';
import { SavingsPlan, type SavingsPlanDocument } from '../models/SavingsPlan.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { getBudgetForMonth } from './budget.service.js';
import { spendByCategory, summariseMonth } from './transaction.service.js';
import type { BudgetDto, TransactionSummaryDto } from '@savewise/shared';

/**
 * The insights engine.
 *
 * A deterministic rules engine — not a model, not a prediction, and deliberately
 * not dressed up as "AI". Every sentence a user reads here is traceable to one
 * comparison over their own numbers, which means it can be explained, tested,
 * and trusted.
 *
 * Each rule is an independent pure function over a prepared context. Adding an
 * insight means writing one function and listing it; rules never read the
 * database themselves, which keeps them fast and trivially unit-testable.
 */

interface InsightContext {
  month: MonthKey;
  currency: CurrencyCode;
  current: TransactionSummaryDto;
  previous: TransactionSummaryDto;
  currentCategories: Record<string, Minor>;
  previousCategories: Record<string, Minor>;
  budget: BudgetDto | null;
  goals: SavingsGoalDocument[];
  plans: SavingsPlanDocument[];
  targetMonthlySavings: Minor;
  now: Date;
}

type InsightRule = (context: InsightContext) => InsightDto[];

const SEVERITY_WEIGHT: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  neutral: 3,
};

export async function generateInsights(
  userId: string,
  month: MonthKey = toMonthKey(),
): Promise<InsightDto[]> {
  const context = await buildContext(userId, month);

  const insights = RULES.flatMap((rule) => {
    try {
      return rule(context);
    } catch {
      // One malfunctioning rule must not take down the whole panel.
      return [];
    }
  });

  // Nothing to say is itself a state worth handling — a brand-new account gets
  // an onboarding nudge rather than an empty panel.
  if (insights.length === 0) return [gettingStarted(context)];

  return insights
    .sort((a, b) => SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity])
    .slice(0, 8);
}

async function buildContext(userId: string, month: MonthKey): Promise<InsightContext> {
  const previousMonth = shiftMonth(month, -1);

  const [user, current, previous, currentCategories, previousCategories, budget, goals, plans] =
    await Promise.all([
      User.findById(userId).select('currency preferences').lean().exec(),
      summariseMonth(userId, month),
      summariseMonth(userId, previousMonth),
      spendByCategory(userId, month),
      spendByCategory(userId, previousMonth),
      getBudgetForMonth(userId, month),
      // `sanitizeFilter` is on globally, so a query operator must be marked as
      // deliberate. This one is a literal in our own source, not user input.
      SavingsGoal.find({
        userId,
        status: mongoose.trusted({ $in: ['active', 'completed'] }),
      }).exec(),
      SavingsPlan.find({ userId, status: 'active' }).exec(),
    ]);

  if (!user) throw AppError.notFound('User');

  return {
    month,
    currency: user.currency,
    current,
    previous,
    currentCategories,
    previousCategories,
    budget,
    goals,
    plans,
    targetMonthlySavings: user.preferences.targetMonthlySavings,
    now: new Date(),
  };
}

/* -------------------------------------------------------------------------- */
/* Rules                                                                       */
/* -------------------------------------------------------------------------- */

/** How disciplined is this month's saving? */
const savingsRateRule: InsightRule = (context) => {
  if (context.current.income <= 0) return [];

  const rate = calculateSavingsRate(context.current.income, context.current.savings);
  const metric = { label: 'Savings rate', value: formatPercent(rate, 1), raw: rate };

  if (rate >= 20) {
    return [
      insight({
        id: `savings-rate-${context.month}`,
        type: 'savings_rate',
        severity: 'positive',
        title: 'Strong savings habit',
        message: `You kept ${formatPercent(rate, 1)} of what came in this month — ${formatMoney(context.current.savings, context.currency)} set aside.`,
        metric,
        recommendation: 'Consider raising a goal target while the habit is holding.',
        action: { label: 'Review goals', href: '/goals' },
        now: context.now,
      }),
    ];
  }

  if (rate >= 10) {
    return [
      insight({
        id: `savings-rate-${context.month}`,
        type: 'savings_rate',
        severity: 'neutral',
        title: 'Steady, with room to grow',
        message: `You saved ${formatPercent(rate, 1)} of your income. Getting to 20% would add ${formatMoney(Math.round(context.current.income * 0.2) - context.current.savings, context.currency)} a month.`,
        metric,
        recommendation: 'Move one discretionary category down by 5% and route it to savings.',
        action: { label: 'Adjust budget', href: '/budget' },
        now: context.now,
      }),
    ];
  }

  return [
    insight({
      id: `savings-rate-${context.month}`,
      type: 'savings_rate',
      severity: 'warning',
      title: 'Savings rate is low this month',
      message: `Only ${formatPercent(rate, 1)} of your income went to savings.`,
      metric,
      recommendation: 'Start with a small automatic amount — consistency matters more than size.',
      action: { label: 'Create a plan', href: '/plans' },
      now: context.now,
    }),
  ];
};

/** Is the user spending more than they earn? */
const cashFlowRule: InsightRule = (context) => {
  const { income, expenses } = context.current;
  if (income <= 0 || expenses <= income) return [];

  const shortfall = expenses - income;
  return [
    insight({
      id: `cash-flow-${context.month}`,
      type: 'cash_flow',
      severity: 'critical',
      title: 'Spending is ahead of income',
      message: `You have spent ${formatMoney(shortfall, context.currency)} more than you earned in ${formatMonthKey(context.month)}.`,
      metric: {
        label: 'Shortfall',
        value: formatMoney(shortfall, context.currency),
        raw: shortfall,
      },
      recommendation:
        'Review your largest category and pause non-essential spending for the rest of the month.',
      action: { label: 'See spending', href: '/analytics' },
      now: context.now,
    }),
  ];
};

/** Which budget lines have been blown, and which are on course to be? */
const budgetRule: InsightRule = (context) => {
  const budget = context.budget;
  if (!budget) return [];

  const exceeded = budget.categories.filter(
    (line) => line.health === 'exceeded' && line.budgeted > 0,
  );

  if (exceeded.length > 0) {
    const worst = exceeded.reduce((a, b) => (b.overspend > a.overspend ? b : a));
    return [
      insight({
        id: `budget-exceeded-${context.month}-${worst.category}`,
        type: 'budget_overspend',
        severity: 'warning',
        title: `${worst.label} is over budget`,
        message:
          exceeded.length === 1
            ? `You are ${formatMoney(worst.overspend, context.currency)} past your ${worst.label.toLowerCase()} limit.`
            : `${exceeded.length} categories are over budget — ${worst.label.toLowerCase()} by ${formatMoney(worst.overspend, context.currency)}.`,
        metric: {
          label: 'Over budget',
          value: formatMoney(worst.overspend, context.currency),
          raw: worst.overspend,
        },
        recommendation: `Either raise the ${worst.label.toLowerCase()} limit to something realistic, or trim it back before month end.`,
        action: { label: 'Open budget', href: '/budget' },
        now: context.now,
      }),
    ];
  }

  // Spending faster than the month is passing is worth flagging *before* a limit
  // is breached — that is the whole point of budgeting ahead of time.
  const { percentageUsed, monthElapsedPercentage: elapsed, remaining } = budget.totals;
  if (elapsed > 15 && percentageUsed > elapsed + 15) {
    return [
      insight({
        id: `budget-pace-${context.month}`,
        type: 'budget_health',
        severity: 'warning',
        title: 'Spending faster than the month is passing',
        message: `You are ${Math.round(elapsed)}% through ${formatMonthKey(context.month)} but have used ${Math.round(percentageUsed)}% of your budget.`,
        metric: { label: 'Budget used', value: formatPercent(percentageUsed), raw: percentageUsed },
        recommendation: `${formatMoney(remaining, context.currency)} left to cover the rest of the month.`,
        action: { label: 'Open budget', href: '/budget' },
        now: context.now,
      }),
    ];
  }

  if (elapsed > 60 && percentageUsed < elapsed - 10) {
    return [
      insight({
        id: `budget-pace-${context.month}`,
        type: 'budget_health',
        severity: 'positive',
        title: 'Comfortably inside budget',
        message: `${Math.round(elapsed)}% through the month and only ${Math.round(percentageUsed)}% of your budget spent.`,
        metric: {
          label: 'Remaining',
          value: formatMoney(remaining, context.currency),
          raw: remaining,
        },
        recommendation: 'A good month to move something extra into a goal.',
        action: { label: 'Contribute to a goal', href: '/goals' },
        now: context.now,
      }),
    ];
  }

  return [];
};

/** Month-over-month spending direction. */
const spendingTrendRule: InsightRule = (context) => {
  const change = calculateChange(context.previous.expenses, context.current.expenses);
  if (change === null || Math.abs(change) < 10) return [];

  const difference = Math.abs(context.current.expenses - context.previous.expenses);
  const increased = change > 0;

  return [
    insight({
      id: `spending-trend-${context.month}`,
      type: 'spending_trend',
      severity: increased ? 'neutral' : 'positive',
      title: increased ? 'Spending is up on last month' : 'Spending is down on last month',
      message: `${formatPercent(Math.abs(change), 1)} ${increased ? 'more' : 'less'} than ${formatMonthKey(shiftMonth(context.month, -1))} — a difference of ${formatMoney(difference, context.currency)}.`,
      metric: { label: 'Change', value: formatPercent(change, 1), raw: change },
      recommendation: increased
        ? 'Check which category moved before deciding whether it was worth it.'
        : 'Consider moving the difference into a goal so it does not get reabsorbed.',
      action: { label: 'See breakdown', href: '/analytics' },
      now: context.now,
    }),
  ];
};

/** A single category moving sharply is more actionable than a total. */
const categorySpikeRule: InsightRule = (context) => {
  const spikes = Object.entries(context.currentCategories)
    .map(([category, amount]) => ({
      category,
      amount,
      change: calculateChange(context.previousCategories[category] ?? 0, amount),
    }))
    .filter(
      (entry): entry is { category: string; amount: number; change: number } =>
        entry.change !== null && entry.change >= 25 && entry.amount > 0,
    )
    .sort((a, b) => b.change - a.change);

  const top = spikes[0];
  if (!top) return [];

  return [
    insight({
      id: `category-spike-${context.month}-${top.category}`,
      type: 'category_spike',
      severity: 'neutral',
      title: `${categoryLabel(top.category)} spending jumped`,
      message: `${categoryLabel(top.category)} is up ${formatPercent(top.change)} on last month, at ${formatMoney(top.amount, context.currency)}.`,
      metric: { label: 'Increase', value: formatPercent(top.change), raw: top.change },
      recommendation: 'If this was one-off, ignore it. If it is the new normal, budget for it.',
      action: { label: 'Review transactions', href: `/transactions?category=${top.category}` },
      now: context.now,
    }),
  ];
};

/** Is each goal going to land on time at the current contribution? */
const goalPaceRule: InsightRule = (context) => {
  const active = context.goals.filter((goal) => goal.status === 'active');
  const insights: InsightDto[] = [];

  for (const goal of active) {
    const progress = calculateGoalProgress(
      {
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline,
        monthlyContribution: goal.monthlyContribution,
      },
      context.now,
    );

    if (progress.pace === 'behind' && progress.monthsRemaining !== null) {
      insights.push(
        insight({
          id: `goal-behind-${goal.id as string}`,
          type: 'goal_pace',
          severity: 'warning',
          title: `${goal.name} is behind schedule`,
          message: `At ${formatMoney(goal.monthlyContribution, context.currency)} a month you will miss the deadline. ${formatMoney(progress.requiredMonthlyContribution, context.currency)} a month keeps it on track.`,
          metric: {
            label: 'Needed monthly',
            value: formatMoney(progress.requiredMonthlyContribution, context.currency),
            raw: progress.requiredMonthlyContribution,
          },
          recommendation:
            'Raise the contribution, or move the deadline to something you can actually hit.',
          action: { label: 'Adjust goal', href: '/goals' },
          now: context.now,
        }),
      );
    } else if (progress.pace === 'ahead' && (progress.monthsAheadOfDeadline ?? 0) >= 1) {
      const monthsEarly = Math.floor(progress.monthsAheadOfDeadline ?? 0);
      insights.push(
        insight({
          id: `goal-ahead-${goal.id as string}`,
          type: 'goal_pace',
          severity: 'positive',
          title: `${goal.name} is ahead of schedule`,
          message: `At your current rate you will reach it about ${monthsEarly} month${monthsEarly === 1 ? '' : 's'} early.`,
          metric: { label: 'Months early', value: `${monthsEarly}`, raw: monthsEarly },
          recommendation:
            'You could bring the deadline forward, or start the next goal alongside it.',
          action: { label: 'Open goals', href: '/goals' },
          now: context.now,
        }),
      );
    } else if (progress.pace === 'stalled' && goal.currentAmount < goal.targetAmount) {
      insights.push(
        insight({
          id: `goal-stalled-${goal.id as string}`,
          type: 'goal_pace',
          severity: 'neutral',
          title: `${goal.name} has no monthly contribution`,
          message: `${formatMoney(progress.remainingAmount, context.currency)} still to go, with nothing scheduled toward it.`,
          metric: {
            label: 'Remaining',
            value: formatMoney(progress.remainingAmount, context.currency),
            raw: progress.remainingAmount,
          },
          recommendation: 'Set a monthly amount, however small, so the goal has a finish line.',
          action: { label: 'Set a contribution', href: '/goals' },
          now: context.now,
        }),
      );
    }
  }

  // Two at most: past that, a wall of goal advice stops being advice.
  return insights.slice(0, 2);
};

/** Nearly-there goals deserve a nudge over the line. */
const goalMilestoneRule: InsightRule = (context) => {
  const nearly = context.goals
    .filter((goal) => goal.status === 'active' && goal.targetAmount > 0)
    .map((goal) => ({ goal, percent: (goal.currentAmount / goal.targetAmount) * 100 }))
    .filter((entry) => entry.percent >= 85 && entry.percent < 100)
    .sort((a, b) => b.percent - a.percent);

  const top = nearly[0];
  if (!top) return [];

  const remaining = top.goal.targetAmount - top.goal.currentAmount;
  return [
    insight({
      id: `goal-milestone-${top.goal.id as string}`,
      type: 'goal_milestone',
      severity: 'positive',
      title: `${top.goal.name} is almost funded`,
      message: `${formatPercent(top.percent)} there — ${formatMoney(remaining, context.currency)} left.`,
      metric: {
        label: 'Remaining',
        value: formatMoney(remaining, context.currency),
        raw: remaining,
      },
      recommendation: 'One more contribution would close it out.',
      action: { label: 'Contribute', href: '/goals' },
      now: context.now,
    }),
  ];
};

/** Are the active plans, taken together, affordable? */
const planRule: InsightRule = (context) => {
  if (context.plans.length === 0 || context.current.income <= 0) return [];

  const monthlyCommitment = sumMinor(
    context.plans.map((plan) =>
      plan.frequency === 'weekly'
        ? Math.round(plan.contributionAmount * (52 / 12))
        : plan.frequency === 'biweekly'
          ? Math.round(plan.contributionAmount * (26 / 12))
          : plan.contributionAmount,
    ),
  );

  const share = calculateSavingsRate(context.current.income, monthlyCommitment);
  if (share < 40) return [];

  return [
    insight({
      id: `plan-load-${context.month}`,
      type: 'plan_projection',
      severity: 'warning',
      title: 'Your plans are demanding a lot of your income',
      message: `Active plans commit ${formatMoney(monthlyCommitment, context.currency)} a month — ${formatPercent(share)} of what you earn.`,
      metric: { label: 'Share of income', value: formatPercent(share), raw: share },
      recommendation: 'Pause or stretch one plan so the schedule stays realistic.',
      action: { label: 'Review plans', href: '/plans' },
      now: context.now,
    }),
  ];
};

/** Did the user hit the savings target they set for themselves? */
const savingsTargetRule: InsightRule = (context) => {
  if (context.targetMonthlySavings <= 0) return [];
  if (context.current.savings >= context.targetMonthlySavings) {
    return [
      insight({
        id: `savings-target-${context.month}`,
        type: 'savings_rate',
        severity: 'positive',
        title: 'Monthly savings target met',
        message: `You set ${formatMoney(context.targetMonthlySavings, context.currency)} and saved ${formatMoney(context.current.savings, context.currency)}.`,
        metric: {
          label: 'Saved',
          value: formatMoney(context.current.savings, context.currency),
          raw: context.current.savings,
        },
        recommendation: null,
        action: null,
        now: context.now,
      }),
    ];
  }

  const shortfall = context.targetMonthlySavings - context.current.savings;
  return [
    insight({
      id: `savings-target-${context.month}`,
      type: 'savings_rate',
      severity: 'neutral',
      title: `${formatMoney(shortfall, context.currency)} short of your monthly target`,
      message: `You aim to save ${formatMoney(context.targetMonthlySavings, context.currency)} a month and are at ${formatMoney(context.current.savings, context.currency)}.`,
      metric: {
        label: 'Shortfall',
        value: formatMoney(shortfall, context.currency),
        raw: shortfall,
      },
      recommendation: 'Contributing to a goal counts toward this — even a partial amount.',
      action: { label: 'Contribute', href: '/goals' },
      now: context.now,
    }),
  ];
};

const RULES: InsightRule[] = [
  cashFlowRule,
  budgetRule,
  savingsRateRule,
  savingsTargetRule,
  goalPaceRule,
  goalMilestoneRule,
  spendingTrendRule,
  categorySpikeRule,
  planRule,
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function insight(input: Omit<InsightDto, 'generatedAt'> & { now: Date }): InsightDto {
  const { now, ...rest } = input;
  return { ...rest, generatedAt: now.toISOString() };
}

function gettingStarted(context: InsightContext): InsightDto {
  return insight({
    id: 'getting-started',
    type: 'getting_started',
    severity: 'neutral',
    title: 'Add a few transactions to unlock insights',
    message:
      'Savewise reads your own numbers — income, spending and contributions — and tells you what changed. Nothing to read yet.',
    metric: null,
    recommendation: 'Record this month’s income and your regular expenses to get started.',
    action: { label: 'Add a transaction', href: '/transactions' },
    now: context.now,
  });
}
