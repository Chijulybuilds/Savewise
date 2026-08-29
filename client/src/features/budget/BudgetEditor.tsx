import { useEffect, useMemo, useState } from 'react';

import {
  EXPENSE_CATEGORIES,
  categoryBucket,
  formatMonthKey,
  sumMinor,
  type BudgetDto,
  type ExpenseCategoryKey,
  type MonthKey,
} from '@savewise/shared';

import { Button } from '@/components/ui/Button';
import { Field, MoneyInput, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { SegmentedProgress } from '@/components/ui/Progress';
import { useCreateBudget, useUpdateBudget } from '@/hooks/useApiQueries';
import { useCurrency } from '@/hooks/useCurrency';
import { readMoney, writeMoney } from '@/lib/moneyField';
import { cn } from '@/lib/cn';
import { ApiError } from '@/services/api';
import { toast } from '@/store/toastStore';

/**
 * Budget editor.
 *
 * Fifteen money inputs is a lot of form, so this is deliberately *not* built
 * with React Hook Form: the state is a flat `{ category: string }` map, which
 * is simpler to reason about than fifteen registered fields, and lets the
 * allocation summary recompute on every keystroke without a re-registration
 * dance.
 *
 * The running allocation bar at the top is the point of the screen. A budget is
 * only meaningful relative to income, and seeing "₦40,000 unallocated" shrink
 * as you type is what turns a form into a planning tool.
 */

interface BudgetEditorProps {
  open: boolean;
  onClose: () => void;
  month: MonthKey;
  /** Present when editing an existing budget. */
  budget?: BudgetDto | null;
  /** Pre-fills planned income for a first-time budget. */
  suggestedIncome?: number;
}

type CategoryDraft = Partial<Record<ExpenseCategoryKey, string>>;

export function BudgetEditor({
  open,
  onClose,
  month,
  budget,
  suggestedIncome = 0,
}: BudgetEditorProps) {
  const { symbol, format } = useCurrency();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  const [plannedIncome, setPlannedIncome] = useState('');
  const [plannedSavings, setPlannedSavings] = useState('');
  const [categories, setCategories] = useState<CategoryDraft>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (budget) {
      setPlannedIncome(writeMoney(budget.plannedIncome));
      setPlannedSavings(writeMoney(budget.plannedSavings));
      setNotes(budget.notes ?? '');
      setCategories(
        Object.fromEntries(
          budget.categories
            .filter((line) => line.budgeted > 0)
            .map((line) => [line.category, writeMoney(line.budgeted)]),
        ),
      );
    } else {
      setPlannedIncome(writeMoney(suggestedIncome));
      setPlannedSavings('');
      setNotes('');
      setCategories({});
    }
  }, [open, budget, suggestedIncome]);

  const income = readMoney(plannedIncome);
  const savings = readMoney(plannedSavings);

  const categoryTotal = useMemo(
    () => sumMinor(Object.values(categories).map((value) => readMoney(value))),
    [categories],
  );

  const allocated = savings + categoryTotal;
  const unallocated = income - allocated;
  const overAllocated = unallocated < 0;

  async function handleSave() {
    setError(null);

    if (income <= 0) {
      setError('Enter the income you expect this month.');
      return;
    }
    if (savings > income) {
      setError('Planned savings cannot be more than planned income.');
      return;
    }

    const lines = Object.entries(categories)
      .map(([category, value]) => ({
        category: category as ExpenseCategoryKey,
        budgeted: readMoney(value),
      }))
      .filter((line) => line.budgeted > 0);

    setSaving(true);
    try {
      if (budget) {
        await updateBudget.mutateAsync({
          id: budget.id,
          input: {
            plannedIncome: income,
            plannedSavings: savings,
            categories: lines,
            notes: notes || null,
          },
        });
        toast.success('Budget updated');
      } else {
        await createBudget.mutateAsync({
          month,
          plannedIncome: income,
          plannedSavings: savings,
          categories: lines,
          notes: notes || null,
        });
        toast.success(`Budget created for ${formatMonthKey(month)}`);
      }
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not save the budget. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        budget ? `Edit ${formatMonthKey(month)} budget` : `Budget for ${formatMonthKey(month)}`
      }
      description="Savings first, then give what is left a job."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} loading={saving}>
            {budget ? 'Save budget' : 'Create budget'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Income you expect" required>
            {(props) => (
              <MoneyInput
                {...props}
                symbol={symbol}
                value={plannedIncome}
                onChange={(event) => setPlannedIncome(event.target.value)}
                placeholder="520,000"
                autoFocus
              />
            )}
          </Field>

          <Field label="Save first" hint="Set aside before anything else is allocated.">
            {(props) => (
              <MoneyInput
                {...props}
                symbol={symbol}
                value={plannedSavings}
                onChange={(event) => setPlannedSavings(event.target.value)}
                placeholder="120,000"
              />
            )}
          </Field>
        </div>

        {/* The running allocation. Sticky so it stays visible while working
            down a long list of categories. */}
        <div
          className={cn(
            'sticky top-0 z-10 rounded-xl border bg-surface p-4',
            overAllocated ? 'border-critical/40' : 'border-border',
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-ink">
              {overAllocated ? 'Over-allocated' : 'Left to allocate'}
            </p>
            <p
              className={cn(
                'tabular text-lg font-semibold',
                overAllocated ? 'text-critical' : unallocated === 0 ? 'text-positive' : 'text-ink',
              )}
            >
              {format(Math.abs(unallocated))}
            </p>
          </div>

          <SegmentedProgress
            className="mt-3"
            label="Income allocation"
            segments={[
              { value: savings, tone: 'accent', label: 'Savings' },
              { value: categoryTotal, tone: 'primary', label: 'Categories' },
              { value: Math.max(0, unallocated), tone: 'neutral', label: 'Unallocated' },
            ]}
          />

          <p className="tabular mt-2 text-2xs text-ink-subtle">
            {format(allocated)} of {format(income)} allocated
          </p>
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-ink">Category limits</legend>

          <div className="grid gap-3 sm:grid-cols-2">
            {EXPENSE_CATEGORIES.filter((category) => category.key !== 'savings').map((category) => (
              <label key={category.key} className="block">
                <span className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{category.label}</span>
                  <span className="text-2xs uppercase tracking-wide text-ink-subtle">
                    {categoryBucket(category.key)}
                  </span>
                </span>

                <MoneyInput
                  symbol={symbol}
                  value={categories[category.key] ?? ''}
                  onChange={(event) =>
                    setCategories((current) => ({ ...current, [category.key]: event.target.value }))
                  }
                  placeholder="0"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Notes">
          {(props) => (
            <Textarea
              {...props}
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Trimmed dining after last month."
            />
          )}
        </Field>

        {error && (
          <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2.5 text-sm text-critical">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
