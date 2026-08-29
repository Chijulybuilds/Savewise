import {
  calculateGoalProgress,
  calculatePlanProjection,
  type GoalDto,
  type NotificationDto,
  type PlanDto,
  type TransactionDto,
  type UserDto,
} from '@savewise/shared';

import type { NotificationDocument } from '../models/Notification.js';
import type { SavingsGoalDocument } from '../models/SavingsGoal.js';
import type { SavingsPlanDocument } from '../models/SavingsPlan.js';
import type { TransactionDocument } from '../models/Transaction.js';
import type { UserDocument } from '../models/User.js';

/**
 * Document → DTO mappers.
 *
 * Nothing reaches a client except through one of these functions. That is a
 * deliberate boundary: a Mongoose document carries internals (`__v`,
 * `passwordHash`, raw `ObjectId`s, whatever a future migration adds) and
 * serialising one directly is how fields leak. Mapping explicitly means the API
 * response shape is a decision rather than an accident.
 *
 * Derived numbers are computed here with the shared finance engine so the
 * client never has to recompute — and never disagrees.
 */

export function toUserDto(user: UserDocument): UserDto {
  return {
    id: user.id as string,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    currency: user.currency,
    avatarUrl: user.avatarUrl,
    monthlyIncome: user.monthlyIncome,
    preferences: {
      targetMonthlySavings: user.preferences.targetMonthlySavings,
      priorities: user.preferences.priorities,
      budgetAlertThreshold: user.preferences.budgetAlertThreshold,
      notifyOnGoalMilestone: user.preferences.notifyOnGoalMilestone,
      notifyOnBudgetExceeded: user.preferences.notifyOnBudgetExceeded,
    },
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toGoalDto(goal: SavingsGoalDocument, now = new Date()): GoalDto {
  const progress = calculateGoalProgress(
    {
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      deadline: goal.deadline,
      monthlyContribution: goal.monthlyContribution,
      createdAt: goal.createdAt,
    },
    now,
  );

  return {
    id: goal.id as string,
    name: goal.name,
    description: goal.description,
    category: goal.category,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    monthlyContribution: goal.monthlyContribution,
    deadline: goal.deadline?.toISOString() ?? null,
    priority: goal.priority,
    status: goal.status,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    completedAt: goal.completedAt?.toISOString() ?? null,
    progress: {
      remainingAmount: progress.remainingAmount,
      percentComplete: progress.percentComplete,
      requiredMonthlyContribution: progress.requiredMonthlyContribution,
      daysRemaining: progress.daysRemaining,
      monthsRemaining: progress.monthsRemaining,
      projectedCompletionDate: progress.projectedCompletionDate?.toISOString() ?? null,
      monthsAheadOfDeadline: progress.monthsAheadOfDeadline,
      pace: progress.pace,
      isComplete: progress.isComplete,
    },
  };
}

/**
 * `goalName` is populated opportunistically: when the caller has already joined
 * the goal we surface its name, otherwise the field is `null` rather than
 * triggering a per-row lookup (the N+1 this design exists to avoid).
 */
export function toTransactionDto(
  transaction: TransactionDocument,
  goalName: string | null = null,
): TransactionDto {
  return {
    id: transaction.id as string,
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    description: transaction.description,
    date: transaction.date.toISOString(),
    notes: transaction.notes,
    goalId: transaction.goalId?.toString() ?? null,
    goalName,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export function toPlanDto(
  plan: SavingsPlanDocument,
  goalName: string | null = null,
  now = new Date(),
): PlanDto {
  const projection = calculatePlanProjection(
    {
      targetAmount: plan.targetAmount,
      contributionAmount: plan.contributionAmount,
      contributedAmount: plan.contributedAmount,
      frequency: plan.frequency,
      startDate: plan.startDate,
    },
    now,
  );

  return {
    id: plan.id as string,
    name: plan.name,
    goalId: plan.goalId?.toString() ?? null,
    goalName,
    targetAmount: plan.targetAmount,
    contributionAmount: plan.contributionAmount,
    contributedAmount: plan.contributedAmount,
    frequency: plan.frequency,
    startDate: plan.startDate.toISOString(),
    status: plan.status,
    autoLogged: false,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    projection: {
      remainingAmount: projection.remainingAmount,
      percentComplete: projection.percentComplete,
      contributionsRemaining: projection.contributionsRemaining,
      totalContributions: projection.totalContributions,
      monthlyEquivalent: projection.monthlyEquivalent,
      projectedCompletionDate: projection.projectedCompletionDate?.toISOString() ?? null,
      nextContributionDate: projection.nextContributionDate?.toISOString() ?? null,
    },
  };
}

export function toNotificationDto(notification: NotificationDocument): NotificationDto {
  return {
    id: notification.id as string,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}
