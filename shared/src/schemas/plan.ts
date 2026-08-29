import { z } from 'zod';

import { PLAN_FREQUENCIES, PLAN_STATUSES } from '../constants.js';
import { dateSchema, objectIdSchema, positiveMinorAmountSchema, textSchema } from './common.js';

/**
 * Recurring savings plan contracts.
 *
 * A plan is a *schedule*, not a standing order — Savewise never moves money.
 * It says "₦50,000 every month until the target is met" and projects the
 * finish line; the user records the actual contribution when it happens.
 */

const planNameSchema = textSchema(80, 'Plan name').pipe(z.string().min(2, 'Give your plan a name'));

export const createPlanSchema = z
  .object({
    name: planNameSchema,
    /** Optionally attach the plan to a goal so contributions credit it. */
    goalId: objectIdSchema.nullable().optional(),
    targetAmount: positiveMinorAmountSchema,
    contributionAmount: positiveMinorAmountSchema,
    frequency: z.enum(PLAN_FREQUENCIES, { required_error: 'Choose a frequency' }),
    startDate: dateSchema.default(() => new Date()),
  })
  .strict()
  .refine((data) => data.contributionAmount <= data.targetAmount, {
    message: 'A single contribution cannot exceed the target',
    path: ['contributionAmount'],
  });

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z
  .object({
    name: planNameSchema.optional(),
    goalId: objectIdSchema.nullable().optional(),
    targetAmount: positiveMinorAmountSchema.optional(),
    contributionAmount: positiveMinorAmountSchema.optional(),
    frequency: z.enum(PLAN_FREQUENCIES).optional(),
    startDate: dateSchema.optional(),
    /** `completed` is derived from progress, so it is not settable here. */
    status: z.enum(PLAN_STATUSES).exclude(['completed']).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const recordPlanContributionSchema = z
  .object({
    /** Defaults to the plan's scheduled contribution amount. */
    amount: positiveMinorAmountSchema.optional(),
    date: dateSchema.optional(),
  })
  .strict();

export type RecordPlanContributionInput = z.infer<typeof recordPlanContributionSchema>;

export const planQuerySchema = z.object({
  status: z.enum(PLAN_STATUSES).optional(),
});

export type PlanQuery = z.infer<typeof planQuerySchema>;
