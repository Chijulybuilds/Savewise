import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  GOAL_CATEGORIES,
  GOAL_CATEGORY_KEYS,
  GOAL_PRIORITIES,
  type GoalDto,
} from '@savewise/shared';

import { Button } from '@/components/ui/Button';
import { Field, Input, MoneyInput, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useCurrency } from '@/hooks/useCurrency';
import { useCreateGoal, useUpdateGoal } from '@/hooks/useApiQueries';
import { optionalMoney, readMoney, requiredMoney, toDateInput, writeMoney } from '@/lib/moneyField';
import { ApiError } from '@/services/api';
import { toast } from '@/store/toastStore';

/**
 * Create and edit a goal.
 *
 * The form holds strings — that is what an input gives you — and converts to
 * minor units in one place on submit. See `lib/moneyField` for why the
 * conversion is explicit rather than a Zod transform.
 */

const formSchema = z
  .object({
    name: z.string().trim().min(2, 'Give your goal a name').max(80, 'That name is too long'),
    description: z.string().trim().max(500, 'Keep notes under 500 characters'),
    category: z.enum(GOAL_CATEGORY_KEYS),
    targetAmount: requiredMoney('target amount'),
    startingAmount: optionalMoney('starting amount'),
    monthlyContribution: optionalMoney('monthly contribution'),
    deadline: z.string(),
    priority: z.enum(GOAL_PRIORITIES),
  })
  .refine((data) => readMoney(data.startingAmount) <= readMoney(data.targetAmount), {
    message: 'Starting amount cannot be more than the target',
    path: ['startingAmount'],
  });

type FormValues = z.infer<typeof formSchema>;

const CATEGORY_OPTIONS = GOAL_CATEGORIES.map((category) => ({
  value: category.key,
  label: category.label,
}));

const PRIORITY_OPTIONS = GOAL_PRIORITIES.map((priority) => ({
  value: priority,
  label: priority.charAt(0).toUpperCase() + priority.slice(1),
}));

interface GoalFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Present when editing; absent when creating. */
  goal?: GoalDto | null;
}

export function GoalFormModal({ open, onClose, goal }: GoalFormModalProps) {
  const { symbol } = useCurrency();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const isEditing = Boolean(goal);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(),
  });

  // Repopulate whenever the dialog opens, so editing goal B after goal A does
  // not show A's figures.
  useEffect(() => {
    if (!open) return;
    reset(goal ? valuesFromGoal(goal) : emptyValues());
  }, [open, goal, reset]);

  async function onSubmit(values: FormValues) {
    const shared = {
      name: values.name,
      description: values.description || null,
      category: values.category,
      targetAmount: readMoney(values.targetAmount),
      monthlyContribution: readMoney(values.monthlyContribution),
      deadline: values.deadline ? new Date(values.deadline) : null,
      priority: values.priority,
    };

    try {
      if (goal) {
        await updateGoal.mutateAsync({ id: goal.id, input: shared });
        toast.success('Goal updated');
      } else {
        await createGoal.mutateAsync({
          ...shared,
          startingAmount: readMoney(values.startingAmount),
        });
        toast.success('Goal created', 'It will show up on your dashboard.');
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
      setError('root', { message: 'Could not save the goal. Please try again.' });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit goal' : 'New savings goal'}
      description={
        isEditing
          ? 'Adjust the target, the date or what you put in each month.'
          : 'Name it, price it, date it. Savewise works out the monthly amount.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="goal-form" loading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Create goal'}
          </Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="What are you saving for?" error={errors.name?.message} required>
          {(props) => (
            <Input {...props} {...register('name')} placeholder="Emergency fund" autoFocus />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" error={errors.category?.message} required>
            {(props) => <Select {...props} {...register('category')} options={CATEGORY_OPTIONS} />}
          </Field>

          <Field label="Priority" error={errors.priority?.message} required>
            {(props) => <Select {...props} {...register('priority')} options={PRIORITY_OPTIONS} />}
          </Field>
        </div>

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

        {!isEditing && (
          <Field
            label="Already saved"
            hint="Money you had set aside for this before today."
            error={errors.startingAmount?.message}
          >
            {(props) => (
              <MoneyInput
                {...props}
                {...register('startingAmount')}
                symbol={symbol}
                placeholder="0"
              />
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Monthly contribution"
            hint="What you intend to add each month."
            error={errors.monthlyContribution?.message}
          >
            {(props) => (
              <MoneyInput
                {...props}
                {...register('monthlyContribution')}
                symbol={symbol}
                placeholder="55,000"
              />
            )}
          </Field>

          <Field
            label="Target date"
            hint="Used to work out the monthly amount."
            error={errors.deadline?.message}
          >
            {(props) => <Input {...props} {...register('deadline')} type="date" />}
          </Field>
        </div>

        <Field label="Notes" error={errors.description?.message}>
          {(props) => (
            <Textarea
              {...props}
              {...register('description')}
              placeholder="Three months of essential expenses, kept liquid."
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
    name: '',
    description: '',
    category: 'emergency',
    targetAmount: '',
    startingAmount: '',
    monthlyContribution: '',
    deadline: '',
    priority: 'medium',
  };
}

function valuesFromGoal(goal: GoalDto): FormValues {
  return {
    name: goal.name,
    description: goal.description ?? '',
    category: goal.category,
    targetAmount: writeMoney(goal.targetAmount),
    startingAmount: '',
    monthlyContribution: writeMoney(goal.monthlyContribution),
    deadline: toDateInput(goal.deadline),
    priority: goal.priority,
  };
}
