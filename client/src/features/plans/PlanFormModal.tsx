import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  CONTRIBUTIONS_PER_MONTH,
  FREQUENCY_LABELS,
  PLAN_FREQUENCIES,
  type PlanDto,
} from '@savewise/shared';

import { Button } from '@/components/ui/Button';
import { Field, Input, MoneyInput, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useCreatePlan, useGoals, useUpdatePlan } from '@/hooks/useApiQueries';
import { useCurrency } from '@/hooks/useCurrency';
import { readMoney, requiredMoney, toDateInput, todayInput, writeMoney } from '@/lib/moneyField';
import { ApiError } from '@/services/api';
import { toast } from '@/store/toastStore';

/**
 * Create and edit a savings plan.
 *
 * A live projection sits under the form: contribution × frequency, how many
 * contributions remain, and roughly when the target lands. Showing the
 * consequence of the numbers while they are still being typed is what makes
 * "₦50,000 monthly" a decision rather than a guess.
 */

const formSchema = z.object({
  name: z.string().trim().min(2, 'Give your plan a name').max(80, 'That name is too long'),
  goalId: z.string(),
  targetAmount: requiredMoney('target amount'),
  contributionAmount: requiredMoney('contribution amount'),
  frequency: z.enum(PLAN_FREQUENCIES),
  startDate: z.string().min(1, 'Choose a start date'),
});

type FormValues = z.infer<typeof formSchema>;

const FREQUENCY_OPTIONS = PLAN_FREQUENCIES.map((frequency) => ({
  value: frequency,
  label: FREQUENCY_LABELS[frequency],
}));

interface PlanFormModalProps {
  open: boolean;
  onClose: () => void;
  plan?: PlanDto | null;
}

export function PlanFormModal({ open, onClose, plan }: PlanFormModalProps) {
  const { symbol, format } = useCurrency();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const { data: goalData } = useGoals({ status: 'active' });
  const isEditing = Boolean(plan);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    if (!open) return;
    reset(plan ? valuesFromPlan(plan) : emptyValues());
  }, [open, plan, reset]);

  const goalOptions = useMemo(
    () => [
      { value: '', label: 'Not linked to a goal' },
      ...(goalData?.goals ?? []).map((goal) => ({ value: goal.id, label: goal.name })),
    ],
    [goalData],
  );

  const target = readMoney(watch('targetAmount'));
  const contribution = readMoney(watch('contributionAmount'));
  const frequency = watch('frequency');

  const projection = useMemo(() => {
    if (target <= 0 || contribution <= 0) return null;
    const contributions = Math.ceil(target / contribution);
    const months = contributions / CONTRIBUTIONS_PER_MONTH[frequency];
    return {
      contributions,
      months: Math.ceil(months),
      monthlyEquivalent: Math.round(contribution * CONTRIBUTIONS_PER_MONTH[frequency]),
    };
  }, [target, contribution, frequency]);

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      goalId: values.goalId || null,
      targetAmount: readMoney(values.targetAmount),
      contributionAmount: readMoney(values.contributionAmount),
      frequency: values.frequency,
      startDate: new Date(values.startDate),
    };

    try {
      if (plan) {
        await updatePlan.mutateAsync({ id: plan.id, input: payload });
        toast.success('Plan updated');
      } else {
        await createPlan.mutateAsync(payload);
        toast.success('Plan created', 'Record each contribution as you make it.');
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
      setError('root', { message: 'Could not save the plan. Please try again.' });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit savings plan' : 'New savings plan'}
      description="A schedule and a projection. Savewise does not move money — you record each contribution."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="plan-form" loading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Create plan'}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="Plan name" error={errors.name?.message} required>
          {(props) => (
            <Input {...props} {...register('name')} placeholder="Emergency fund top-up" autoFocus />
          )}
        </Field>

        <Field
          label="Linked goal"
          hint="Contributions you record will credit this goal too."
          error={errors.goalId?.message}
        >
          {(props) => <Select {...props} {...register('goalId')} options={goalOptions} />}
        </Field>

        <Field label="Target amount" error={errors.targetAmount?.message} required>
          {(props) => (
            <MoneyInput
              {...props}
              {...register('targetAmount')}
              symbol={symbol}
              placeholder="1,200,000"
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Each contribution" error={errors.contributionAmount?.message} required>
            {(props) => (
              <MoneyInput
                {...props}
                {...register('contributionAmount')}
                symbol={symbol}
                placeholder="55,000"
              />
            )}
          </Field>

          <Field label="How often" error={errors.frequency?.message} required>
            {(props) => (
              <Select {...props} {...register('frequency')} options={FREQUENCY_OPTIONS} />
            )}
          </Field>
        </div>

        <Field label="Starting from" error={errors.startDate?.message} required>
          {(props) => <Input {...props} {...register('startDate')} type="date" />}
        </Field>

        {projection && (
          <div className="rounded-xl border border-border bg-surface-sunken/50 p-4">
            <p className="text-xs font-medium text-ink">If you keep this up</p>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <dt className="text-ink-subtle">Contributions</dt>
                <dd className="tabular mt-0.5 font-medium text-ink">{projection.contributions}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Roughly</dt>
                <dd className="tabular mt-0.5 font-medium text-ink">
                  {projection.months} month{projection.months === 1 ? '' : 's'}
                </dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Per month</dt>
                <dd className="tabular mt-0.5 font-medium text-primary">
                  {format(projection.monthlyEquivalent)}
                </dd>
              </div>
            </dl>
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

function emptyValues(): FormValues {
  return {
    name: '',
    goalId: '',
    targetAmount: '',
    contributionAmount: '',
    frequency: 'monthly',
    startDate: todayInput(),
  };
}

function valuesFromPlan(plan: PlanDto): FormValues {
  return {
    name: plan.name,
    goalId: plan.goalId ?? '',
    targetAmount: writeMoney(plan.targetAmount),
    contributionAmount: writeMoney(plan.contributionAmount),
    frequency: plan.frequency,
    startDate: toDateInput(plan.startDate),
  };
}
