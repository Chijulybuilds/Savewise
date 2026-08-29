import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OverviewDto } from '@savewise/shared';

import DashboardPage from '@/pages/app/DashboardPage';
import { ApiError } from '@/services/api';
import { makeUser, renderWithProviders } from '@/test/render';

/**
 * Dashboard.
 *
 * Covers the three states every asynchronous screen in Savewise must handle —
 * loading, error, loaded — and checks that the loaded state shows the figures
 * the API returned rather than anything computed locally.
 */

const overviewQuery = vi.fn();

vi.mock('@/hooks/useApiQueries', () => ({
  useOverview: () => overviewQuery(),
}));

function makeOverview(overrides: Partial<OverviewDto> = {}): OverviewDto {
  return {
    month: '2026-08',
    monthLabel: 'August 2026',
    currency: 'NGN',
    totalBalance: 149_665_400, // ₦1,496,654
    totalSaved: 142_676_900, // ₦1,426,769
    monthlyIncome: 59_780_000, // ₦597,800
    monthlyExpenses: 35_975_600, // ₦359,756
    monthlySavings: 11_820_200, // ₦118,202
    savingsRate: 19.77,
    net: 11_984_200,
    incomeChange: 3.75,
    expenseChange: -1.53,
    savingsChange: 0.04,
    budget: {
      exists: true,
      budgeted: 39_500_000,
      spent: 32_748_700,
      remaining: 6_751_300,
      percentageUsed: 82.91,
      health: 'watch',
    },
    goals: {
      totalTarget: 545_000_000,
      totalSaved: 142_676_900,
      totalRemaining: 402_323_100,
      percentComplete: 26.18,
      activeCount: 3,
      completedCount: 0,
      committedMonthly: 12_500_000,
    },
    trend: [],
    categories: [],
    recentTransactions: [],
    topInsight: {
      id: 'savings-rate-2026-08',
      type: 'savings_rate',
      severity: 'neutral',
      title: 'Steady, with room to grow',
      message: 'You saved 19.8% of your income.',
      metric: { label: 'Savings rate', value: '19.8%', raw: 19.77 },
      recommendation: 'Move one discretionary category down by 5%.',
      action: { label: 'Adjust budget', href: '/budget' },
      generatedAt: '2026-08-28T00:00:00.000Z',
    },
    ...overrides,
  };
}

beforeEach(() => {
  overviewQuery.mockReset();
});

describe('DashboardPage', () => {
  it('shows a skeleton rather than a blank page while loading', () => {
    overviewQuery.mockReturnValue({ data: undefined, isPending: true, error: null, refetch: vi.fn() });

    renderWithProviders(<DashboardPage />, { user: makeUser() });

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('greets the signed-in user by their first name', () => {
    overviewQuery.mockReturnValue({
      data: makeOverview(),
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />, { user: makeUser({ firstName: 'Chinedu' }) });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Chinedu/);
  });

  it('renders the headline figures as formatted money', () => {
    overviewQuery.mockReturnValue({
      data: makeOverview(),
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />, { user: makeUser() });

    // `AnimatedMoney` puts the settled value in `aria-label`, so this asserts
    // what a screen reader hears rather than a mid-animation frame.
    expect(screen.getByLabelText('₦1,496,654')).toBeInTheDocument();
    expect(screen.getByLabelText('₦597,800')).toBeInTheDocument();
    expect(screen.getByLabelText('₦359,756')).toBeInTheDocument();
  });

  it('surfaces the month’s headline insight', () => {
    overviewQuery.mockReturnValue({
      data: makeOverview(),
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />, { user: makeUser() });

    expect(screen.getByText('Steady, with room to grow')).toBeInTheDocument();
    expect(screen.getByText(/You saved 19.8% of your income/)).toBeInTheDocument();
  });

  it('offers to create a budget when none exists for the month', () => {
    overviewQuery.mockReturnValue({
      data: makeOverview({
        budget: {
          exists: false,
          budgeted: 0,
          spent: 35_975_600,
          remaining: 0,
          percentageUsed: 0,
          health: 'healthy',
        },
      }),
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />, { user: makeUser() });

    // A 0% bar would read as "you have spent nothing" — the opposite of true.
    expect(screen.getByText('No budget set for August 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Set this month’s limits/ })).toBeInTheDocument();
  });

  it('shows a recoverable error state rather than an empty screen', () => {
    const refetch = vi.fn();
    overviewQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new ApiError('NETWORK_ERROR', 'offline', 0),
      refetch,
    });

    renderWithProviders(<DashboardPage />, { user: makeUser() });

    expect(screen.getByRole('alert')).toHaveTextContent('No connection');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('never shows a raw server message for a 500', () => {
    overviewQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new ApiError('INTERNAL_ERROR', 'TypeError: cannot read property of undefined', 500),
      refetch: vi.fn(),
    });

    renderWithProviders(<DashboardPage />, { user: makeUser() });

    expect(screen.queryByText(/TypeError/)).not.toBeInTheDocument();
  });
});
