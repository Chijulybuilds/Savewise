/**
 * Money primitives.
 *
 * Every monetary value in Savewise — in the database, over the wire, and in the
 * UI — is an **integer number of minor units** (kobo for NGN, cents for USD).
 * Floating point never touches a balance. `₦10,000.00` is `1_000_000`.
 *
 * IEEE-754 doubles represent every integer up to 2^53 - 1 exactly, so integer
 * arithmetic here is exact. The only place rounding can occur is when a value is
 * scaled by a non-integer factor (a percentage split, a contribution schedule),
 * and those operations are funnelled through the helpers below so the rounding
 * policy is defined in exactly one place.
 */

/**
 * An integer count of minor currency units. Kept as a documented alias rather
 * than a nominal brand so the value survives JSON, Mongoose and form boundaries
 * unchanged; the integer invariant is enforced at runtime by `assertMinor` and
 * at the API edge by `z.number().int()` in the request schemas.
 */
export type Minor = number;

export const MINOR_UNITS_PER_MAJOR = 100;

/** Largest amount we accept, ~90 trillion major units. Guards overflow and absurd input. */
export const MAX_MINOR = 9_000_000_000_000_00;

export type CurrencyCode = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'KES' | 'GHS' | 'ZAR';

export const CURRENCIES = {
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-IE' },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE' },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', locale: 'en-GH' },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
} as const satisfies Record<
  CurrencyCode,
  { code: CurrencyCode; symbol: string; name: string; locale: string }
>;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]];

export const DEFAULT_CURRENCY: CurrencyCode = 'NGN';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && value in CURRENCIES;
}

export function currencySymbol(currency: CurrencyCode): string {
  return CURRENCIES[currency].symbol;
}

/* -------------------------------------------------------------------------- */
/* Invariants                                                                  */
/* -------------------------------------------------------------------------- */

export function isMinor(value: unknown): value is Minor {
  return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= MAX_MINOR;
}

export function assertMinor(value: unknown, label = 'amount'): asserts value is Minor {
  if (!isMinor(value)) {
    throw new TypeError(
      `${label} must be a safe integer number of minor units, received: ${String(value)}`,
    );
  }
}

/**
 * Round half away from zero — the convention consumers expect ("₦0.005 → ₦0.01").
 * `Math.round` rounds half *up*, which is asymmetric for negative values.
 */
export function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) throw new TypeError(`Cannot round a non-finite value: ${value}`);
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/* -------------------------------------------------------------------------- */
/* Conversion & parsing                                                        */
/* -------------------------------------------------------------------------- */

/**
 * `toMinor(10_000)` → `1_000_000`. Accepts fractional major units.
 *
 * The scaling is done by shifting the decimal exponent in the number's *string*
 * form rather than multiplying by 100. Multiplying inherits the input's binary
 * representation error and rounds the wrong way at the boundary: `1.005 * 100`
 * is `100.49999999999999`, which rounds to 100 kobo instead of the 101 a user
 * expects. `Number('1.005e2')` parses directly to exactly `100.5`.
 */
export function toMinor(major: number): Minor {
  if (!Number.isFinite(major)) {
    throw new TypeError(`Cannot convert a non-finite value to minor units: ${major}`);
  }

  const asString = String(major);
  // A value already in exponential notation ("1e-7") cannot take a second
  // exponent; such magnitudes round to zero kobo anyway, so multiply directly.
  const scaled =
    asString.includes('e') || asString.includes('E')
      ? major * MINOR_UNITS_PER_MAJOR
      : Number(`${asString}e2`);

  const minor = roundHalfAwayFromZero(scaled);
  assertMinor(minor);
  return minor;
}

/** `toMajor(1_000_050)` → `10_000.5`. For display and charting only — never for accumulation. */
export function toMajor(minor: Minor): number {
  assertMinor(minor);
  return minor / MINOR_UNITS_PER_MAJOR;
}

/**
 * Parse free-form user input ("₦350,000", "350000.50", "1 200 000") into minor
 * units. Returns `null` for anything that is not unambiguously a number, so the
 * caller can surface a validation error rather than silently saving a zero.
 */
