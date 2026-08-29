import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { GoalDto } from '@savewise/shared';

import { GoalCard } from '@/features/goals/GoalCard';
import { makeUser, renderWithProviders } from '@/test/render';

/**
 * Goal card.
 *
 * The card is where a user reads whether a goal is actually going to happen, so
 * the tests focus on the numbers being right and the pace being stated in
 * words rather than implied by a colour.
 */

function makeGoal(overrides: Partial<GoalDto> = {}): GoalDto {
  return {
    id: 'goal-1',
    name: 'Emergency Fund',
    description: null,
    category: 'emergency',
    targetAmount: 120_000_000, // ₦1,200,000
    currentAmount: 30_000_000, // ₦300,000
    monthlyContribution: 5_500_000, // ₦55,000
    deadline: '2027-06-30T00:00:00.000Z',
    priority: 'high',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    completedAt: null,
    progress: {
      remainingAmount: 90_000_000,
      percentComplete: 25,
      requiredMonthlyContribution: 9_000_000,
      daysRemaining: 300,
      monthsRemaining: 10,
      projectedCompletionDate: '2028-03-01T00:00:00.000Z',
      monthsAheadOfDeadline: -8,
      pace: 'behind',
      isComplete: false,
    },
    ...overrides,
  };
}

const noop = () => undefined;

function renderCard(goal: GoalDto, handlers: Partial<Parameters<typeof GoalCard>[0]> = {}) {
  return renderWithProviders(
    <GoalCard
      goal={goal}
      onContribute={noop}
      onEdit={noop}
      onDelete={noop}
      onToggleStatus={noop}
      {...handlers}
    />,
    { user: makeUser() },
  );
}

describe('GoalCard', () => {
  it('shows the balance and the target formatted as money', () => {
    renderCard(makeGoal());

    expect(screen.getByText('₦300,000')).toBeInTheDocument();
    expect(screen.getByText(/of ₦1,200,000/)).toBeInTheDocument();
    expect(screen.getByText(/25% funded/)).toBeInTheDocument();
    expect(screen.getByText(/₦900,000 to go/)).toBeInTheDocument();
  });

  it('exposes progress to assistive technology, not only as a bar', () => {
    renderCard(makeGoal());

    const progress = screen.getByRole('progressbar', { name: /Emergency Fund progress/i });
    expect(progress).toHaveAttribute('aria-valuenow', '25');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
  });

  it('states in words when a goal is behind schedule', () => {
    renderCard(makeGoal());

    // Colour alone would be invisible to a colour-blind user and to this test.
    expect(screen.getByText('Behind schedule')).toBeInTheDocument();
    // And shows the number that would fix it.
    expect(screen.getByText('₦90,000/mo')).toBeInTheDocument();
  });

  it('states when a goal is ahead of schedule', () => {
    renderCard(
      makeGoal({
        progress: { ...makeGoal().progress, pace: 'ahead', monthsAheadOfDeadline: 3 },
      }),
    );

    expect(screen.getByText('Ahead of schedule')).toBeInTheDocument();
  });

  it('says so when no monthly amount has been set', () => {
    renderCard(
      makeGoal({
        monthlyContribution: 0,
        progress: { ...makeGoal().progress, pace: 'stalled' },
      }),
    );

    expect(screen.getByText('No monthly amount set')).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('disables contributing to a funded goal', () => {
    renderCard(
      makeGoal({
        status: 'completed',
        currentAmount: 120_000_000,
        progress: {
          ...makeGoal().progress,
          percentComplete: 100,
          remainingAmount: 0,
          isComplete: true,
          pace: 'completed',
        },
      }),
    );

    const button = screen.getByRole('button', { name: 'Goal funded' });
    expect(button).toBeDisabled();
    expect(screen.getByText('Funded')).toBeInTheDocument();
  });

  it('reports the goal upward when the contribute button is pressed', async () => {
    const onContribute = vi.fn();
    const goal = makeGoal();
    renderCard(goal, { onContribute });

    await userEvent.click(screen.getByRole('button', { name: 'Record contribution' }));

    expect(onContribute).toHaveBeenCalledWith(goal);
  });

  it('offers destructive actions behind a menu rather than in the open', async () => {
    const onDelete = vi.fn();
    const goal = makeGoal();
    renderCard(goal, { onDelete });

    // Not visible until the menu is opened — deletion should take two actions.
    expect(screen.queryByRole('menuitem', { name: 'Delete goal' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Actions for Emergency Fund/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete goal' }));

    expect(onDelete).toHaveBeenCalledWith(goal);
  });
});
