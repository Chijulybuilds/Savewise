import {
  buildStartingPlan,
  categoryBucket,
  EXPENSE_CATEGORIES,
  toMonthKey,
  type ChangePasswordInput,
  type OnboardingInput,
  type StartingPlan,
  type UpdatePreferencesInput,
  type UpdateProfileInput,
  type UserDto,
} from '@savewise/shared';

import { Budget } from '../models/Budget.js';
import { SavingsGoal } from '../models/SavingsGoal.js';
import { User, type UserDocument } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { revokeAllSessions } from './auth.service.js';
import { toUserDto } from './mappers.js';

/**
 * Profile, preferences and onboarding.
 */

export async function getProfile(userId: string): Promise<UserDto> {
  return toUserDto(await findUser(userId));
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
  const user = await findUser(userId);

  // Assigned field by field. `email` is absent from the schema on purpose:
  // changing it is an identity change that would need re-verification, so it is
  // out of scope rather than quietly allowed.
  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.currency !== undefined) user.currency = input.currency;
  if (input.monthlyIncome !== undefined) user.monthlyIncome = input.monthlyIncome;
  if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl || null;

  await user.save();
  return toUserDto(user);
}

export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput,
): Promise<UserDto> {
  const user = await findUser(userId);

  if (input.targetMonthlySavings !== undefined) {
    user.preferences.targetMonthlySavings = input.targetMonthlySavings;
  }
  if (input.priorities !== undefined) user.preferences.priorities = input.priorities;
  if (input.budgetAlertThreshold !== undefined) {
    user.preferences.budgetAlertThreshold = input.budgetAlertThreshold;
  }
  if (input.notifyOnGoalMilestone !== undefined) {
    user.preferences.notifyOnGoalMilestone = input.notifyOnGoalMilestone;
  }
  if (input.notifyOnBudgetExceeded !== undefined) {
    user.preferences.notifyOnBudgetExceeded = input.notifyOnBudgetExceeded;
  }

  await user.save();
  return toUserDto(user);
}

/**
 * Change password.
 *
 * Requires the current password — a hijacked session must not be enough to lock
 * the real owner out. On success every session is revoked, including the one
 * making the request, so a stolen token dies with the change.
 */
export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash').exec();
  if (!user) throw AppError.notFound('User');

  const matches = await user.verifyPassword(input.currentPassword);
  if (!matches) {
    throw AppError.badRequest('That password is incorrect', {
      currentPassword: ['That password is incorrect'],
    });
  }

  user.passwordHash = await User.hashPassword(input.newPassword);
  await user.save();

  await revokeAllSessions(userId);
}

/* -------------------------------------------------------------------------- */
/* Onboarding                                                                  */
/* -------------------------------------------------------------------------- */

export interface OnboardingResult {
  user: UserDto;
  plan: StartingPlan;
  budgetCreated: boolean;
  goalCreated: boolean;
}

/**
 * Turn the onboarding answers into a working account: income and preferences
 * saved, a first budget drafted from the suggested split, and the user's first
 * goal created.
 *
 * The generated budget is a *starting point*, presented as such. It is
 * editable from the moment it exists, and nothing about it is framed as
 * financial advice.
 */
export async function completeOnboarding(
  userId: string,
  input: OnboardingInput,
): Promise<OnboardingResult> {
  const user = await findUser(userId);

  user.monthlyIncome = input.monthlyIncome;
  user.preferences.targetMonthlySavings = input.targetMonthlySavings;
  user.preferences.priorities = input.priorities;
  user.onboardingCompleted = true;
  await user.save();

  const plan = buildStartingPlan(input.monthlyIncome, input.targetMonthlySavings);

  const month = toMonthKey();
  const budgetCreated = await draftBudget(userId, month, plan);
  const goalCreated = await createFirstGoal(userId, input, plan);

  return { user: toUserDto(user), plan, budgetCreated, goalCreated };
}

/**
 * Spread the suggested essentials and discretionary amounts across the
 * categories most people actually use, weighted realistically. The user will
 * change these — the point is to hand them something to edit rather than a
 * blank form.
 */
const ESSENTIAL_WEIGHTS: Record<string, number> = {
  housing: 40,
  food: 25,
  transportation: 15,
  utilities: 12,
  healthcare: 8,
};

const DISCRETIONARY_WEIGHTS: Record<string, number> = {
  entertainment: 30,
  dining: 30,
  shopping: 25,
  personal: 15,
};

async function draftBudget(userId: string, month: string, plan: StartingPlan): Promise<boolean> {
  const existing = await Budget.exists({ userId, month }).exec();
  if (existing) return false;

  const categories = [
    ...distribute(ESSENTIAL_WEIGHTS, plan.essentials),
    ...distribute(DISCRETIONARY_WEIGHTS, plan.discretionary),
  ].filter((line) => line.budgeted > 0);

  await Budget.create({
    userId,
    month,
    plannedIncome: plan.income,
    plannedSavings: plan.savings,
    categories,
    notes: 'Suggested starting plan — adjust anything that does not match your month.',
  });

  return true;
}

function distribute(weights: Record<string, number>, total: number) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return Object.entries(weights)
    .filter(([category]) => EXPENSE_CATEGORIES.some((entry) => entry.key === category))
    .map(([category, weight]) => ({
      category: category as never,
      budgeted: Math.round((total * weight) / totalWeight),
      bucket: categoryBucket(category),
    }))
    .map(({ category, budgeted }) => ({ category, budgeted }));
}

async function createFirstGoal(
  userId: string,
  input: OnboardingInput,
  plan: StartingPlan,
): Promise<boolean> {
  if (!input.firstGoal) return false;

  const existing = await SavingsGoal.exists({ userId, name: input.firstGoal.name }).exec();
  if (existing) return false;

  await SavingsGoal.create({
    userId,
    name: input.firstGoal.name,
    category: input.firstGoal.category,
    targetAmount: input.firstGoal.targetAmount,
    currentAmount: 0,
    // Seed the goal with the savings figure the user just committed to, so it
    // has a projection from the very first screen rather than reading "never".
    monthlyContribution: plan.savings,
    deadline: input.firstGoal.deadline ?? null,
    priority: 'high',
    status: 'active',
  });

  return true;
}

async function findUser(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId).exec();
  if (!user) throw AppError.notFound('User');
  return user;
}
