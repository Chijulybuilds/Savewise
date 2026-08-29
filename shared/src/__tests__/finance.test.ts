import { describe, expect, it } from 'vitest';

import {
  budgetHealth,
  buildStartingPlan,
  calculateBudgetUsage,
  calculateChange,
  calculateGoalProgress,
  calculateMonthlyCashFlow,
  calculatePlanProjection,
  calculateRemainingAmount,
  calculateRequiredMonthlyContribution,
  calculateSavingsRate,
  monthElapsedPercentage,
  nextOccurrence,
  projectMonthEndSpend,
  projectSavingsGrowth,
  toCategoryBreakdown,
} from '../finance.js';
import { toMinor } from '../money.js';

/**
 * The calculation engine.
 *
 * Every function takes an explicit `now`, which is what makes date-dependent
 * behaviour testable at all: these assertions would otherwise pass in August
 * and fail in September.
 */

const NOW = new Date('2026-08-15T00:00:00.000Z');

describe('calculateSavingsRate', () => {
  it('reports the share of income kept', () => {
    expect(calculateSavingsRate(toMinor(500_000), toMinor(100_000))).toBe(20);
    expect(calculateSavingsRate(toMinor(520_000), toMinor(118_202))).toBeCloseTo(22.73, 1);
  });

  it('returns zero for a zero or negative income instead of NaN', () => {
    expect(calculateSavingsRate(0, toMinor(50_000))).toBe(0);
    expect(calculateSavingsRate(-100, 50)).toBe(0);
  });
});

describe('calculateChange', () => {
  it('reports percentage movement between periods', () => {
    expect(calculateChange(toMinor(100), toMinor(120))).toBe(20);
    expect(calculateChange(toMinor(100), toMinor(80))).toBe(-20);
  });

  it('returns null when there is no baseline to compare against', () => {
    // Growth from zero is not "infinite percent" — it is not a percentage.
    expect(calculateChange(0, toMinor(500))).toBeNull();
  });
});

describe('calculateMonthlyCashFlow', () => {
  it('separates savings from spending', () => {
    const flow = calculateMonthlyCashFlow({
      income: toMinor(500_000),
      expenses: toMinor(300_000),
      savings: toMinor(100_000),
    });

    expect(flow.net).toBe(toMinor(100_000));
    expect(flow.unallocated).toBe(toMinor(100_000));
    expect(flow.savingsRate).toBe(20);
  });

  it('reports a negative net when spending outruns income', () => {
    const flow = calculateMonthlyCashFlow({
      income: toMinor(300_000),
      expenses: toMinor(400_000),
      savings: 0,
    });

    expect(flow.net).toBe(toMinor(-100_000));
    // Unallocated is floored at zero — you cannot have negative money left over.
    expect(flow.unallocated).toBe(0);
  });
});

describe('calculateBudgetUsage', () => {
  it('reports remaining and overspend separately, never a negative remainder', () => {
    const inside = calculateBudgetUsage(toMinor(100_000), toMinor(60_000));
    expect(inside.remaining).toBe(toMinor(40_000));
    expect(inside.overspend).toBe(0);
    expect(inside.percentageUsed).toBe(60);
    expect(inside.health).toBe('healthy');

    const over = calculateBudgetUsage(toMinor(100_000), toMinor(130_000));
    expect(over.remaining).toBe(0);
    expect(over.overspend).toBe(toMinor(30_000));
    expect(over.health).toBe('exceeded');
  });

  it('flags a category approaching its limit before it is breached', () => {
    expect(budgetHealth(toMinor(100_000), toMinor(85_000))).toBe('watch');
    expect(budgetHealth(toMinor(100_000), toMinor(79_000))).toBe('healthy');
  });

  it('treats spending against a zero budget as exceeded', () => {
    expect(budgetHealth(0, toMinor(5_000))).toBe('exceeded');
    expect(budgetHealth(0, 0)).toBe('healthy');
  });
});

