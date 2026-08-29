import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/services/api';

/**
 * Server-state configuration.
 *
 * Financial data changes when *this* user changes it, not spontaneously, so the
 * defaults lean toward fewer requests: a minute of freshness, no refetch on
 * every window focus. Mutations invalidate precisely what they touched, which
 * is a better correctness story than polling.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry(failureCount, error) {
        // Retrying a 401, 403, 404 or a validation error just repeats a
        // definite answer. Only transient failures are worth another attempt.
        if (error instanceof ApiError) {
          if (error.status >= 400 && error.status < 500) return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Query keys, centralised.
 *
 * Hand-written key arrays scattered across components are how cache
 * invalidation silently stops working. Every key is built here, so
 * `invalidateQueries({ queryKey: queryKeys.goals.all })` is guaranteed to match
 * what the hooks registered.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  goals: {
    all: ['goals'] as const,
    list: (filters?: Record<string, unknown>) => ['goals', 'list', filters ?? {}] as const,
    detail: (id: string) => ['goals', 'detail', id] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters?: Record<string, unknown>) => ['transactions', 'list', filters ?? {}] as const,
  },
  budgets: {
    all: ['budgets'] as const,
    list: ['budgets', 'list'] as const,
    month: (month: string) => ['budgets', 'month', month] as const,
  },
  plans: {
    all: ['plans'] as const,
    list: (filters?: Record<string, unknown>) => ['plans', 'list', filters ?? {}] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    overview: (month?: string) => ['analytics', 'overview', month ?? 'current'] as const,
    spending: (months: number) => ['analytics', 'spending', months] as const,
    savings: (months: number) => ['analytics', 'savings', months] as const,
    categories: (month?: string) => ['analytics', 'categories', month ?? 'current'] as const,
  },
  insights: {
    all: ['insights'] as const,
    list: (month?: string) => ['insights', month ?? 'current'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
} as const;

/**
 * Anything a write can affect. Contributing to a goal moves the goal, writes a
 * transaction, changes the month's savings rate, the budget's savings bucket
 * and every insight derived from them — so the blunt-but-correct invalidation
 * is the right default, and the network cost is a handful of small requests.
 */
export function invalidateFinancialData(): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.goals.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.plans.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.insights.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  ]).then(() => undefined);
}
