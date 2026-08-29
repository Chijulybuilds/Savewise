/**
 * Calendar helpers.
 *
 * Budgets are keyed by a `YYYY-MM` month string rather than a date range: it is
 * unambiguous, sorts lexicographically, indexes well in MongoDB and sidesteps
 * timezone drift when a user in Lagos loads the app from a UTC server.
 *
 * All boundaries are computed in UTC. Savewise is a planning tool, not a
 * payments ledger — a consistent global definition of "August" is worth more
 * here than a per-user local midnight.
 */

/** A calendar month in `YYYY-MM` form, e.g. `"2026-08"`. */
export type MonthKey = string;

export const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === 'string' && MONTH_KEY_PATTERN.test(value);
}

export function toMonthKey(date: Date = new Date()): MonthKey {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

export function monthKeyToDate(key: MonthKey): Date {
  const [year, month] = key.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1));
}

export function startOfMonth(key: MonthKey): Date {
  return monthKeyToDate(key);
}

/** Exclusive upper bound — the first instant of the following month. */
export function endOfMonth(key: MonthKey): Date {
  const start = monthKeyToDate(key);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}

export function daysInMonth(key: MonthKey): number {
  const start = monthKeyToDate(key);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const start = monthKeyToDate(key);
  return toMonthKey(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1)));
}

/** The `count` months ending at `key`, oldest first. */
export function recentMonths(count: number, key: MonthKey = toMonthKey()): MonthKey[] {
  return Array.from({ length: count }, (_, index) => shiftMonth(key, index - (count - 1)));
}

export function formatMonthKey(key: MonthKey, style: 'long' | 'short' = 'long'): string {
  if (!isMonthKey(key)) return key;
  return new Intl.DateTimeFormat('en', {
    month: style,
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthKeyToDate(key));
}

/** Just the month name — for chart axes where the year is implied. */
export function monthLabel(key: MonthKey): string {
  if (!isMonthKey(key)) return key;
  return new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(
    monthKeyToDate(key),
  );
}

export const MS_PER_DAY = 86_400_000;

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / MS_PER_DAY);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const targetDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(targetDay, lastDay));
  return result;
}

/**
 * Months from `from` to `to`, as a fraction, never below zero.
 * Used to answer "how long do I have left to fund this goal?".
 */
export function monthsBetween(from: Date, to: Date): number {
  const days = daysBetween(from, to);
  if (days <= 0) return 0;
  return days / 30.4375; // mean Gregorian month length
}

export function formatDate(
  date: Date | string,
  style: 'short' | 'medium' | 'long' = 'medium',
): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return '—';
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: 'numeric', month: 'short' }
      : style === 'long'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(value);
}

/** "3 days ago", "in 2 months" — relative phrasing for deadlines and activity. */
export function formatRelative(date: Date | string, now: Date = new Date()): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return '—';

  const days = daysBetween(now, value);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(days) < 1) return 'today';
  if (Math.abs(days) < 31) return formatter.format(days, 'day');
  if (Math.abs(days) < 365) return formatter.format(Math.round(days / 30.4375), 'month');
  return formatter.format(Math.round(days / 365.25), 'year');
}
