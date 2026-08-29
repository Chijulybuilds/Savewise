import { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

import { defineModel } from './defineModel.js';

import {
  ALL_CATEGORY_KEYS,
  TRANSACTION_TYPES,
  type Minor,
  type TransactionType,
} from '@savewise/shared';

/**
 * The transaction ledger — the source of truth for every actual figure in
 * Savewise. Budgets describe intent; goals describe ambition; this collection
 * describes what happened.
 *
 * `amount` is always positive and always in minor units. Direction lives in
 * `type`, which keeps aggregations honest: summing expenses is a match on
 * `type` rather than a sign test that a single bad write could corrupt.
 */

export interface TransactionAttributes {
  userId: Types.ObjectId;
  type: TransactionType;
  amount: Minor;
  category: string;
  description: string;
  date: Date;
  notes: string | null;
  /** Set when this row was produced by a goal contribution. */
  goalId: Types.ObjectId | null;
  /** Set when this row was produced by recording a savings-plan contribution. */
  planId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionDocument = HydratedDocument<TransactionAttributes>;

const transactionSchema = new Schema<TransactionAttributes>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be greater than zero'],
      validate: {
        validator: Number.isInteger,
        message: 'Amounts are stored in whole minor units (kobo)',
      },
    },
    category: { type: String, enum: ALL_CATEGORY_KEYS, required: true },
    description: { type: String, required: true, trim: true, maxlength: 140 },
    date: { type: Date, required: true },
    notes: { type: String, default: null, maxlength: 500 },
    goalId: { type: Schema.Types.ObjectId, ref: 'SavingsGoal', default: null },
    planId: { type: Schema.Types.ObjectId, ref: 'SavingsPlan', default: null },
  },
  { timestamps: true },
);

// The workhorse index: every list, chart and monthly aggregate is scoped to one
// user over a date range, and this serves all of them — including the sort.
transactionSchema.index({ userId: 1, date: -1 });

// Category breakdowns and category filters within a period.
transactionSchema.index({ userId: 1, category: 1, date: -1 });

// Monthly income/expense/savings rollups filter on type before summing.
transactionSchema.index({ userId: 1, type: 1, date: -1 });

// Listing the contribution history of a single goal.
transactionSchema.index({ userId: 1, goalId: 1, date: -1 }, { sparse: true });

// Free-text search over description and notes, scoped by the query to one user.
transactionSchema.index({ description: 'text', notes: 'text' });

export const Transaction = defineModel<TransactionAttributes, Model<TransactionAttributes>>(
  'Transaction',
  transactionSchema,
);
