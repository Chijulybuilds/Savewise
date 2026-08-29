import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  ALL_CATEGORY_KEYS,
  TRANSACTION_TYPES,
  categoryLabel,
  type TransactionDto,
  type TransactionType,
} from '@savewise/shared';

import { SlideUp } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { TransactionFormModal } from '@/features/transactions/TransactionFormModal';
import { TransactionList } from '@/features/transactions/TransactionList';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCurrency } from '@/hooks/useCurrency';
import { useDeleteTransaction, useTransactions } from '@/hooks/useApiQueries';
import { usePageMeta } from '@/hooks/usePageMeta';
import { toast } from '@/store/toastStore';

/**
 * Transactions.
 *
 * Filters live in the URL rather than component state, so a filtered view can
 * be bookmarked, shared and — the case that actually matters — survives the
 * back button after opening a transaction. It also lets an insight deep-link
 * straight to `/transactions?category=dining`.
 *
 * Search is debounced; every other filter applies immediately, because a select
 * change is a deliberate act while typing is not.
 */

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  ...TRANSACTION_TYPES.map((type) => ({
    value: type,
    label: type === 'expense' ? 'Spending' : type === 'income' ? 'Income' : 'Savings',
  })),
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...ALL_CATEGORY_KEYS.map((key) => ({ value: key, label: categoryLabel(key) })),
];

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  usePageMeta({ title: 'Transactions — Savewise', noIndex: true });

  const [params, setParams] = useSearchParams();
  const { format } = useCurrency();

  const [searchInput, setSearchInput] = useState(params.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDto | null>(null);
  const [deleting, setDeleting] = useState<TransactionDto | null>(null);

  const page = Number(params.get('page') ?? '1');
  const type = params.get('type') ?? '';
  const category = params.get('category') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  // Keep the debounced search in the URL, and reset to page 1 whenever it
  // changes — staying on page 4 of a different result set shows nothing.
  useEffect(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedSearch) next.set('search', debouncedSearch);
        else next.delete('search');
        if (next.get('search') !== current.get('search')) next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setParams]);

  const query = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(type ? { type: type as TransactionType } : {}),
      ...(category ? { category: category as never } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(from ? { from: new Date(from) } : {}),
      ...(to ? { to: new Date(to) } : {}),
    }),
    [page, type, category, debouncedSearch, from, to],
  );

  const { data, isPending, error, refetch, isPlaceholderData } = useTransactions(query);
  const deleteTransaction = useDeleteTransaction();

  function updateFilter(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  }

  function goToPage(nextPage: number) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const hasFilters = Boolean(type || category || debouncedSearch || from || to);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteTransaction.mutateAsync(deleting.id);
      toast.success(
        'Transaction deleted',
        deleting.goalId ? 'The goal balance has been adjusted too.' : undefined,
      );
      setDeleting(null);
    } catch {
      toast.error('Could not delete that transaction');
    }
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Everything that came in, went out, or was set aside."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add transaction
          </Button>
        }
        toolbar={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label htmlFor="transaction-search" className="sr-only">
                Search transactions
              </label>
              <Input
                id="transaction-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search descriptions and notes"
              />
            </div>

            <div>
              <label htmlFor="filter-type" className="sr-only">
                Filter by type
              </label>
              <Select
                id="filter-type"
                value={type}
                onChange={(event) => updateFilter('type', event.target.value)}
                options={TYPE_OPTIONS}
              />
            </div>

            <div>
              <label htmlFor="filter-category" className="sr-only">
                Filter by category
              </label>
              <Select
                id="filter-category"
                value={category}
                onChange={(event) => updateFilter('category', event.target.value)}
                options={CATEGORY_OPTIONS}
              />
            </div>

            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="filter-from" className="sr-only">
                  From date
                </label>
                <Input
                  id="filter-from"
                  type="date"
                  value={from}
                  onChange={(event) => updateFilter('from', event.target.value)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="filter-to" className="sr-only">
                  To date
                </label>
                <Input
                  id="filter-to"
                  type="date"
                  value={to}
                  onChange={(event) => updateFilter('to', event.target.value)}
                />
              </div>
            </div>
          </div>
        }
      />

      {data && (
        <SlideUp className="mb-6 grid gap-3 sm:grid-cols-3">
          <Summary label="Income" value={format(data.summary.income)} tone="positive" />
          <Summary label="Spending" value={format(data.summary.expenses)} tone="ink" />
          <Summary label="Saved" value={format(data.summary.savings)} tone="primary" />
        </SlideUp>
      )}

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <SkeletonRows rows={8} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Nothing matches those filters' : 'No transactions yet'}
          description={
            hasFilters
              ? 'Try widening the date range or clearing a filter.'
              : 'Record your income and spending — everything else in Savewise is derived from this.'
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput('');
                  setParams({});
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add your first transaction
              </Button>
            )
          }
        />
      ) : (
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <TransactionList
            transactions={data.items}
            onEdit={(transaction) => {
              setEditing(transaction);
              setFormOpen(true);
            }}
            onDelete={setDeleting}
          />

          {data.totalPages > 1 && (
            <nav
              className="mt-6 flex items-center justify-between gap-4"
              aria-label="Transaction pages"
            >
              <p className="text-xs text-ink-muted">
                Page {data.page} of {data.totalPages} · {data.total} transactions
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => goToPage(data.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasMore}
                  onClick={() => goToPage(data.page + 1)}
                >
                  Next
                </Button>
              </div>
            </nav>
          )}
        </div>
      )}

      <TransactionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        transaction={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete this transaction?"
        description={
          deleting?.goalId
            ? 'This was a goal contribution. Deleting it will reduce that goal’s balance by the same amount.'
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        loading={deleteTransaction.isPending}
      />
    </>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'primary' | 'ink';
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={`tabular mt-1 text-lg font-semibold ${
          tone === 'positive' ? 'text-positive' : tone === 'primary' ? 'text-primary' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
