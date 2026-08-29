/**
 * Domain vocabulary shared by the API and the UI.
 *
 * These are the single source of truth for every enum in the product: Mongoose
 * schemas, Zod validators, select inputs and chart legends all read from here,
 * so adding a category is a one-line change rather than a grep-and-pray.
 */

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export const TRANSACTION_TYPES = ['income', 'expense', 'saving'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Spending categories. `key` is persisted; `label` is presentational.
 * `bucket` maps a category onto the needs / wants / savings frame used by the
 * budget engine and the 50/30/20-style starting plan.
 */
export const EXPENSE_CATEGORIES = [
  { key: 'housing', label: 'Housing', bucket: 'needs' },
  { key: 'food', label: 'Food', bucket: 'needs' },
  { key: 'transportation', label: 'Transportation', bucket: 'needs' },
  { key: 'utilities', label: 'Utilities', bucket: 'needs' },
  { key: 'healthcare', label: 'Healthcare', bucket: 'needs' },
  { key: 'education', label: 'Education', bucket: 'needs' },
  { key: 'family', label: 'Family & dependants', bucket: 'needs' },
  { key: 'debt', label: 'Debt repayment', bucket: 'needs' },
  { key: 'entertainment', label: 'Entertainment', bucket: 'wants' },
  { key: 'shopping', label: 'Shopping', bucket: 'wants' },
  { key: 'dining', label: 'Dining out', bucket: 'wants' },
  { key: 'personal', label: 'Personal care', bucket: 'wants' },
  { key: 'giving', label: 'Giving', bucket: 'wants' },
  { key: 'savings', label: 'Savings', bucket: 'savings' },
  { key: 'other', label: 'Other', bucket: 'wants' },
] as const;

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORIES)[number]['key'];
export const EXPENSE_CATEGORY_KEYS = EXPENSE_CATEGORIES.map((c) => c.key) as [
  ExpenseCategoryKey,
  ...ExpenseCategoryKey[],
];

export const INCOME_CATEGORIES = [
  { key: 'salary', label: 'Salary' },
  { key: 'business', label: 'Business' },
  { key: 'freelance', label: 'Freelance' },
  { key: 'investment', label: 'Investment returns' },
  { key: 'gift', label: 'Gift' },
  { key: 'refund', label: 'Refund' },
  { key: 'other_income', label: 'Other income' },
] as const;

export type IncomeCategoryKey = (typeof INCOME_CATEGORIES)[number]['key'];
export const INCOME_CATEGORY_KEYS = INCOME_CATEGORIES.map((c) => c.key) as [
  IncomeCategoryKey,
  ...IncomeCategoryKey[],
];

export type CategoryKey = ExpenseCategoryKey | IncomeCategoryKey;
export const ALL_CATEGORY_KEYS = [...EXPENSE_CATEGORY_KEYS, ...INCOME_CATEGORY_KEYS] as [
  CategoryKey,
  ...CategoryKey[],
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.key, c.label]),
);

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? 'Uncategorised';
}

export type BudgetBucket = 'needs' | 'wants' | 'savings';
export const BUDGET_BUCKETS = ['needs', 'wants', 'savings'] as const;

const CATEGORY_BUCKETS: Record<string, BudgetBucket> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.key, c.bucket]),
);

export function categoryBucket(key: string): BudgetBucket {
  return CATEGORY_BUCKETS[key] ?? 'wants';
}

/** Categories a transaction of the given type may legally use. */
export function categoriesForType(
  type: TransactionType,
): readonly { key: string; label: string }[] {
  if (type === 'income') return INCOME_CATEGORIES;
  if (type === 'saving') return [{ key: 'savings', label: 'Savings' }];
  return EXPENSE_CATEGORIES.filter((c) => c.key !== 'savings');
}

export function isCategoryValidForType(category: string, type: TransactionType): boolean {
  return categoriesForType(type).some((c) => c.key === category);
}

/* -------------------------------------------------------------------------- */
/* Savings goals                                                               */
/* -------------------------------------------------------------------------- */

