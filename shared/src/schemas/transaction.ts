import { z } from 'zod';

import { ALL_CATEGORY_KEYS, TRANSACTION_TYPES, isCategoryValidForType } from '../constants.js';
import {
  dateSchema,
  monthKeySchema,
  objectIdSchema,
  paginationSchema,
  positiveMinorAmountSchema,
  sortOrderSchema,
  textSchema,
} from './common.js';

/**
 * Transaction contracts.
 *
 * Amounts are always positive; direction is carried by `type`. Storing a signed
 * amount invites double-negation bugs in aggregation ("is this expense -5000 or
 * 5000?"), whereas a discriminant is impossible to misread.
 */

const descriptionSchema = textSchema(140, 'Description').pipe(
  z.string().min(1, 'Describe this transaction'),
);

const categoryForTypeRefinement = (data: {
  type: (typeof TRANSACTION_TYPES)[number];
  category: string;
}) => isCategoryValidForType(data.category, data.type);

/** A transaction dated years ahead is a data-entry error, not a plan. */
const transactionDateSchema = dateSchema.refine(
  (value) => value.getTime() < Date.now() + 366 * 86_400_000,
  'That date is too far in the future',
);

export const createTransactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES, { required_error: 'Choose a transaction type' }),
    amount: positiveMinorAmountSchema,
    category: z.enum(ALL_CATEGORY_KEYS, { required_error: 'Choose a category' }),
    description: descriptionSchema,
    date: transactionDateSchema,
    notes: textSchema(500, 'Notes').nullable().optional(),
  })
  .strict()
  .refine(categoryForTypeRefinement, {
    message: 'That category does not apply to this transaction type',
    path: ['category'],
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES).optional(),
    amount: positiveMinorAmountSchema.optional(),
    category: z.enum(ALL_CATEGORY_KEYS).optional(),
    description: descriptionSchema.optional(),
    date: transactionDateSchema.optional(),
    notes: textSchema(500, 'Notes').nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update')
  // Only checkable when both halves of the pair are being changed together;
  // the service re-validates against the stored record for partial updates.
  .refine(
    (data) => !data.type || !data.category || isCategoryValidForType(data.category, data.type),
    {
      message: 'That category does not apply to this transaction type',
      path: ['category'],
    },
  );

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const transactionQuerySchema = paginationSchema.extend({
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: z.enum(ALL_CATEGORY_KEYS).optional(),
  /** Free-text search across description and notes. */
  search: textSchema(100, 'Search').optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  month: monthKeySchema.optional(),
  goalId: objectIdSchema.optional(),
  sort: z.enum(['date', 'amount', 'createdAt']).default('date'),
  order: sortOrderSchema,
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
