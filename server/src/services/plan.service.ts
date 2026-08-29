import {
  formatMoney,
  FREQUENCY_LABELS,
  type CreatePlanInput,
  type PlanDto,
  type PlanQuery,
  type RecordPlanContributionInput,
  type UpdatePlanInput,
} from '@savewise/shared';

import { SavingsGoal } from '../models/SavingsGoal.js';
import { SavingsPlan, type SavingsPlanDocument } from '../models/SavingsPlan.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { contribute } from './goal.service.js';
import { toPlanDto } from './mappers.js';
import { createTransaction } from './transaction.service.js';
import { notify } from './notification.service.js';

/**
 * Recurring savings plans.
 *
 * A plan is a schedule and a projection — Savewise moves no money and holds no
 * funds. Recording a contribution is an explicit user action; when the plan is
 * attached to a goal it is routed through the goal service so the goal balance,
 * the ledger and the plan's own progress all advance together.
 */

export async function listPlans(userId: string, query: PlanQuery): Promise<PlanDto[]> {
  const filter: Record<string, unknown> = { userId };
  if (query.status) filter.status = query.status;

  const plans = await SavingsPlan.find(filter)
    .sort({ status: 1, createdAt: -1 })
    .populate<{ goalId: { name: string } | null }>('goalId', 'name')
    .exec();

  const now = new Date();
  return plans.map((plan) => {
    const populated = plan.goalId as unknown as { name?: string } | null;
    return toPlanDto(
      plan as unknown as SavingsPlanDocument,
      populated && typeof populated.name === 'string' ? populated.name : null,
      now,
    );
  });
}

export async function getPlan(userId: string, id: string): Promise<PlanDto> {
  const plan = await findOwnedPlan(userId, id);
  return toPlanDto(plan, await goalNameFor(userId, plan));
}

export async function createPlan(userId: string, input: CreatePlanInput): Promise<PlanDto> {
  // A plan may only reference a goal the same user owns — the check is on the
  // authenticated id, so a borrowed goal id from another account fails here.
  if (input.goalId) await assertGoalOwnership(userId, input.goalId);

  const plan = await SavingsPlan.create({
    userId,
    name: input.name,
    goalId: input.goalId ?? null,
    targetAmount: input.targetAmount,
    contributionAmount: input.contributionAmount,
    contributedAmount: 0,
    frequency: input.frequency,
    startDate: input.startDate,
    status: 'active',
  });

  const currency = await currencyFor(userId);
  await notify({
    userId,
    type: 'plan_created',
    title: `${plan.name} plan created`,
    body: `${formatMoney(plan.contributionAmount, currency)} · ${FREQUENCY_LABELS[plan.frequency].toLowerCase()}`,
    href: '/plans',
  });

  return toPlanDto(plan, await goalNameFor(userId, plan));
}

export async function updatePlan(
  userId: string,
  id: string,
  input: UpdatePlanInput,
): Promise<PlanDto> {
  const plan = await findOwnedPlan(userId, id);

  if (input.goalId) await assertGoalOwnership(userId, input.goalId);

  if (input.targetAmount !== undefined && input.targetAmount < plan.contributedAmount) {
    throw AppError.unprocessable(
      'The target cannot be lower than what you have already contributed',
      {
        targetAmount: ['The target cannot be lower than what you have already contributed'],
      },
    );
  }

  if (input.name !== undefined) plan.name = input.name;
  if (input.goalId !== undefined) plan.goalId = input.goalId as never;
  if (input.targetAmount !== undefined) plan.targetAmount = input.targetAmount;
  if (input.contributionAmount !== undefined) plan.contributionAmount = input.contributionAmount;
  if (input.frequency !== undefined) plan.frequency = input.frequency;
  if (input.startDate !== undefined) plan.startDate = input.startDate;
  if (input.status !== undefined) {
    // `completed` is excluded by the schema — it is reached by contributing,
    // not by declaring it — so any status set here reopens the plan.
    plan.status = input.status;
    plan.completedAt = null;
  }

  await plan.save();
  return toPlanDto(plan, await goalNameFor(userId, plan));
}

export async function deletePlan(userId: string, id: string): Promise<void> {
  const result = await SavingsPlan.deleteOne({ _id: id, userId }).exec();
  if (result.deletedCount === 0) throw AppError.notFound('Savings plan');
}

/**
 * Record that a scheduled contribution actually happened.
 *
 * When the plan is linked to a goal the write is delegated to `contribute`,
 * which owns the goal-balance-plus-ledger invariant. Otherwise a standalone
 * `saving` transaction is written so the contribution still shows up in the
 * user's savings rate and analytics.
 */
export async function recordContribution(
  userId: string,
  id: string,
  input: RecordPlanContributionInput,
): Promise<PlanDto> {
  const plan = await findOwnedPlan(userId, id);

  if (plan.status === 'completed') throw AppError.unprocessable('That plan is already complete');
  if (plan.status === 'cancelled') throw AppError.unprocessable('That plan has been cancelled');
  if (plan.status === 'paused')
    throw AppError.unprocessable('Resume the plan before recording a contribution');

  const amount = input.amount ?? plan.contributionAmount;
  const date = input.date ?? new Date();

  if (plan.goalId) {
    await contribute(userId, plan.goalId.toString(), { amount, date });
  } else {
    await createTransaction(userId, {
      type: 'saving',
      amount,
      category: 'savings',
      description: `${plan.name} contribution`,
      date,
      notes: null,
    });
  }

  plan.contributedAmount += amount;
  plan.lastContributionAt = date;

  if (plan.contributedAmount >= plan.targetAmount) {
    plan.status = 'completed';
    plan.completedAt = new Date();
  }

  await plan.save();
  return toPlanDto(plan, await goalNameFor(userId, plan));
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                   */
/* -------------------------------------------------------------------------- */

async function findOwnedPlan(userId: string, id: string): Promise<SavingsPlanDocument> {
  const plan = await SavingsPlan.findOne({ _id: id, userId }).exec();
  if (!plan) throw AppError.notFound('Savings plan');
  return plan;
}

async function assertGoalOwnership(userId: string, goalId: string): Promise<void> {
  const exists = await SavingsGoal.exists({ _id: goalId, userId }).exec();
  if (!exists) throw AppError.notFound('Goal');
}

async function goalNameFor(userId: string, plan: SavingsPlanDocument): Promise<string | null> {
  if (!plan.goalId) return null;
  const goal = await SavingsGoal.findOne({ _id: plan.goalId, userId }).select('name').lean().exec();
  return goal?.name ?? null;
}

async function currencyFor(userId: string) {
  const user = await User.findById(userId).select('currency').lean().exec();
  return user?.currency ?? 'NGN';
}
