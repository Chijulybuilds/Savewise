import {
  calculatePercentage,
  goalCategoryLabel,
  sumMinor,
  type ContributeInput,
  type ContributionResultDto,
  type CreateGoalInput,
  type GoalDto,
  type GoalListDto,
  type GoalQuery,
  type GoalsOverviewDto,
  type UpdateGoalInput,
  formatMoney,
} from '@savewise/shared';

import { logger } from '../config/logger.js';
import { SavingsGoal, type SavingsGoalDocument } from '../models/SavingsGoal.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { toGoalDto, toTransactionDto } from './mappers.js';
import { notify } from './notification.service.js';

/**
 * Savings goals.
 *
 * The interesting problem here is keeping a goal's balance and the transaction
 * ledger in agreement. See `contribute` for how that is handled without
 * requiring a replica set.
 */

const MILESTONES = [25, 50, 75, 100] as const;

export async function listGoals(userId: string, query: GoalQuery): Promise<GoalListDto> {
  const filter: Record<string, unknown> = { userId };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;

  const goals = await SavingsGoal.find(filter)
    .sort({ status: 1, priority: -1, createdAt: -1 })
    .exec();

  const now = new Date();
  return {
    goals: goals.map((goal) => toGoalDto(goal, now)),
    overview: buildOverview(goals),
  };
}

export async function getGoal(userId: string, id: string): Promise<GoalDto> {
  return toGoalDto(await findOwnedGoal(userId, id));
}

export async function createGoal(userId: string, input: CreateGoalInput): Promise<GoalDto> {
  const goal = await SavingsGoal.create({
    userId,
    name: input.name,
    description: input.description ?? null,
    category: input.category,
    targetAmount: input.targetAmount,
    // An opening balance is honoured, but it is money the user already had —
    // it is not written to the ledger as new savings activity.
    currentAmount: Math.min(input.startingAmount, input.targetAmount),
    monthlyContribution: input.monthlyContribution,
    deadline: input.deadline ?? null,
    priority: input.priority,
    status: 'active',
    lastMilestone: 0,
  });

  await notify({
    userId,
    type: 'goal_created',
    title: `${goal.name} is underway`,
    body: `Target ${formatMoney(goal.targetAmount, await currencyFor(userId))} · ${goalCategoryLabel(goal.category)}`,
    href: `/goals`,
  });

  return toGoalDto(goal);
}

export async function updateGoal(
  userId: string,
  id: string,
  input: UpdateGoalInput,
): Promise<GoalDto> {
  const goal = await findOwnedGoal(userId, id);

  if (input.targetAmount !== undefined && input.targetAmount < goal.currentAmount) {
    throw AppError.unprocessable('The target cannot be lower than what you have already saved', {
      targetAmount: ['The target cannot be lower than what you have already saved'],
    });
  }

  // Explicit field-by-field assignment. Spreading the input would let any future
  // schema field become client-settable the moment it is added.
  if (input.name !== undefined) goal.name = input.name;
  if (input.description !== undefined) goal.description = input.description;
  if (input.category !== undefined) goal.category = input.category;
  if (input.targetAmount !== undefined) goal.targetAmount = input.targetAmount;
  if (input.monthlyContribution !== undefined) goal.monthlyContribution = input.monthlyContribution;
  if (input.deadline !== undefined) goal.deadline = input.deadline;
  if (input.priority !== undefined) goal.priority = input.priority;
  if (input.status !== undefined) {
    // The schema excludes `completed` — that state is reached by funding the
    // goal, never by asserting it — so any status set here reopens the goal.
    goal.status = input.status;
    goal.completedAt = null;
  }

  // Raising the target after completion reopens the goal.
  if (goal.status === 'completed' && goal.currentAmount < goal.targetAmount) {
    goal.status = 'active';
    goal.completedAt = null;
  }

  await goal.save();
  return toGoalDto(goal);
}

export async function deleteGoal(userId: string, id: string): Promise<void> {
  const goal = await findOwnedGoal(userId, id);

  // The contribution history stays: those savings really happened, and deleting
  // them would silently rewrite the user's savings rate for past months. The
  // rows are simply detached from the goal that no longer exists.
  await Transaction.updateMany({ userId, goalId: goal._id }, { $set: { goalId: null } }).exec();
  await goal.deleteOne();
}

