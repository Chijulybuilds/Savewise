import type { BudgetDto, CreateBudgetInput, MonthKey, UpdateBudgetInput } from '@savewise/shared';

import { del, get, patch, post } from './api';

export const budgetService = {
  /** Trailing months, newest first. */
  list(limit = 12): Promise<BudgetDto[]> {
    return get<{ budgets: BudgetDto[] }>('/budgets', { params: { limit } }).then((d) => d.budgets);
  },

  /**
   * A month with no budget resolves to `null`, not a 404 — "you have not
   * budgeted this month yet" is an empty state the UI renders, not an error.
   */
  getForMonth(month: MonthKey): Promise<BudgetDto | null> {
    return get<{ budget: BudgetDto | null }>('/budgets', { params: { month } }).then(
      (d) => d.budget,
    );
  },

  current(): Promise<BudgetDto | null> {
    return get<{ budget: BudgetDto | null }>('/budgets/current').then((d) => d.budget);
  },

  create(input: CreateBudgetInput): Promise<BudgetDto> {
    return post<{ budget: BudgetDto }>('/budgets', input).then((d) => d.budget);
  },

  update(id: string, input: UpdateBudgetInput): Promise<BudgetDto> {
    return patch<{ budget: BudgetDto }>(`/budgets/${id}`, input).then((d) => d.budget);
  },

  remove(id: string): Promise<void> {
    return del(`/budgets/${id}`);
  },
};
