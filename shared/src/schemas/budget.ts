import { z } from 'zod';

import { EXPENSE_CATEGORY_KEYS } from '../constants.js';
import { minorAmountSchema, monthKeySchema, textSchema } from './common.js';

/**
 * Budget contracts.
 *
 * A budget is one document per user per month holding an array of category
 * limits. Embedding the lines rather than giving them their own collection is
 * the right trade here: they are always read and written with their parent,
 * they are few (fifteen categories at most) and it makes the whole month
 * atomically consistent.
 */

export const budgetCategorySchema = z.object({
  category: z.enum(EXPENSE_CATEGORY_KEYS),
  budgeted: minorAmountSchema,
});

export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>;

const categoriesSchema = z
  .array(budgetCategorySchema)
  .max(EXPENSE_CATEGORY_KEYS.length, 'Too many categories')
  .refine(
    (lines) => new Set(lines.map((line) => line.category)).size === lines.length,
    'Each category can only be budgeted once',
  );

export const createBudgetSchema = z
  .object({
    month: monthKeySchema,
    plannedIncome: minorAmountSchema,
    plannedSavings: minorAmountSchema,
    categories: categoriesSchema.default([]),
    notes: textSchema(500, 'Notes').nullable().optional(),
  })
  .strict()
  .refine((data) => data.plannedSavings <= data.plannedIncome, {
    message: 'Planned savings cannot exceed planned income',
    path: ['plannedSavings'],
  });

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z
  .object({
    plannedIncome: minorAmountSchema.optional(),
    plannedSavings: minorAmountSchema.optional(),
    categories: categoriesSchema.optional(),
    notes: textSchema(500, 'Notes').nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const budgetQuerySchema = z.object({
  month: monthKeySchema.optional(),
  /** Number of trailing months to return when listing. */
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export type BudgetQuery = z.infer<typeof budgetQuerySchema>;
