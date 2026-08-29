import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { GoalDto } from '@savewise/shared';

import { Button } from '@/components/ui/Button';
import { Field, Input, MoneyInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { useContributeToGoal } from '@/hooks/useApiQueries';
import { useCurrency } from '@/hooks/useCurrency';
import { readMoney, requiredMoney, todayInput, writeMoney } from '@/lib/moneyField';
import { ApiError } from '@/services/api';
import { toast } from '@/store/toastStore';

/**
 * Record a contribution to a goal.
 *
 * The copy is careful throughout: *record*, not deposit; *set aside*, not
 * transfer. Savewise writes a ledger entry and moves a number — it does not
 * touch anyone's money, and the interface must never imply otherwise.
 */

const formSchema = z.object({
  amount: requiredMoney(),
  date: z.string().min(1, 'Choose a date'),
  note: z.string().trim().max(200, 'Keep the note under 200 characters'),
});

type FormValues = z.infer<typeof formSchema>;

interface ContributeModalProps {
  open: boolean;
  onClose: () => void;
  goal: GoalDto | null;
}

export function ContributeModal({ open, onClose, goal }: ContributeModalProps) {
  const { symbol, format } = useCurrency();
  const contribute = useContributeToGoal();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: '', date: todayInput(), note: '' },
  });

  // Pre-filled with the goal's own monthly amount — the overwhelmingly common
  // case is "I made this month's contribution".
  useEffect(() => {
    if (!open || !goal) return;
    reset({
      amount: writeMoney(goal.monthlyContribution),
      date: todayInput(),
      note: '',
    });
  }, [open, goal, reset]);

  const typedAmount = readMoney(watch('amount'));
  const projected = goal ? Math.min(goal.targetAmount, goal.currentAmount + typedAmount) : 0;
  const projectedPercent =
    goal && goal.targetAmount > 0 ? (projected / goal.targetAmount) * 100 : 0;

  async function onSubmit(values: FormValues) {
    if (!goal) return;
    const amount = readMoney(values.amount);

    try {
      const result = await contribute.mutateAsync({
        id: goal.id,
        input: {
          amount,
          date: new Date(values.date),
          note: values.note || null,
        },
      });

      if (result.milestoneReached === 100) {
        toast.success(`${goal.name} is fully funded`, 'Time to set the next one.');
      } else if (result.milestoneReached) {
        toast.success(`${goal.name} is ${result.milestoneReached}% funded`);
      } else {
        toast.success('Contribution recorded', `${format(amount)} added to ${goal.name}.`);
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
      setError('root', { message: 'Could not record that. Please try again.' });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? `Add to ${goal.name}` : 'Record contribution'}
      description="Records money you have set aside. Savewise does not move funds."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="contribute-form" loading={isSubmitting}>
            Record contribution
          </Button>
        </>
      }
    >
      <form id="contribute-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="Amount" error={errors.amount?.message} required>
          {(props) => (
            <MoneyInput
              {...props}
              {...register('amount')}
              symbol={symbol}
              placeholder="55,000"
              autoFocus
            />
          )}
        </Field>

        <Field label="Date" error={errors.date?.message} required>
          {(props) => <Input {...props} {...register('date')} type="date" max={todayInput()} />}
        </Field>

        <Field label="Note" error={errors.note?.message}>
          {(props) => <Input {...props} {...register('note')} placeholder="August contribution" />}
        </Field>

        {/* A live preview of where this lands the goal. Watching the bar move
            before committing is what makes the amount feel like a decision. */}
        {goal && typedAmount > 0 && (
          <div className="rounded-xl border border-border bg-surface-sunken/50 p-4">
            <p className="text-xs font-medium text-ink">After this contribution</p>

            <Progress
              value={projectedPercent}
              label="Projected progress"
              size="lg"
              className="mt-3"
              animate={false}
            />

            <p className="tabular mt-2 text-xs text-ink-muted">
              {format(projected)} of {format(goal.targetAmount)} · {Math.round(projectedPercent)}%
              funded
            </p>
          </div>
        )}

        {errors.root && (
          <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2.5 text-sm text-critical">
            {errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
