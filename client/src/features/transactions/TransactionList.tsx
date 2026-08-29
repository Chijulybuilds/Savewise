import { categoryLabel, formatDate, type TransactionDto } from '@savewise/shared';

import { Badge } from '@/components/ui/Badge';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { cn } from '@/lib/cn';
import { useCurrency } from '@/hooks/useCurrency';

/**
 * The transaction ledger.
 *
 * Two renderings of the same data rather than one squeezed layout: a table from
 * `md` up, where columns genuinely help scanning, and a card list below it. A
 * six-column table on a 375px screen is either an unusable horizontal scroll or
 * three words per cell — neither is a design.
 *
 * The table carries a `<caption>` and proper `scope` attributes, so a screen
 * reader announces "Category, Food" rather than reading six unlabelled cells.
 */

interface TransactionListProps {
  transactions: TransactionDto[];
  onEdit: (transaction: TransactionDto) => void;
  onDelete: (transaction: TransactionDto) => void;
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Your transactions, most recent first</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <Th>Description</Th>
              <Th>Category</Th>
              <Th>Date</Th>
              <Th className="text-right">Amount</Th>
              <th scope="col" className="w-12 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {transactions.map((transaction) => (
              <Row
                key={transaction.id}
                transaction={transaction}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {transactions.map((transaction) => (
          <MobileCard
            key={transaction.id}
            transaction={transaction}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn('px-4 py-3 text-xs font-medium text-ink-subtle', className)}>
      {children}
    </th>
  );
}

function Row({
  transaction,
  onEdit,
  onDelete,
}: { transaction: TransactionDto } & Pick<TransactionListProps, 'onEdit' | 'onDelete'>) {
  const { format } = useCurrency();
  const isIncome = transaction.type === 'income';
  const isSaving = transaction.type === 'saving';

  return (
    <tr className="transition-colors hover:bg-surface-sunken/50">
      <td className="px-4 py-3">
        <p className="font-medium text-ink">{transaction.description}</p>
        {transaction.notes && (
          <p className="mt-0.5 max-w-md truncate text-xs text-ink-subtle">{transaction.notes}</p>
        )}
      </td>

      <td className="px-4 py-3">
        <Badge tone={isIncome ? 'positive' : isSaving ? 'primary' : 'neutral'}>
          {transaction.goalName ?? categoryLabel(transaction.category)}
        </Badge>
      </td>

      <td className="tabular whitespace-nowrap px-4 py-3 text-ink-muted">
        {formatDate(transaction.date)}
      </td>

      <td
        className={cn(
          'tabular whitespace-nowrap px-4 py-3 text-right font-medium',
          isIncome ? 'text-positive' : isSaving ? 'text-primary' : 'text-ink',
        )}
      >
        {isIncome ? '+' : '−'}
        {format(transaction.amount)}
      </td>

      <td className="px-4 py-3">
        <RowMenu transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
}

function MobileCard({
  transaction,
  onEdit,
  onDelete,
}: { transaction: TransactionDto } & Pick<TransactionListProps, 'onEdit' | 'onDelete'>) {
  const { format } = useCurrency();
  const isIncome = transaction.type === 'income';
  const isSaving = transaction.type === 'saving';

  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{transaction.description}</p>
          <p className="mt-0.5 text-xs text-ink-subtle">
            {transaction.goalName ?? categoryLabel(transaction.category)} ·{' '}
            {formatDate(transaction.date, 'short')}
          </p>
        </div>

        <div className="flex shrink-0 items-start gap-1">
          <span
            className={cn(
              'tabular text-sm font-medium',
              isIncome ? 'text-positive' : isSaving ? 'text-primary' : 'text-ink',
            )}
          >
            {isIncome ? '+' : '−'}
            {format(transaction.amount)}
          </span>
          <RowMenu transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </li>
  );
}

function RowMenu({
  transaction,
  onEdit,
  onDelete,
}: { transaction: TransactionDto } & Pick<TransactionListProps, 'onEdit' | 'onDelete'>) {
  // Contributions are written alongside a goal balance change, so editing one
  // here in isolation would desynchronise the two. The API refuses; the UI says
  // why rather than letting the user discover it through an error.
  const isLinked = transaction.goalId !== null;

  return (
    <Dropdown
      label={`Actions for ${transaction.description}`}
      trigger={({ toggle, ref, open }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`Actions for ${transaction.description}`}
          className="-mr-1 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="3.5" r="1.3" />
            <circle cx="8" cy="8" r="1.3" />
            <circle cx="8" cy="12.5" r="1.3" />
          </svg>
        </button>
      )}
    >
      {({ close }) => (
        <>
          {isLinked && (
            <p className="px-2.5 py-2 text-2xs leading-relaxed text-ink-subtle">
              Created by a goal contribution. Adjust it from the goal it belongs to.
            </p>
          )}

          <DropdownItem
            disabled={isLinked}
            onSelect={() => {
              close();
              onEdit(transaction);
            }}
          >
            Edit
          </DropdownItem>

          <DropdownSeparator />

          <DropdownItem
            destructive
            onSelect={() => {
              close();
              onDelete(transaction);
            }}
          >
            Delete
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}