export const GOAL_CATEGORIES = [
  { key: 'emergency', label: 'Emergency fund' },
  { key: 'education', label: 'Education' },
  { key: 'rent', label: 'Rent' },
  { key: 'travel', label: 'Travel' },
  { key: 'device', label: 'Device' },
  { key: 'business', label: 'Business' },
  { key: 'investment', label: 'Investment' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'celebration', label: 'Celebration' },
  { key: 'other', label: 'Other' },
] as const;

export type GoalCategory = (typeof GOAL_CATEGORIES)[number]['key'];
export const GOAL_CATEGORY_KEYS = GOAL_CATEGORIES.map((c) => c.key) as [
  GoalCategory,
  ...GoalCategory[],
];

export function goalCategoryLabel(key: string): string {
  return GOAL_CATEGORIES.find((c) => c.key === key)?.label ?? 'Other';
}

export const GOAL_STATUSES = ['active', 'paused', 'completed', 'archived'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_PRIORITIES = ['low', 'medium', 'high'] as const;
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

/* -------------------------------------------------------------------------- */
/* Savings plans                                                               */
/* -------------------------------------------------------------------------- */

export const PLAN_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type PlanFrequency = (typeof PLAN_FREQUENCIES)[number];

export const PLAN_STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/** Average number of contribution events per calendar month, for projections. */
export const CONTRIBUTIONS_PER_MONTH: Record<PlanFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
};

export const FREQUENCY_LABELS: Record<PlanFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  monthly: 'Monthly',
};

/* -------------------------------------------------------------------------- */
/* Insights                                                                    */
/* -------------------------------------------------------------------------- */

export const INSIGHT_SEVERITIES = ['positive', 'neutral', 'warning', 'critical'] as const;
export type InsightSeverity = (typeof INSIGHT_SEVERITIES)[number];

export const INSIGHT_TYPES = [
  'savings_rate',
  'budget_overspend',
  'budget_health',
  'goal_pace',
  'goal_milestone',
  'spending_trend',
  'category_spike',
  'cash_flow',
  'plan_projection',
  'getting_started',
] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */

export const NOTIFICATION_TYPES = [
  'goal_created',
  'goal_contribution',
  'goal_milestone',
  'goal_completed',
  'budget_exceeded',
  'budget_warning',
  'plan_created',
  'insight_ready',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/* -------------------------------------------------------------------------- */
/* Budget health                                                               */
/* -------------------------------------------------------------------------- */

export const BUDGET_HEALTH = ['healthy', 'watch', 'exceeded'] as const;
export type BudgetHealth = (typeof BUDGET_HEALTH)[number];

/** Percentage of a budget line spent before we start warning. */
export const BUDGET_WATCH_THRESHOLD = 80;

/* -------------------------------------------------------------------------- */
/* Onboarding                                                                  */
/* -------------------------------------------------------------------------- */

export const FINANCIAL_PRIORITIES = [
  { key: 'emergency_fund', label: 'Build an emergency fund' },
  { key: 'reduce_spending', label: 'Spend more deliberately' },
  { key: 'big_purchase', label: 'Save for a big purchase' },
  { key: 'rent', label: 'Stay ahead of rent' },
  { key: 'education', label: 'Fund education' },
  { key: 'business', label: 'Grow a business' },
  { key: 'invest', label: 'Start investing' },
  { key: 'debt_free', label: 'Clear debt' },
] as const;

export type FinancialPriority = (typeof FINANCIAL_PRIORITIES)[number]['key'];
export const FINANCIAL_PRIORITY_KEYS = FINANCIAL_PRIORITIES.map((p) => p.key) as [
  FinancialPriority,
  ...FinancialPriority[],
];

/**
 * The starting split Savewise suggests during onboarding. Deliberately a
 * *suggestion*, surfaced in the UI as "Suggested starting plan" — not advice.
 */
export const SUGGESTED_SPLIT = { needs: 60, savings: 20, wants: 20 } as const;

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
