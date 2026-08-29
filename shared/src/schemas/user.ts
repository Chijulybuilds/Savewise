import { z } from 'zod';

import { FINANCIAL_PRIORITY_KEYS, GOAL_CATEGORY_KEYS } from '../constants.js';
import {
  currencySchema,
  minorAmountSchema,
  positiveMinorAmountSchema,
  textSchema,
} from './common.js';
import { nameSchema } from './auth.js';

/**
 * Profile, preferences and onboarding contracts.
 *
 * Every update schema is a closed object (`.strict()` where it matters) listing
 * exactly the fields a client may set. Anything else — `role`, `passwordHash`,
 * `_id` — is dropped before it reaches Mongoose, which is what stops mass
 * assignment at the door rather than in the model.
 */

export const financialPreferencesSchema = z.object({
  targetMonthlySavings: minorAmountSchema,
  priorities: z.array(z.enum(FINANCIAL_PRIORITY_KEYS)).max(8),
  budgetAlertThreshold: z.number().int().min(50).max(100),
  notifyOnGoalMilestone: z.boolean(),
  notifyOnBudgetExceeded: z.boolean(),
});

export type FinancialPreferencesInput = z.infer<typeof financialPreferencesSchema>;

export const updateProfileSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    currency: currencySchema.optional(),
    monthlyIncome: minorAmountSchema.optional(),
    avatarUrl: textSchema(2048, 'Avatar URL')
      .refine(
        (value) => value === '' || /^https:\/\/[\w.-]+\/\S*$/.test(value),
        'Avatar must be an https URL',
      )
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updatePreferencesSchema = financialPreferencesSchema.partial().strict();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

/* -------------------------------------------------------------------------- */
/* Onboarding                                                                  */
/* -------------------------------------------------------------------------- */

export const onboardingSchema = z.object({
  monthlyIncome: positiveMinorAmountSchema,
  priorities: z
    .array(z.enum(FINANCIAL_PRIORITY_KEYS))
    .min(1, 'Pick at least one priority')
    .max(4, 'Pick up to four priorities'),
  targetMonthlySavings: minorAmountSchema,
  firstGoal: z
    .object({
      name: textSchema(80, 'Goal name').pipe(z.string().min(2, 'Give the goal a name')),
      targetAmount: positiveMinorAmountSchema,
      category: z.enum(GOAL_CATEGORY_KEYS),
      deadline: z.coerce.date().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
