import { Link } from 'react-router-dom';

import { categoryLabel, formatDate, type TransactionDto } from '@savewise/shared';

import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { useCurrency } from '@/hooks/useCurrency';

/**
 * Recent activity.
 *
 * A list, not a table. Five rows with four fields each do not need column
 * headers, and a list collapses to a phone without any of the horizontal-scroll
 * or card-stacking gymnastics a table would require.
 */
export function RecentTransactions({ transactions }: { transactions: TransactionDto[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Recent activity"
        action={
          <Link
            to="/transactions"
            className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all
          </Link>
        }
      />

      {transactions.length === 0 ? (
        <EmptyState
          className="mt-4 flex-1 border-0 py-10"
          title="No transactions yet"
          description="Record your income and spending and this fills in."
        />
      ) : (
        <ul className="mt-3 flex-1 divide-y divide-border">
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function TransactionRow({ transaction }: { transaction: TransactionDto }) {
  const { format } = useCurrency();
  const isIncome = transaction.type === 'income';
  const isSaving = transaction.type === 'saving';

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          isIncome
            ? 'bg-positive-soft text-positive'
            : isSaving
              ? 'bg-primary-soft text-primary'
              : 'bg-surface-sunken text-ink-muted',
        )}
        aria-hidden="true"
      >
        {isIncome ? '↓' : isSaving ? '◆' : '↑'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{transaction.description}</p>
        <p className="truncate text-xs text-ink-subtle">
          {transaction.goalName ?? categoryLabel(transaction.category)} ·{' '}
          {formatDate(transaction.date, 'short')}
        </p>
      </div>

      <p
        className={cn(
          'tabular shrink-0 text-sm font-medium',
          isIncome ? 'text-positive' : isSaving ? 'text-primary' : 'text-ink',
        )}
      >
        {/* A minus sign (U+2212), not a hyphen — it aligns with the digits and
            reads as arithmetic rather than punctuation. */}
        {isIncome ? '+' : '−'}
        {format(transaction.amount)}
        <span className="sr-only"> {isIncome ? 'income' : isSaving ? 'saved' : 'spent'}</span>
      </p>
    </li>
  );
}