describe('month pace', () => {
  it('measures how far through a month we are', () => {
    const start = new Date('2026-08-01T00:00:00.000Z');
    const end = new Date('2026-09-01T00:00:00.000Z');

    expect(monthElapsedPercentage(start, end, start)).toBe(0);
    expect(monthElapsedPercentage(start, end, new Date('2026-08-16T12:00:00.000Z'))).toBeCloseTo(
      50,
      0,
    );
    expect(monthElapsedPercentage(start, end, end)).toBe(100);
  });

  it('projects month-end spend from the run rate', () => {
    // Half the month gone, ₦150,000 spent, so ₦300,000 by month end.
    expect(projectMonthEndSpend(toMinor(150_000), 50)).toBe(toMinor(300_000));
  });
});

describe('calculateGoalProgress', () => {
  const base = {
    targetAmount: toMinor(1_200_000),
    currentAmount: toMinor(300_000),
    monthlyContribution: toMinor(100_000),
  };

  it('derives the remainder and the percentage', () => {
    const progress = calculateGoalProgress(base, NOW);
    expect(progress.remainingAmount).toBe(toMinor(900_000));
    expect(progress.percentComplete).toBe(25);
    expect(progress.isComplete).toBe(false);
  });

  it('caps the percentage at 100 when a goal is over-funded', () => {
    const progress = calculateGoalProgress({ ...base, currentAmount: toMinor(1_500_000) }, NOW);
    expect(progress.percentComplete).toBe(100);
    expect(progress.remainingAmount).toBe(0);
    expect(progress.isComplete).toBe(true);
    expect(progress.pace).toBe('completed');
  });

  it('projects a completion date from the monthly contribution', () => {
    // ₦900,000 remaining at ₦100,000 a month is nine months.
    const progress = calculateGoalProgress(base, NOW);
    expect(progress.projectedCompletionDate?.getUTCMonth()).toBe(4); // May
    expect(progress.projectedCompletionDate?.getUTCFullYear()).toBe(2027);
  });

  it('reports no projection when nothing is being contributed', () => {
    const progress = calculateGoalProgress({ ...base, monthlyContribution: 0 }, NOW);
    expect(progress.projectedCompletionDate).toBeNull();
    expect(progress.pace).toBe('stalled');
  });

  it('recognises a goal that is ahead of its deadline', () => {
    const progress = calculateGoalProgress({ ...base, deadline: '2027-12-31T00:00:00.000Z' }, NOW);
    expect(progress.pace).toBe('ahead');
    expect(progress.monthsAheadOfDeadline).toBeGreaterThan(1);
  });

  it('recognises a goal that will miss its deadline', () => {
    const progress = calculateGoalProgress(
      { ...base, deadline: '2026-11-30T00:00:00.000Z', monthlyContribution: toMinor(10_000) },
      NOW,
    );
    expect(progress.pace).toBe('behind');
    // The required contribution is far above what they are actually putting in.
    expect(progress.requiredMonthlyContribution).toBeGreaterThan(toMinor(10_000));
  });

  it('handles a goal with no deadline at all', () => {
    const progress = calculateGoalProgress(base, NOW);
    expect(progress.daysRemaining).toBeNull();
    expect(progress.pace).toBe('no_deadline');
  });
});

describe('calculateRequiredMonthlyContribution', () => {
  it('rounds up, because under-contributing misses the date', () => {
    // ₦1,000,000 over 3 months is ₦333,333.33 — the user must save ₦333,333.34.
    expect(calculateRequiredMonthlyContribution(toMinor(1_000_000), 3)).toBe(33_333_334);
  });

  it('demands the whole remainder when the deadline has passed', () => {
    expect(calculateRequiredMonthlyContribution(toMinor(50_000), 0)).toBe(toMinor(50_000));
    expect(calculateRequiredMonthlyContribution(toMinor(50_000), -3)).toBe(toMinor(50_000));
  });

  it('asks for nothing when the goal is already funded', () => {
    expect(calculateRequiredMonthlyContribution(0, 6)).toBe(0);
  });
});

describe('calculateRemainingAmount', () => {
  it('never returns a negative remainder', () => {
    expect(calculateRemainingAmount(toMinor(100), toMinor(150))).toBe(0);
    expect(calculateRemainingAmount(toMinor(100), toMinor(40))).toBe(toMinor(60));
  });
});

