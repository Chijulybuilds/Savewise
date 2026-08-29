import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  BudgetQuery,
  ContributeInput,
  CreateBudgetInput,
  CreateGoalInput,
  CreatePlanInput,
  CreateTransactionInput,
  GoalQuery,
  MonthKey,
  PlanQuery,
  RecordPlanContributionInput,
  TransactionQuery,
  UpdateBudgetInput,
  UpdateGoalInput,
  UpdatePlanInput,
  UpdateTransactionInput,
} from '@savewise/shared';

import { invalidateFinancialData, queryKeys } from '@/lib/queryClient';
import { analyticsService, insightService } from '@/services/analyticsService';
import { budgetService } from '@/services/budgetService';
import { goalService } from '@/services/goalService';
import { planService } from '@/services/planService';
import { transactionService } from '@/services/transactionService';

/**
 * Typed data hooks.
 *
 * Every screen reads and writes through these rather than calling a service in
 * a `useEffect`. The payoff is cache invalidation that is correct by
 * construction: a contribution changes the goal, the ledger, the month's
 * savings rate, the budget's savings bucket and every derived insight, and
 * `invalidateFinancialData` refreshes all of them from one place.
 *
 * Keeping the hooks here rather than beside each page also means the query keys
 * and the invalidations sit next to each other, where a mismatch is visible.
 */

/* -------------------------------------------------------------------------- */
/* Analytics                                                                   */
/* -------------------------------------------------------------------------- */

export function useOverview(month?: MonthKey) {
  return useQuery({
    queryKey: queryKeys.analytics.overview(month),
    queryFn: () => analyticsService.overview(month),
  });
}

export function useSpendingAnalytics(months = 12) {
  return useQuery({
    queryKey: queryKeys.analytics.spending(months),
    queryFn: () => analyticsService.spending(months),
  });
}

export function useSavingsAnalytics(months = 12) {
  return useQuery({
    queryKey: queryKeys.analytics.savings(months),
    queryFn: () => analyticsService.savings(months),
  });
}

export function useCategoryAnalytics(month?: MonthKey) {
  return useQuery({
    queryKey: queryKeys.analytics.categories(month),
    queryFn: () => analyticsService.categories(month),
  });
}

export function useInsights(month?: MonthKey) {
  return useQuery({
    queryKey: queryKeys.insights.list(month),
    queryFn: () => insightService.list(month),
  });
}

/* -------------------------------------------------------------------------- */
/* Goals                                                                       */
/* -------------------------------------------------------------------------- */

export function useGoals(query: Partial<GoalQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.goals.list(query),
    queryFn: () => goalService.list(query),
  });
}

export function useCreateGoal() {
  return useMutation({
    mutationFn: (input: CreateGoalInput) => goalService.create(input),
    onSuccess: invalidateFinancialData,
  });
}

export function useUpdateGoal() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) =>
      goalService.update(id, input),
    onSuccess: invalidateFinancialData,
  });
}

export function useDeleteGoal() {
  return useMutation({
    mutationFn: (id: string) => goalService.remove(id),
    onSuccess: invalidateFinancialData,
  });
}

export function useContributeToGoal() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContributeInput }) =>
      goalService.contribute(id, input),
    onSuccess: invalidateFinancialData,
  });
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export function useTransactions(query: Partial<TransactionQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.list(query),
    queryFn: () => transactionService.list(query),
    // Keeps the previous page on screen while the next one loads, so paging
    // through a list does not flash an empty table between pages.
    placeholderData: (previous) => previous,
  });
}

export function useCreateTransaction() {
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => transactionService.create(input),
    onSuccess: invalidateFinancialData,
  });
}

export function useUpdateTransaction() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionInput }) =>
      transactionService.update(id, input),
    onSuccess: invalidateFinancialData,
  });
}

export function useDeleteTransaction() {
  return useMutation({
    mutationFn: (id: string) => transactionService.remove(id),
    onSuccess: invalidateFinancialData,
  });
}

/* -------------------------------------------------------------------------- */
/* Budgets                                                                     */
/* -------------------------------------------------------------------------- */

export function useBudgetForMonth(month: MonthKey) {
  return useQuery({
    queryKey: queryKeys.budgets.month(month),
    queryFn: () => budgetService.getForMonth(month),
  });
}

export function useBudgets(limit: BudgetQuery['limit'] = 12) {
  return useQuery({
    queryKey: queryKeys.budgets.list,
    queryFn: () => budgetService.list(limit),
  });
}

export function useCreateBudget() {
  return useMutation({
    mutationFn: (input: CreateBudgetInput) => budgetService.create(input),
    onSuccess: invalidateFinancialData,
  });
}

export function useUpdateBudget() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBudgetInput }) =>
      budgetService.update(id, input),
    onSuccess: invalidateFinancialData,
  });
}

export function useDeleteBudget() {
  return useMutation({
    mutationFn: (id: string) => budgetService.remove(id),
    onSuccess: invalidateFinancialData,
  });
}

/* -------------------------------------------------------------------------- */
/* Plans                                                                       */
/* -------------------------------------------------------------------------- */

export function usePlans(query: Partial<PlanQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.plans.list(query),
    queryFn: () => planService.list(query),
  });
}

export function useCreatePlan() {
  return useMutation({
    mutationFn: (input: CreatePlanInput) => planService.create(input),
    onSuccess: invalidateFinancialData,
  });
}

export function useUpdatePlan() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlanInput }) =>
      planService.update(id, input),
    onSuccess: invalidateFinancialData,
  });
}

export function useDeletePlan() {
  return useMutation({
    mutationFn: (id: string) => planService.remove(id),
    onSuccess: invalidateFinancialData,
  });
}

export function useRecordPlanContribution() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecordPlanContributionInput }) =>
      planService.contribute(id, input),
    onSuccess: invalidateFinancialData,
  });
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                   */
/* -------------------------------------------------------------------------- */

/** Refetches everything on the current screen — used by the error states' retry. */
export function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.refetchQueries({ type: 'active' });
}