export function parseMoneyInput(input: string | number | null | undefined): Minor | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? toMinor(input) : null;

  const cleaned = input.replace(/[\s,_]/g, '').replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  if ((cleaned.match(/\./g) ?? []).length > 1) return null;
  if ((cleaned.match(/-/g) ?? []).length > 1) return null;
  if (cleaned.includes('-') && !cleaned.startsWith('-')) return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;

  try {
    return toMinor(parsed);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Arithmetic                                                                  */
/* -------------------------------------------------------------------------- */

export function addMinor(...amounts: Minor[]): Minor {
  let total = 0;
  for (const amount of amounts) {
    assertMinor(amount);
    total += amount;
  }
  assertMinor(total, 'sum');
  return total;
}

export function subMinor(a: Minor, b: Minor): Minor {
  assertMinor(a);
  assertMinor(b);
  const result = a - b;
  assertMinor(result, 'difference');
  return result;
}

export function sumMinor(amounts: readonly Minor[]): Minor {
  return addMinor(...amounts);
}

/** Scale an amount by an arbitrary factor, rounding once at the end. */
export function scaleMinor(amount: Minor, factor: number): Minor {
  assertMinor(amount);
  if (!Number.isFinite(factor))
    throw new TypeError(`Scale factor must be finite, received: ${factor}`);
  const result = roundHalfAwayFromZero(amount * factor);
  assertMinor(result, 'scaled amount');
  return result;
}

/** `percentOf(1_000_000, 20)` → `200_000` (20% of ₦10,000). */
export function percentOf(amount: Minor, percent: number): Minor {
  return scaleMinor(amount, percent / 100);
}

/** Integer division rounding *up* — "how many whole periods are needed". */
export function divideCeil(amount: Minor, divisor: number): Minor {
  assertMinor(amount);
  if (!Number.isFinite(divisor) || divisor === 0) {
    throw new TypeError(`Divisor must be a non-zero finite number, received: ${divisor}`);
  }
  const result = Math.ceil(amount / divisor);
  assertMinor(result, 'quotient');
  return result;
}

export function clampMinor(amount: Minor, min: Minor, max: Minor): Minor {
  assertMinor(amount);
  assertMinor(min);
  assertMinor(max);
  return Math.min(Math.max(amount, min), max);
}

export function maxMinor(a: Minor, b: Minor): Minor {
  assertMinor(a);
  assertMinor(b);
  return a > b ? a : b;
}

/**
 * Split an amount across weighted buckets without losing or inventing a single
 * kobo. Uses the largest-remainder method: floor every share, then hand the
 * leftover units to the buckets with the largest fractional remainders.
 *
 * `allocate(1000, [1, 1, 1])` → `[334, 333, 333]`, summing to exactly 1000.
 */
export function allocate(amount: Minor, weights: readonly number[]): Minor[] {
  assertMinor(amount);
  if (weights.length === 0) return [];
  if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
    throw new TypeError('Allocation weights must be finite, non-negative numbers');
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) return weights.map(() => 0);

  const shares = weights.map((weight) => Math.floor((amount * weight) / totalWeight));
  const remainders = weights.map((weight, index) => ({
    index,
    remainder: (amount * weight) / totalWeight - (shares[index] ?? 0),
  }));

  let leftover = amount - shares.reduce((sum, share) => sum + share, 0);
  remainders.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; leftover > 0; i = (i + 1) % remainders.length) {
    const target = remainders[i];
    if (!target) break;
    shares[target.index] = (shares[target.index] ?? 0) + 1;
    leftover -= 1;
  }

  return shares;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

export interface FormatMoneyOptions {
  /** Show minor units. Defaults to `false` — balances read better as whole naira. */
  decimals?: boolean;
  /** Abbreviate large values: `₦1.2m`. */
  compact?: boolean;
  /** Drop the currency symbol, keeping grouping. */
  hideSymbol?: boolean;
  /** Prefix non-negative values with `+`. Useful for deltas. */
  signed?: boolean;
}

/**
 * Format minor units for display. Uses `Intl.NumberFormat` for correct grouping
 * per locale, but writes the symbol ourselves so `₦` renders consistently across
 * platforms whose ICU data differs.
 */
export function formatMoney(
  minor: Minor,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  options: FormatMoneyOptions = {},
): string {
  const { decimals = false, compact = false, hideSymbol = false, signed = false } = options;
  const meta = CURRENCIES[currency] ?? CURRENCIES[DEFAULT_CURRENCY];
  const major = toMajor(minor);
  const absolute = Math.abs(major);

  let body: string;
  if (compact && absolute >= 1000) {
    // One fraction digit on the *compacted* value, which Intl drops when it is
    // zero: 350,000 → "350k", 1,200,000 → "1.2m", 1,000,000 → "1m".
    body = new Intl.NumberFormat(meta.locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    })
      .format(absolute)
      .toLowerCase();
  } else {
    body = new Intl.NumberFormat(meta.locale, {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    }).format(absolute);
  }

  const symbol = hideSymbol ? '' : meta.symbol;
  const sign = major < 0 ? '-' : signed ? '+' : '';
  return `${sign}${symbol}${body}`;
}

/** `₦350,000` → the shortest string that still reads as money. */
export function formatMoneyCompact(
  minor: Minor,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  return formatMoney(minor, currency, { compact: true });
}

/** Format a ratio as a percentage string: `formatPercent(72.4)` → `"72%"`. */
export function formatPercent(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(fractionDigits)}%`;
}
