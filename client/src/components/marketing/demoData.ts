import { toMinor, type GoalCategory } from '@savewise/shared';

/**
 * Illustrative figures for the marketing pages.
 *
 * Explicitly **demo content**, kept in one file so it is obvious at a glance
 * that the landing page is not pretending to show anyone's real account. The
 * application itself never imports this module — every number inside the
 * product comes from the API.
 *
 * The amounts are built with the same `toMinor` helper the rest of the codebase
 * uses, so the landing page and the dashboard format money identically.
 */

export const DEMO_CURRENCY = 'NGN' as const;

export const DEMO_SNAPSHOT = {
  monthlyIncome: toMinor(520_000),
  plannedSavings: toMinor(120_000),
  totalSaved: toMinor(1_426_000),
  savingsRate: 23.1,
  savingsProgress: 72,
};

export interface DemoGoal {
  name: string;
  category: GoalCategory;
  target: number;
  saved: number;
  deadline: string;
  monthlyRequired: number;
}

export const DEMO_GOALS: DemoGoal[] = [
  {
    name: 'Emergency Fund',
    category: 'emergency',
    target: toMinor(1_200_000),
    saved: toMinor(864_000),
    deadline: 'June 2027',
    monthlyRequired: toMinor(34_000),
  },
  {
    name: 'New laptop',
    category: 'device',
    target: toMinor(950_000),
    saved: toMinor(342_000),
    deadline: 'March 2027',
    monthlyRequired: toMinor(87_000),
  },
  {
    name: 'Rent 2027',
    category: 'rent',
    target: toMinor(2_400_000),
    saved: toMinor(540_000),
    deadline: 'August 2027',
    monthlyRequired: toMinor(155_000),
  },
];

export const DEMO_BUDGET = {
  income: toMinor(520_000),
  needs: toMinor(280_000),
  savings: toMinor(120_000),
  wants: toMinor(120_000),
};

export const DEMO_CATEGORIES = [
  { label: 'Housing', amount: toMinor(85_000), used: 71 },
  { label: 'Food', amount: toMinor(78_000), used: 87 },
  { label: 'Transport', amount: toMinor(52_000), used: 62 },
  { label: 'Utilities', amount: toMinor(48_000), used: 94 },
  { label: 'Dining', amount: toMinor(31_000), used: 103 },
  { label: 'Other', amount: toMinor(26_000), used: 44 },
];

/** Twelve months of spend, for the hero's sparkline and the trend charts. */
export const DEMO_TREND = [
  { label: 'Sep', expenses: toMinor(342_000), income: toMinor(470_000), savings: toMinor(88_000) },
  { label: 'Oct', expenses: toMinor(361_000), income: toMinor(470_000), savings: toMinor(95_000) },
  { label: 'Nov', expenses: toMinor(398_000), income: toMinor(512_000), savings: toMinor(102_000) },
  { label: 'Dec', expenses: toMinor(441_000), income: toMinor(470_000), savings: toMinor(64_000) },
  { label: 'Jan', expenses: toMinor(356_000), income: toMinor(470_000), savings: toMinor(118_000) },
  { label: 'Feb', expenses: toMinor(334_000), income: toMinor(470_000), savings: toMinor(124_000) },
  { label: 'Mar', expenses: toMinor(371_000), income: toMinor(495_000), savings: toMinor(112_000) },
  { label: 'Apr', expenses: toMinor(348_000), income: toMinor(470_000), savings: toMinor(126_000) },
  { label: 'May', expenses: toMinor(329_000), income: toMinor(520_000), savings: toMinor(134_000) },
  { label: 'Jun', expenses: toMinor(362_000), income: toMinor(520_000), savings: toMinor(121_000) },
  { label: 'Jul', expenses: toMinor(345_000), income: toMinor(520_000), savings: toMinor(128_000) },
  { label: 'Aug', expenses: toMinor(318_000), income: toMinor(520_000), savings: toMinor(142_000) },
];

export const DEMO_TRANSACTIONS = [
  {
    description: 'Monthly salary',
    category: 'Salary',
    amount: toMinor(520_000),
    type: 'income' as const,
    when: '1 Aug',
  },
  {
    description: 'Emergency Fund',
    category: 'Savings',
    amount: toMinor(55_000),
    type: 'saving' as const,
    when: '2 Aug',
  },
  {
    description: 'Market shopping',
    category: 'Food',
    amount: toMinor(62_400),
    type: 'expense' as const,
    when: '5 Aug',
  },
  {
    description: 'Fuel',
    category: 'Transport',
    amount: toMinor(38_200),
    type: 'expense' as const,
    when: '7 Aug',
  },
  {
    description: 'Internet subscription',
    category: 'Utilities',
    amount: toMinor(21_000),
    type: 'expense' as const,
    when: '8 Aug',
  },
];

/**
 * Sample insights.
 *
 * Each one is phrased the way the real rules engine phrases them: a
 * comparison, a number, and something to do about it.
 */
export const DEMO_INSIGHTS = [
  {
    severity: 'positive' as const,
    title: 'Strong savings habit',
    message: 'You kept 23.1% of what came in this month — ₦120,000 set aside.',
    metric: '23.1%',
    metricLabel: 'Savings rate',
    recommendation: 'Consider raising a goal target while the habit is holding.',
  },
  {
    severity: 'warning' as const,
    title: 'Dining is over budget',
    message: 'You are ₦930 past your dining limit, with a week of August left.',
    metric: '103%',
    metricLabel: 'Of limit used',
    recommendation: 'Either raise the limit to something realistic, or hold off until September.',
  },
  {
    severity: 'positive' as const,
    title: 'Emergency Fund is ahead of schedule',
    message: 'At your current rate you will reach it about 2 months early.',
    metric: '2 months',
    metricLabel: 'Ahead',
    recommendation: 'You could bring the deadline forward, or start the next goal alongside it.',
  },
  {
    severity: 'neutral' as const,
    title: 'Transport spending jumped',
    message: 'Transport is up 26% on last month, at ₦52,000.',
    metric: '+26%',
    metricLabel: 'Change',
    recommendation: 'If this was one-off, ignore it. If it is the new normal, budget for it.',
  },
];

export const DEMO_TESTIMONIALS = [
  {
    quote:
      'I had three savings apps and still could not answer "what can I actually spend this week". Savewise was the first one that made that a single number.',
    name: 'Adaeze N.',
    role: 'Product designer, Lagos',
  },
  {
    quote:
      'The projection is what changed it for me. Seeing that my rent goal would land two months late — before it did — meant I could fix it with ₦15,000 a month instead of a panic.',
    name: 'Tunde A.',
    role: 'Backend engineer, Abuja',
  },
  {
    quote:
      'I like that it does not pretend to be a bank. It is a plan I keep, and it holds me to it.',
    name: 'Chiamaka O.',
    role: 'Pharmacist, Enugu',
  },
];
