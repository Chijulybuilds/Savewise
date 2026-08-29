import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants.js';
import { CURRENCY_CODES, MAX_MINOR } from '../money.js';
import { MONTH_KEY_PATTERN } from '../period.js';

/**
 * Building blocks reused across every request schema.
 *
 * Validation lives here, once, and is imported by both the Express validators
 * and the React Hook Form resolvers — so the browser and the API can never
 * disagree about what a valid amount is.
 */

/** A 24-character hexadecimal MongoDB ObjectId. Rejects `$`-prefixed injection payloads by construction. */
export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

/** Money, always in minor units. Non-negative unless a caller opts out. */
export const minorAmountSchema = z
  .number({ invalid_type_error: 'Enter an amount' })
  .int('Amounts are tracked in whole kobo')
  .min(0, 'Amount cannot be negative')
  .max(MAX_MINOR, 'That amount is larger than Savewise supports');

export const positiveMinorAmountSchema = minorAmountSchema.refine(
  (value) => value > 0,
  'Enter an amount greater than zero',
);

export const monthKeySchema = z
  .string()
  .trim()
  .regex(MONTH_KEY_PATTERN, 'Expected a month in YYYY-MM format');

export const currencySchema = z.enum(CURRENCY_CODES);

/** Accepts an ISO string or a Date, always yields a Date. */
export const dateSchema = z.coerce.date({ invalid_type_error: 'Enter a valid date' });

export const isoDateStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date');

/** Control characters have no place in user-supplied text destined for the DOM. */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;

/**
 * Free text destined for the database and, eventually, the DOM.
 * Trimmed, length-capped, and stripped of control characters.
 */
export function textSchema(max: number, label = 'This field') {
  return z
    .string()
    .trim()
    .transform((value) => value.replace(CONTROL_CHARACTERS, ''))
    .pipe(z.string().max(max, `${label} must be ${max} characters or fewer`));
}

export function requiredTextSchema(min: number, max: number, label = 'This field') {
  return textSchema(max, label).pipe(
    z.string().min(min, `${label} must be at least ${min} characters`),
  );
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');
