import { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

import { defineModel } from './defineModel.js';

import {
  PLAN_FREQUENCIES,
  PLAN_STATUSES,
  type Minor,
  type PlanFrequency,
  type PlanStatus,
} from '@savewise/shared';

/**
 * A recurring savings plan — a *schedule*, not a standing order.
 *
 * Savewise never moves money. A plan expresses "₦50,000 every month until
 * ₦500,000", projects when that lands, and reminds the user to record the
 * contribution. Attaching a `goalId` makes each recorded contribution credit
 * the goal balance and write a ledger entry, so plans, goals and transactions
 * all stay consistent.
 */

export interface SavingsPlanAttributes {
  userId: Types.ObjectId;
  name: string;
  goalId: Types.ObjectId | null;
  targetAmount: Minor;
  contributionAmount: Minor;
  contributedAmount: Minor;
  frequency: PlanFrequency;
  startDate: Date;
  status: PlanStatus;
  lastContributionAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SavingsPlanDocument = HydratedDocument<SavingsPlanAttributes>;

const savingsPlanSchema = new Schema<SavingsPlanAttributes>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    goalId: { type: Schema.Types.ObjectId, ref: 'SavingsGoal', default: null },
    targetAmount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Amounts are stored in whole minor units',
      },
    },
    contributionAmount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Amounts are stored in whole minor units',
      },
    },
    contributedAmount: { type: Number, default: 0, min: 0 },
    frequency: { type: String, enum: PLAN_FREQUENCIES, required: true },
    startDate: { type: Date, required: true },
    status: { type: String, enum: PLAN_STATUSES, default: 'active' },
    lastContributionAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

savingsPlanSchema.index({ userId: 1, status: 1, createdAt: -1 });
savingsPlanSchema.index({ userId: 1, goalId: 1 }, { sparse: true });

export const SavingsPlan = defineModel<SavingsPlanAttributes, Model<SavingsPlanAttributes>>(
  'SavingsPlan',
  savingsPlanSchema,
);
