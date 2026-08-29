import { z } from 'zod';

import { currencySchema, requiredTextSchema } from './common.js';

/**
 * Authentication contracts.
 *
 * The same schemas drive the Express validator middleware and the React Hook
 * Form resolvers, so the error copy a user sees while typing is the error copy
 * the API would have produced.
 */

/**
 * bcrypt only considers the first 72 *bytes* of a password and silently ignores
 * the rest. Rather than let a user believe a 200-character passphrase is being
 * hashed in full, we reject anything longer at the edge.
 */
export const MAX_PASSWORD_BYTES = 72;
export const MIN_PASSWORD_LENGTH = 10;

export const emailSchema = z
  .string({ required_error: 'Enter your email address' })
  .trim()
  .toLowerCase()
  .min(5, 'Enter your email address')
  .max(254, 'That email address is too long')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string({ required_error: 'Choose a password' })
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .refine(
    (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
    `Passwords are limited to ${MAX_PASSWORD_BYTES} bytes`,
  )
  .refine((value) => /[a-z]/.test(value), 'Include a lowercase letter')
  .refine((value) => /[A-Z]/.test(value), 'Include an uppercase letter')
  .refine((value) => /\d/.test(value), 'Include a number');

export const nameSchema = requiredTextSchema(1, 60, 'Name').refine(
  (value) => /\p{L}/u.test(value),
  'Enter a valid name',
);

export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  currency: currencySchema.default('NGN'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login deliberately does *not* reuse `passwordSchema`. Applying the strength
 * rules here would tell an attacker which stored passwords are weak, and would
 * lock out anyone whose password predates a policy change.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(512),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(512),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Choose a password you have not used before',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
