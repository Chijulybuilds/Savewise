import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  TRANSACTION_TYPES,
  categoriesForType,
  type TransactionDto,
  type TransactionType,
} from '@savewise/shared';

import { Button } from '@/components/ui/Button';
import { Field, Input, MoneyInput, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useApiQueries';
import { useCurrency } from '@/hooks/useCurrency';
import { readMoney, requiredMoney, toDateInput, todayInput, writeMoney } from '@/lib/moneyField';
import { cn } from '@/lib/cn';
import { ApiError } from '@/services/api';
import { toast } from '@/store/toastStore';

/**
 * Add or edit a transaction.
 *
 * The type selector is a segmented control rather than a dropdown: there are
 * exactly three options, it is the field that changes what every other field
 * means, and it deserves to be visible rather than collapsed.
 *
 * Changing the type re-scopes the category list — `categoriesForType` is the
 * same function the API validates against, so the UI cannot offer a
 * combination the server will reject.
 */

const formSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: requiredMoney(),
  category: z.string().min(1, 'Choose a category'),
  description: z
    .string()
    .trim()
    .min(1, 'Describe this transaction')
    .max(140, 'Keep it under 140 characters'),
  date: z.string().min(1, 'Choose a date'),
  notes: z.string().trim().max(500, 'Keep notes under 500 characters'),
});

type FormValues = z.infer<typeof formSchema>;

const TYPE_OPTIONS: { value: TransactionType; label: string; hint: string }[] = [
  { value: 'expense', label: 'Spent', hint: 'Money that left' },
  { value: 'income', label: 'Earned', hint: 'Money that arrived' },
  { value: 'saving', label: 'Saved', hint: 'Money set aside' },
];

interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  transaction?: TransactionDto | null;
}

export function TransactionFormModal({ open, onClose, transaction }: TransactionFormModalProps) {
  const { symbol } = useCurrency();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const isEditing = Boolean(transaction);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(),
  });

  const type = watch('type');
  const category = watch('category');

  const categoryOptions = useMemo(
    () => categoriesForType(type).map((entry) => ({ value: entry.key, label: entry.label })),
    [type],
  );

  useEffect(() => {
    if (!open) return;
    reset(transaction ? valuesFromTransaction(transaction) : emptyValues());
  }, [open, transaction, reset]);

  // Switching from an expense to income leaves "Food" selected, which the API
  // would reject. Snap to the first valid category instead of failing on submit.
  useEffect(() => {
    if (!open) return;
    if (categoryOptions.some((option) => option.value === category)) return;
    const fallback = categoryOptions[0]?.value;
    if (fallback) setValue('category', fallback, { shouldValidate: false });
  }, [open, categoryOptions, category, setValue]);

  async function onSubmit(values: FormValues) {
    const payload = {
      type: values.type,
      amount: readMoney(values.amount),
      category: values.category as never,
      description: values.description,
      date: new Date(values.date),
      notes: values.notes || null,
    };

    try {
      if (transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, input: payload });
        toast.success('Transaction updated');
      } else {
        await createTransaction.mutateAsync(payload);
        toast.success('Transaction added');
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = error.fieldErrors;
        if (Object.keys(fields).length > 0) {
          for (const [field, message] of Object.entries(fields)) {
            setError(field as keyof FormValues, { message });
          }
        } else {
          setError('root', { message: error.message });
        }
        return;
      }
      setError('root', { message: 'Could not save that. Please try again.' });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit transaction' : 'Add a transaction'}
      description={
        isEditing
          ? 'Correct the amount, category or date.'
          : 'Record what came in, what went out, or what you set aside.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="transaction-form" loading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form
        id="transaction-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5"
      >
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-ink">Type</legend>

          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Transaction type">
            {TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer flex-col items-start rounded-xl border px-3 py-2.5 transition-colors',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                  type === option.value
                    ? 'border-primary bg-primary-soft'
                    : 'border-border hover:border-border-strong',
                )}
              >
                {/* A real radio input, visually hidden — arrow-key navigation
                    and screen-reader semantics come from the platform. */}
                <input
                  type="radio"
                  value={option.value}
                  {...register('type')}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    type === option.value ? 'text-primary' : 'text-ink',
                  )}
                >
                  {option.label}
                </span>
                <span className="mt-0.5 text-2xs text-ink-subtle">{option.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Amount" error={errors.amount?.message} required>
          {(props) => (
            <MoneyInput
              {...props}
              {...register('amount')}
              symbol={symbol}
              placeholder="25,000"
              autoFocus
            />
          )}
        </Field>

        <Field label="Description" error={errors.description?.message} required>
          {(props) => (
            <Input {...props} {...register('description')} placeholder="Market shopping" />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" error={errors.category?.message} required>
            {(props) => <Select {...props} {...register('category')} options={categoryOptions} />}
          </Field>

          <Field label="Date" error={errors.date?.message} required>
            {(props) => <Input {...props} {...register('date')} type="date" />}
          </Field>
        </div>

        <Field label="Notes" error={errors.notes?.message}>
          {(props) => (
            <Textarea
              {...props}
              {...register('notes')}
              rows={2}
              placeholder="Anything worth remembering"
            />
          )}
        </Field>

        {errors.root && (
          <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2.5 text-sm text-critical">
            {errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}

function emptyValues(): FormValues {
  return {
    type: 'expense',
    amount: '',
    category: 'food',
    description: '',
    date: todayInput(),
    notes: '',
  };
}

function valuesFromTransaction(transaction: TransactionDto): FormValues {
  return {
    type: transaction.type,
    amount: writeMoney(transaction.amount),
    category: transaction.category,
    description: transaction.description,
    date: toDateInput(transaction.date),
    notes: transaction.notes ?? '',
  };
}
