/**
 * Wire contracts.
 *
 * These interfaces describe exactly what crosses the network. The server's
 * mappers return them and the client's services consume them, so a shape change
 * on one side is a compile error on the other rather than a runtime surprise.
 *
 * Dates are ISO 8601 strings (JSON has no date type). Money is minor units.
 */

import type {
  BudgetHealth,
  BudgetBucket,
  FinancialPriority,
  GoalCategory,
  GoalPriority,
  GoalStatus,
  InsightSeverity,
  InsightType,
  NotificationType,
  PlanFrequency,
  PlanStatus,
  TransactionType,
} from './constants.js';
import type { GoalPace } from './finance.js';
import type { CurrencyCode, Minor } from './money.js';
import type { MonthKey } from './period.js';

/* -------------------------------------------------------------------------- */
/* Envelope                                                                    */
/* -------------------------------------------------------------------------- */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string[]> | undefined;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL_ERROR',
  'NETWORK_ERROR',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/* -------------------------------------------------------------------------- */
/* User                                                                        */
/* -------------------------------------------------------------------------- */

export interface FinancialPreferences {
  /** What the user says they want to save each month, in minor units. */
  targetMonthlySavings: Minor;
  priorities: FinancialPriority[];
  /** Alert when a budget category passes this share of its limit. */
  budgetAlertThreshold: number;
  notifyOnGoalMilestone: boolean;
  notifyOnBudgetExceeded: boolean;
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  currency: CurrencyCode;
  avatarUrl: string | null;
  monthlyIncome: Minor;
  preferences: FinancialPreferences;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResultDto {
  user: UserDto;
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export interface TransactionDto {
  id: string;
  type: TransactionType;
  amount: Minor;
  category: string;
  description: string;
  date: string;
  notes: string | null;
  /** Set when the transaction was created by contributing to a goal. */
  goalId: string | null;
  goalName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummaryDto {
  income: Minor;
  expenses: Minor;
  savings: Minor;
  net: Minor;
}

export interface TransactionListDto extends Paginated<TransactionDto> {
  summary: TransactionSummaryDto;
}

/* -------------------------------------------------------------------------- */
/* Goals                                                                       */
/* -------------------------------------------------------------------------- */

export interface GoalDto {
  id: string;
  name: string;
  description: string | null;
  category: GoalCategory;
  targetAmount: Minor;
  currentAmount: Minor;
  monthlyContribution: Minor;
  deadline: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;

  /** Derived server-side so every surface agrees on the numbers. */
  progress: {
    remainingAmount: Minor;
    percentComplete: number;
    requiredMonthlyContribution: Minor;
    daysRemaining: number | null;
    monthsRemaining: number | null;
    projectedCompletionDate: string | null;
    monthsAheadOfDeadline: number | null;
    pace: GoalPace;
    isComplete: boolean;
  };
}

export interface GoalsOverviewDto {
  totalTarget: Minor;
  totalSaved: Minor;
  totalRemaining: Minor;
  percentComplete: number;
  activeCount: number;
  completedCount: number;
  committedMonthly: Minor;
}

export interface GoalListDto {
  goals: GoalDto[];
  overview: GoalsOverviewDto;
}

export interface ContributionResultDto {
  goal: GoalDto;
  transaction: TransactionDto;
  milestoneReached: number | null;
}

/* -------------------------------------------------------------------------- */
/* Budgets                                                                     */
/* -------------------------------------------------------------------------- */

export interface BudgetCategoryDto {
  category: string;
  label: string;
  bucket: BudgetBucket;
  budgeted: Minor;
  spent: Minor;
  remaining: Minor;
  overspend: Minor;
  percentageUsed: number;
  health: BudgetHealth;
}

export interface BudgetDto {
  id: string;
  month: MonthKey;
  monthLabel: string;
  plannedIncome: Minor;
  plannedSavings: Minor;
  categories: BudgetCategoryDto[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  totals: {
    budgeted: Minor;
    spent: Minor;
    remaining: Minor;
    overspend: Minor;
    percentageUsed: number;
    health: BudgetHealth;
    actualIncome: Minor;
    actualSavings: Minor;
    unallocated: Minor;
    /** How far through the month we are — context for `percentageUsed`. */
    monthElapsedPercentage: number;
    projectedMonthEndSpend: Minor;
  };

  buckets: {
    bucket: BudgetBucket;
    budgeted: Minor;
    spent: Minor;
    percentageOfIncome: number;
  }[];
}

/* -------------------------------------------------------------------------- */
/* Savings plans                                                               */
/* -------------------------------------------------------------------------- */

export interface PlanDto {
  id: string;
  name: string;
  goalId: string | null;
  goalName: string | null;
  targetAmount: Minor;
  contributionAmount: Minor;
  contributedAmount: Minor;
  frequency: PlanFrequency;
  startDate: string;
  status: PlanStatus;
  autoLogged: boolean;
  createdAt: string;
  updatedAt: string;

  projection: {
    remainingAmount: Minor;
    percentComplete: number;
    contributionsRemaining: number;
    totalContributions: number;
    monthlyEquivalent: Minor;
    projectedCompletionDate: string | null;
    nextContributionDate: string | null;
  };
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                   */
/* -------------------------------------------------------------------------- */

export interface MonthlyPointDto {
  month: MonthKey;
  label: string;
  income: Minor;
  expenses: Minor;
  savings: Minor;
  net: Minor;
  savingsRate: number;
}

export interface CategoryBreakdownDto {
  category: string;
  label: string;
  bucket: BudgetBucket;
  amount: Minor;
  percentage: number;
  /** Change against the previous period, `null` when there is no baseline. */
  changePercent: number | null;
}

export interface OverviewDto {
  month: MonthKey;
  monthLabel: string;
  currency: CurrencyCode;
  totalBalance: Minor;
  totalSaved: Minor;
  monthlyIncome: Minor;
  monthlyExpenses: Minor;
  monthlySavings: Minor;
  savingsRate: number;
  net: Minor;
  incomeChange: number | null;
  expenseChange: number | null;
  savingsChange: number | null;
  budget: {
    exists: boolean;
    budgeted: Minor;
    spent: Minor;
    remaining: Minor;
    percentageUsed: number;
    health: BudgetHealth;
  };
  goals: GoalsOverviewDto;
  trend: MonthlyPointDto[];
  categories: CategoryBreakdownDto[];
  recentTransactions: TransactionDto[];
  topInsight: InsightDto | null;
}

export interface SpendingAnalyticsDto {
  months: MonthlyPointDto[];
  averageMonthlyExpenses: Minor;
  averageMonthlyIncome: Minor;
  highestSpendMonth: MonthlyPointDto | null;
}

export interface SavingsAnalyticsDto {
  months: MonthlyPointDto[];
  cumulative: { month: MonthKey; label: string; balance: Minor }[];
  averageSavingsRate: number;
  bestMonth: MonthlyPointDto | null;
  projection: { month: number; label: string; balance: Minor }[];
}

export interface CategoryAnalyticsDto {
  month: MonthKey;
  categories: CategoryBreakdownDto[];
  buckets: { bucket: BudgetBucket; amount: Minor; percentage: number }[];
  total: Minor;
}

/* -------------------------------------------------------------------------- */
/* Insights                                                                    */
/* -------------------------------------------------------------------------- */

export interface InsightDto {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  /** The number the insight is about, ready to render. */
  metric: {
    label: string;
    value: string;
    /** Raw numeric form for charts and sorting. */
    raw: number;
  } | null;
  recommendation: string | null;
  /** Deep link into the app surface that can act on the insight. */
  action: { label: string; href: string } | null;
  generatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                               */
/* -------------------------------------------------------------------------- */

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationListDto {
  items: NotificationDto[];
  unreadCount: number;
}
