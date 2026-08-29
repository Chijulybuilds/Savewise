import { z } from 'zod';

import { GOAL_CATEGORY_KEYS, GOAL_PRIORITIES, GOAL_STATUSES } from '../constants.js';
import { dateSchema, minorAmountSchema, positiveMinorAmountSchema, textSchema } from './common.js';

/**
 * Savings goal contracts.
 *
 * Note what is *absent*: `currentAmount` cannot be set directly. Balances only
 * move through `POST /goals/:id/contribute`, which writes a ledger transaction
 * in the same operation. That keeps the goal balance and the transaction
 * history from ever drifting apart.
 */

const goalNameSchema = textSchema(80, 'Goal name').pipe(z.string().min(2, 'Give your goal a name'));

/** A deadline in the past is almost always a typo, and breaks every projection. */
const futureDateSchema = dateSchema.refine(
  (value) => value.getTime() > Date.now() - 86_400_000,
  'Choose a deadline in the future',
);

export const createGoalSchema = z
  .object({
    name: goalNameSchema,
    description: textSchema(500, 'Description').nullable().optional(),
    category: z.enum(GOAL_CATEGORY_KEYS, { required_error: 'Choose a category' }),
    targetAmount: positiveMinorAmountSchema,
    /** Optional opening balance for money already set aside before joining. */
    startingAmount: minorAmountSchema.default(0),
    monthlyContribution: minorAmountSchema.default(0),
    deadline: futureDateSchema.nullable().optional(),
    priority: z.enum(GOAL_PRIORITIES).default('medium'),
  })
  .strict()
  .refine((data) => data.startingAmount <= data.targetAmount, {
    message: 'Starting amount cannot exceed the target',
    path: ['startingAmount'],
  });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z
  .object({
    name: goalNameSchema.optional(),
    description: textSchema(500, 'Description').nullable().optional(),
    category: z.enum(GOAL_CATEGORY_KEYS).optional(),
    targetAmount: positiveMinorAmountSchema.optional(),
    monthlyContribution: minorAmountSchema.optional(),
    deadline: futureDateSchema.nullable().optional(),
    priority: z.enum(GOAL_PRIORITIES).optional(),
    /** `completed` is derived from the balance, so it is not settable here. */
    status: z.enum(GOAL_STATUSES).exclude(['completed']).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const contributeSchema = z
  .object({
    amount: positiveMinorAmountSchema,
    date: dateSchema.optional(),
    note: textSchema(200, 'Note').nullable().optional(),
  })
  .strict();

export type ContributeInput = z.infer<typeof contributeSchema>;

export const goalQuerySchema = z.object({
  status: z.enum(GOAL_STATUSES).optional(),
  category: z.enum(GOAL_CATEGORY_KEYS).optional(),
});

export type GoalQuery = z.infer<typeof goalQuerySchema>;
