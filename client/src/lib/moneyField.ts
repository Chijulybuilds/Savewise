import { z } from 'zod';

import { parseMoneyInput, toMajor, type Minor } from '@savewise/shared';

/**
 * Money in forms.
 *
 * A text input holds a *string* the user typed — "350,000", "350000.50",
 * possibly with a stray space. The application holds integer minor units. This
 * module owns the translation between the two, in both directions.
 *
 * The form schemas below validate the string and leave it a string; conversion
 * happens explicitly in the submit handler via `readMoney`. That is deliberate:
 * a Zod `.transform()` would change the schema's output type, and React Hook
 * Form's resolver generics fight hard against a form whose input and output
 * types differ. Validating in Zod and converting in one named function is
 * simpler to read and simpler to type.
 */

/**
 * Picks the right indefinite article so the generated copy reads naturally:
 * "Enter **an** amount" but "Enter **a** target amount".
 */
function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? 'an' : 'a';
}

/**
 * A required amount that must be greater than zero.
 *
 * `noun` is the bare noun phrase — "amount", "target amount" — with the article
 * supplied by the message, so no call site has to write one and no message ends
 * up reading "Enter a valid an amount".
 */
export function requiredMoney(noun = 'amount') {
  return z
    .string()
    .trim()
    .min(1, `Enter ${article(noun)} ${noun}`)
    .refine((value) => {
      const minor = parseMoneyInput(value);
      return minor !== null && minor > 0;
    }, `Enter a valid ${noun}`);
}

/** An optional amount. Blank is allowed and reads as zero. */
export function optionalMoney(noun = 'amount') {
  return z
    .string()
    .trim()
    .refine((value) => {
      if (value === '') return true;
      const minor = parseMoneyInput(value);
      return minor !== null && minor >= 0;
    }, `Enter a valid ${noun}`);
}

/**
 * Read a validated money field as minor units.
 *
 * Safe to call unguarded *after* Zod validation has passed — the fallback only
 * exists for the blank optional case, never to paper over invalid input.
 */
export function readMoney(value: string | undefined, fallback: Minor = 0): Minor {
  if (!value || value.trim() === '') return fallback;
  return parseMoneyInput(value) ?? fallback;
}

/** Minor units back into something a text input can display. */
export function writeMoney(minor: Minor | undefined | null): string {
  if (minor === undefined || minor === null || minor === 0) return '';
  return String(toMajor(minor));
}

/** `YYYY-MM-DD`, the only format `<input type="date">` accepts. */
export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}
