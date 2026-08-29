import { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

import { defineModel } from './defineModel.js';

import {
  GOAL_CATEGORY_KEYS,
  GOAL_PRIORITIES,
  GOAL_STATUSES,
  type GoalCategory,
  type GoalPriority,
  type GoalStatus,
  type Minor,
} from '@savewise/shared';

/**
 * A savings goal.
 *
 * `currentAmount` is a running balance maintained *only* by the contribution
 * service, which writes a `saving` transaction in the same operation. Nothing
 * else may touch it — the update validator rejects a direct write — so the goal
 * balance and the ledger can never disagree.
 *
 * Derived values (percent complete, required contribution, projected date) are
 * deliberately **not** stored. They depend on the current date, so a persisted
 * copy would be stale the moment it was written; they are computed on read by
 * the shared finance engine.
 */

export interface SavingsGoalAttributes {
  userId: Types.ObjectId;
  name: string;
  description: string | null;
  category: GoalCategory;
  targetAmount: Minor;
  currentAmount: Minor;
  monthlyContribution: Minor;
  deadline: Date | null;
  priority: GoalPriority;
  status: GoalStatus;
  /** Highest milestone (25/50/75/100) already announced, so we notify once. */
  lastMilestone: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SavingsGoalDocument = HydratedDocument<SavingsGoalAttributes>;

const integerMinor = {
  type: Number,
  default: 0,
  min: 0,
  validate: {
    validator: Number.isInteger,
    message: 'Amounts are stored in whole minor units (kobo)',
  },
} as const;

const savingsGoalSchema = new Schema<SavingsGoalAttributes>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: null, maxlength: 500 },
    category: { type: String, enum: GOAL_CATEGORY_KEYS, required: true },
    targetAmount: { ...integerMinor, required: true, min: 1 },
    currentAmount: { ...integerMinor },
    monthlyContribution: { ...integerMinor },
    deadline: { type: Date, default: null },
    priority: { type: String, enum: GOAL_PRIORITIES, default: 'medium' },
    status: { type: String, enum: GOAL_STATUSES, default: 'active' },
    lastMilestone: { type: Number, default: 0, min: 0, max: 100 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Listing a user's goals, optionally filtered by status, ordered by intent.
savingsGoalSchema.index({ userId: 1, status: 1, priority: -1, createdAt: -1 });

// "What is due soonest?" on the dashboard.
savingsGoalSchema.index({ userId: 1, deadline: 1 }, { sparse: true });

// A goal name should be unique per user so the list stays readable, and so
// "Emergency Fund" cannot silently exist three times.
savingsGoalSchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

export const SavingsGoal = defineModel<SavingsGoalAttributes, Model<SavingsGoalAttributes>>(
  'SavingsGoal',
  savingsGoalSchema,
);