describe('calculatePlanProjection', () => {
  it('counts the contributions remaining and normalises to a monthly figure', () => {
    const projection = calculatePlanProjection(
      {
        targetAmount: toMinor(1_200_000),
        contributionAmount: toMinor(100_000),
        contributedAmount: toMinor(400_000),
        frequency: 'monthly',
        startDate: '2026-01-02T00:00:00.000Z',
      },
      NOW,
    );

    expect(projection.remainingAmount).toBe(toMinor(800_000));
    expect(projection.contributionsRemaining).toBe(8);
    expect(projection.totalContributions).toBe(12);
    expect(projection.monthlyEquivalent).toBe(toMinor(100_000));
    expect(projection.percentComplete).toBeCloseTo(33.33, 1);
  });

  it('converts a weekly contribution into its monthly equivalent', () => {
    const projection = calculatePlanProjection(
      {
        targetAmount: toMinor(520_000),
        contributionAmount: toMinor(10_000),
        contributedAmount: 0,
        frequency: 'weekly',
        startDate: NOW,
      },
      NOW,
    );

    // 52 weeks / 12 months × ₦10,000 ≈ ₦43,333 a month.
    expect(projection.monthlyEquivalent).toBe(4_333_333);
  });

  it('reports completion for a finished plan', () => {
    const projection = calculatePlanProjection(
      {
        targetAmount: toMinor(100_000),
        contributionAmount: toMinor(50_000),
        contributedAmount: toMinor(100_000),
        frequency: 'monthly',
        startDate: NOW,
      },
      NOW,
    );

    expect(projection.remainingAmount).toBe(0);
    expect(projection.percentComplete).toBe(100);
    expect(projection.nextContributionDate).toBeNull();
  });
});

describe('nextOccurrence', () => {
  it('finds the next monthly date after now', () => {
    const start = new Date('2026-01-02T00:00:00.000Z');
    const next = nextOccurrence(start, 'monthly', NOW);
    expect(next.getUTCMonth()).toBe(8); // September
    expect(next.getUTCDate()).toBe(2);
  });

  it('returns the start date when the schedule has not begun', () => {
    const start = new Date('2026-12-01T00:00:00.000Z');
    expect(nextOccurrence(start, 'weekly', NOW)).toEqual(start);
  });
});

describe('projectSavingsGrowth', () => {
  it('projects a straight line with no assumed return', () => {
    const points = projectSavingsGrowth(toMinor(100_000), toMinor(50_000), 3);
    expect(points).toHaveLength(4);
    expect(points[0]?.balance).toBe(toMinor(100_000));
    expect(points[3]?.balance).toBe(toMinor(250_000));
  });

  it('caps the horizon rather than generating an unbounded series', () => {
    expect(projectSavingsGrowth(0, toMinor(1_000), 5_000)).toHaveLength(121);
  });
});

describe('buildStartingPlan', () => {
  it('honours a stated savings target', () => {
    const plan = buildStartingPlan(toMinor(500_000), toMinor(100_000));
    expect(plan.savings).toBe(toMinor(100_000));
    expect(plan.savingsRate).toBe(20);
    // Everything is allocated — nothing quietly disappears in the rounding.
    expect(plan.essentials + plan.savings + plan.discretionary).toBe(plan.income);
  });

  it('defaults to a fifth of income when no target is given', () => {
    const plan = buildStartingPlan(toMinor(500_000));
    expect(plan.savings).toBe(toMinor(100_000));
  });

  it('refuses to suggest saving more than half of income', () => {
    const plan = buildStartingPlan(toMinor(500_000), toMinor(450_000));
    expect(plan.savings).toBe(toMinor(250_000));
    expect(plan.essentials + plan.savings + plan.discretionary).toBe(plan.income);
  });

  it('returns an empty plan for a zero income rather than dividing by zero', () => {
    expect(buildStartingPlan(0)).toEqual({
      income: 0,
      essentials: 0,
      savings: 0,
      discretionary: 0,
      savingsRate: 0,
    });
  });
});

describe('toCategoryBreakdown', () => {
  it('sorts by size and reports each share of the total', () => {
    const breakdown = toCategoryBreakdown({
      food: toMinor(60_000),
      housing: toMinor(120_000),
      transport: toMinor(20_000),
      unused: 0,
    });

    expect(breakdown.map((entry) => entry.category)).toEqual(['housing', 'food', 'transport']);
    expect(breakdown[0]?.percentage).toBe(60);
    expect(breakdown.reduce((sum, entry) => sum + entry.percentage, 0)).toBeCloseTo(100, 5);
  });
});
