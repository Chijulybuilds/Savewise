import { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

import { defineModel } from './defineModel.js';

import {
  EXPENSE_CATEGORY_KEYS,
  MONTH_KEY_PATTERN,
  type ExpenseCategoryKey,
  type Minor,
  type MonthKey,
} from '@savewise/shared';

/**
 * A monthly budget.
 *
 * Keyed by `YYYY-MM` rather than a date range: it sorts lexicographically,
 * indexes as a compact string, and removes any question of which timezone a
 * month boundary belongs to.
 *
 * Category limits are **embedded**. They are never queried independently, there
 * are at most fifteen of them, and they are always read and written with their
 * parent — the textbook case for embedding over referencing. `spent` is not
 * stored: it is aggregated from the transaction ledger on read, so a budget can
 * never drift out of sync with reality.
 */

export interface BudgetCategoryLine {
  category: ExpenseCategoryKey;
  budgeted: Minor;
}

export interface BudgetAttributes {
  userId: Types.ObjectId;
  month: MonthKey;
  plannedIncome: Minor;
  plannedSavings: Minor;
  categories: BudgetCategoryLine[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BudgetDocument = HydratedDocument<BudgetAttributes>;

const budgetCategorySchema = new Schema<BudgetCategoryLine>(
  {
    category: { type: String, enum: EXPENSE_CATEGORY_KEYS, required: true },
    budgeted: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Amounts are stored in whole minor units',
      },
    },
  },
  { _id: false },
);

const budgetSchema = new Schema<BudgetAttributes>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: {
      type: String,
      required: true,
      match: [MONTH_KEY_PATTERN, 'Month must be in YYYY-MM format'],
    },
    plannedIncome: { type: Number, default: 0, min: 0 },
    plannedSavings: { type: Number, default: 0, min: 0 },
    categories: {
      type: [budgetCategorySchema],
      default: [],
      validate: {
        validator: (lines: BudgetCategoryLine[]) =>
          new Set(lines.map((line) => line.category)).size === lines.length,
        message: 'Each category can only be budgeted once per month',
      },
    },
    notes: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true },
);

// One budget per user per month, enforced by the database rather than by a
// check-then-insert that two concurrent requests could both pass.
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export const Budget = defineModel<BudgetAttributes, Model<BudgetAttributes>>(
  'Budget',
  budgetSchema,
);
