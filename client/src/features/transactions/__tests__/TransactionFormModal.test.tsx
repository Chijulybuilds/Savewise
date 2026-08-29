import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionFormModal } from '@/features/transactions/TransactionFormModal';
import { makeUser, renderWithProviders } from '@/test/render';

/**
 * Transaction form.
 *
 * Two things are worth testing here and nothing else is: that invalid input is
 * refused *before* a request is made, and that the amount reaches the API as
 * integer minor units rather than as whatever the user typed.
 */

const createTransaction = vi.fn();

vi.mock('@/hooks/useApiQueries', () => ({
  useCreateTransaction: () => ({
    mutateAsync: (...args: unknown[]) => createTransaction(...args),
    isPending: false,
  }),
  useUpdateTransaction: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

beforeEach(() => {
  createTransaction.mockReset();
  createTransaction.mockResolvedValue({});
});

function renderForm(onClose = vi.fn()) {
  return renderWithProviders(<TransactionFormModal open onClose={onClose} />, {
    user: makeUser(),
  });
}

describe('TransactionFormModal', () => {
  it('labels every control', () => {
    renderForm();

    expect(screen.getByLabelText(/Amount/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/)).toBeInTheDocument();
  });

  it('refuses an empty amount and never calls the API', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText(/Description/), 'Market shopping');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(await screen.findByText('Enter an amount')).toBeInTheDocument();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('refuses an amount that is not a number', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText(/Amount/), 'not money');
    await userEvent.type(screen.getByLabelText(/Description/), 'Market shopping');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(await screen.findByText('Enter a valid amount')).toBeInTheDocument();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('refuses an empty description', async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText(/Amount/), '25000');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(await screen.findByText('Describe this transaction')).toBeInTheDocument();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('announces validation errors to a screen reader', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    // `role="alert"` is what makes a failed submit perceivable without sight.
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('converts a typed amount into integer minor units', async () => {
    const onClose = vi.fn();
    renderForm(onClose);

    // Grouping separators are what people actually type.
    await userEvent.type(screen.getByLabelText(/Amount/), '25,000.50');
    await userEvent.type(screen.getByLabelText(/Description/), 'Market shopping');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    await waitFor(() => expect(createTransaction).toHaveBeenCalledTimes(1));

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expense',
        amount: 2_500_050,
        category: 'food',
        description: 'Market shopping',
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('re-scopes the category list when the type changes', async () => {
    renderForm();

    const categories = screen.getByLabelText(/Category/);
    expect(within(categories).getByRole('option', { name: 'Food' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /Earned/ }));

    // "Food" is not a valid income category, so the API would reject it —
    // the UI must not be able to offer the combination in the first place.
    await waitFor(() => {
      expect(within(categories).queryByRole('option', { name: 'Food' })).not.toBeInTheDocument();
    });
    expect(within(categories).getByRole('option', { name: 'Salary' })).toBeInTheDocument();
  });

  it('sends the chosen type', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('radio', { name: /Saved/ }));
    await userEvent.type(screen.getByLabelText(/Amount/), '55000');
    await userEvent.type(screen.getByLabelText(/Description/), 'Emergency fund');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    await waitFor(() => expect(createTransaction).toHaveBeenCalledTimes(1));
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'saving', category: 'savings', amount: 5_500_000 }),
    );
  });
});
