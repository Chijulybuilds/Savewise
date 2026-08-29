import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import type { UserDto } from '@savewise/shared';

import { useAuthStore } from '@/store/authStore';

/**
 * Test render helper.
 *
 * Components under test sit inside a router and a query client because that is
 * where they sit in the app — a `<Link>` outside a router throws, and a hook
 * outside a provider throws. Rendering with the real providers means the tests
 * exercise the real integration rather than a stripped-down stand-in.
 *
 * Each render gets a **fresh** `QueryClient` with retries off: a shared client
 * would leak cached data between tests, and retrying a deliberately-failing
 * request just makes the suite slow.
 */

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  /** Signs a user in before rendering. */
  user?: UserDto | null;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', user = null, ...options }: Options = {},
): RenderResult & { queryClient: QueryClient } {
  const queryClient = createTestQueryClient();

  // The auth store is a module singleton, so it is reset explicitly rather
  // than leaking the previous test's user into this one.
  useAuthStore.setState({ user, initialising: false, status: 'idle' });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient };
}

/** A complete, onboarded user. Override only what a given test cares about. */
export function makeUser(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: '6a9200c449763c508cd8454a',
    firstName: 'Chinedu',
    lastName: 'Okafor',
    email: 'chinedu@savewise.test',
    currency: 'NGN',
    avatarUrl: null,
    monthlyIncome: 52_000_000,
    preferences: {
      targetMonthlySavings: 12_000_000,
      priorities: ['emergency_fund'],
      budgetAlertThreshold: 80,
      notifyOnGoalMilestone: true,
      notifyOnBudgetExceeded: true,
    },
    onboardingCompleted: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}