/**
 * Record a contribution to a goal.
 *
 * This touches two documents — the goal balance and a new ledger row — and they
 * must not diverge. MongoDB multi-document transactions require a replica set,
 * which a single-node development deployment is not, so instead of assuming an
 * unavailable primitive we order the writes so that each individual step is
 * atomic and any failure is compensated:
 *
 *   1. `$inc` the goal balance — a single-document update, atomic under
 *      concurrency, so two simultaneous contributions cannot lose one another.
 *   2. Insert the ledger row.
 *   3. If step 2 fails, reverse step 1.
 *
 * The remaining risk is a process crash between 1 and 2, which would overstate
 * a goal by one contribution. That is recoverable (the ledger is the source of
 * truth and can rebuild the balance) and is a deliberate, documented trade-off
 * rather than an oversight.
 */
export async function contribute(
  userId: string,
  goalId: string,
  input: ContributeInput,
): Promise<ContributionResultDto> {
  const goal = await findOwnedGoal(userId, goalId);

  if (goal.status === 'completed') {
    throw AppError.unprocessable('That goal is already complete');
  }
  if (goal.status === 'archived') {
    throw AppError.unprocessable('That goal is archived. Reactivate it to keep contributing.');
  }

  const previousPercent = calculatePercentage(goal.currentAmount, goal.targetAmount);

  const updated = await SavingsGoal.findOneAndUpdate(
    { _id: goal._id, userId },
    { $inc: { currentAmount: input.amount } },
    { new: true },
  ).exec();

  if (!updated) throw AppError.notFound('Goal');

  let transaction;
  try {
    transaction = await Transaction.create({
      userId,
      type: 'saving',
      amount: input.amount,
      category: 'savings',
      description: `Contribution to ${goal.name}`,
      date: input.date ?? new Date(),
      notes: input.note ?? null,
      goalId: goal._id,
    });
  } catch (error) {
    await SavingsGoal.updateOne(
      { _id: goal._id, userId },
      { $inc: { currentAmount: -input.amount } },
    ).exec();
    logger.error({ err: error, userId, goalId }, 'Contribution rolled back — ledger write failed');
    throw error;
  }

  const newPercent = calculatePercentage(updated.currentAmount, updated.targetAmount);
  const milestone = crossedMilestone(previousPercent, newPercent, updated.lastMilestone);

  if (updated.currentAmount >= updated.targetAmount && updated.status !== 'completed') {
    updated.status = 'completed';
    updated.completedAt = new Date();
  }
  if (milestone) updated.lastMilestone = milestone;
  if (updated.isModified()) await updated.save();

  if (milestone) {
    await notify({
      userId,
      type: milestone === 100 ? 'goal_completed' : 'goal_milestone',
      title:
        milestone === 100
          ? `${updated.name} is fully funded`
          : `${updated.name} is ${milestone}% funded`,
      body:
        milestone === 100
          ? 'You reached the target. Time to set the next one.'
          : `${formatMoney(updated.currentAmount, await currencyFor(userId))} saved so far.`,
      href: '/goals',
      dedupeKey: `goal:${updated.id as string}:milestone:${milestone}`,
    });
  }

  return {
    goal: toGoalDto(updated),
    transaction: toTransactionDto(transaction, updated.name),
    milestoneReached: milestone,
  };
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The ownership gate. `userId` is always part of the filter, so a goal
 * belonging to someone else is indistinguishable from one that does not exist —
 * which is both the correct authorisation outcome and the right amount of
 * information to disclose.
 */
async function findOwnedGoal(userId: string, id: string): Promise<SavingsGoalDocument> {
  const goal = await SavingsGoal.findOne({ _id: id, userId }).exec();
  if (!goal) throw AppError.notFound('Goal');
  return goal;
}

function crossedMilestone(before: number, after: number, lastAnnounced: number): number | null {
  for (const milestone of [...MILESTONES].reverse()) {
    if (after >= milestone && before < milestone && lastAnnounced < milestone) return milestone;
  }
  return null;
}

export function buildOverview(goals: SavingsGoalDocument[]): GoalsOverviewDto {
  const counted = goals.filter((goal) => goal.status !== 'archived');
  const totalTarget = sumMinor(counted.map((goal) => goal.targetAmount));
  const totalSaved = sumMinor(counted.map((goal) => goal.currentAmount));

  return {
    totalTarget,
    totalSaved,
    totalRemaining: Math.max(0, totalTarget - totalSaved),
    percentComplete: Math.min(100, calculatePercentage(totalSaved, totalTarget)),
    activeCount: counted.filter((goal) => goal.status === 'active').length,
    completedCount: counted.filter((goal) => goal.status === 'completed').length,
    committedMonthly: sumMinor(
      counted.filter((goal) => goal.status === 'active').map((goal) => goal.monthlyContribution),
    ),
  };
}

/** Small lookup used only for notification copy; kept out of the hot path. */
async function currencyFor(userId: string) {
  const user = await User.findById(userId).select('currency').lean().exec();
  return user?.currency ?? 'NGN';
}
