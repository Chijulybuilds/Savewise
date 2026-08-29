import { describe, expect, it } from 'vitest';

import {
  MAX_MINOR,
  addMinor,
  allocate,
  clampMinor,
  divideCeil,
  formatMoney,
  isMinor,
  parseMoneyInput,
  percentOf,
  roundHalfAwayFromZero,
  scaleMinor,
  subMinor,
  sumMinor,
  toMajor,
  toMinor,
} from '../money.js';

/**
 * Money primitives.
 *
 * These tests exist because a rounding bug in this file would be invisible
 * until it had silently misstated someone's balance for months. The cases below
 * are the ones that actually catch that: the classic float traps, the rounding
 * boundary, and the allocation that must not lose a kobo.
 */

describe('toMinor / toMajor', () => {
  it('converts naira to kobo', () => {
    expect(toMinor(10_000)).toBe(1_000_000);
    expect(toMinor(350_000)).toBe(35_000_000);
    expect(toMajor(1_000_050)).toBe(10_000.5);
  });

  it('round-trips without drift', () => {
    for (const amount of [0, 1, 0.01, 99.99, 12_345.67, 1_000_000]) {
      expect(toMajor(toMinor(amount))).toBeCloseTo(amount, 10);
    }
  });

  it('survives the classic floating-point traps', () => {
    // 0.1 + 0.2 === 0.30000000000000004 in float arithmetic. In minor units it
    // is 10 + 20 === 30, exactly, which is the entire reason for this design.
    expect(addMinor(toMinor(0.1), toMinor(0.2))).toBe(toMinor(0.3));

    // 1.005 * 100 is 100.49999999999999 as a double; half-away-from-zero
    // rounding must still land on 101 kobo.
    expect(toMinor(1.005)).toBe(101);

    // A hundred 10-kobo pieces must be exactly ten naira, not 9.999999.
    expect(sumMinor(Array.from({ length: 100 }, () => toMinor(0.1)))).toBe(toMinor(10));
  });

  it('rejects values that are not finite', () => {
    expect(() => toMinor(Number.NaN)).toThrow(TypeError);
    expect(() => toMinor(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});

describe('roundHalfAwayFromZero', () => {
  it('rounds halves away from zero in both directions', () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1);
    expect(roundHalfAwayFromZero(1.5)).toBe(2);
    // `Math.round(-0.5)` is `-0`, which is asymmetric. Consumers expect -1.
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
    expect(roundHalfAwayFromZero(-1.5)).toBe(-2);
  });
});

describe('isMinor', () => {
  it('accepts safe integers within range and rejects everything else', () => {
    expect(isMinor(0)).toBe(true);
    expect(isMinor(1_000_000)).toBe(true);
    expect(isMinor(1.5)).toBe(false);
    expect(isMinor(MAX_MINOR + 1)).toBe(false);
    expect(isMinor('1000')).toBe(false);
    expect(isMinor(Number.NaN)).toBe(false);
  });
});

describe('arithmetic', () => {
  it('adds, subtracts and sums exactly', () => {
    expect(addMinor(100, 250, 33)).toBe(383);
    expect(subMinor(1_000, 250)).toBe(750);
    expect(sumMinor([])).toBe(0);
  });

  it('rejects non-integer inputs rather than silently truncating', () => {
    expect(() => addMinor(1.5, 2)).toThrow(TypeError);
  });

  it('scales and takes percentages with a single rounding step', () => {
    expect(percentOf(toMinor(10_000), 20)).toBe(toMinor(2_000));
    // 33.333% of ₦1,000 rounds once, at the end.
    expect(percentOf(toMinor(1_000), 33.333)).toBe(33_333);
    expect(scaleMinor(100, 0.5)).toBe(50);
    expect(scaleMinor(101, 0.5)).toBe(51);
  });

  it('divides upward, because under-contributing misses the deadline', () => {
    expect(divideCeil(1_000, 3)).toBe(334);
    expect(divideCeil(999, 3)).toBe(333);
    expect(() => divideCeil(100, 0)).toThrow(TypeError);
  });

  it('clamps within bounds', () => {
    expect(clampMinor(150, 0, 100)).toBe(100);
    expect(clampMinor(-50, 0, 100)).toBe(0);
    expect(clampMinor(50, 0, 100)).toBe(50);
  });
});

describe('allocate', () => {
  it('never loses or invents a unit', () => {
    // 1000 split three ways cannot be even; the leftover must go somewhere.
    const shares = allocate(1000, [1, 1, 1]);
    expect(shares).toHaveLength(3);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(1000);
    expect(shares).toEqual([334, 333, 333]);
  });

  it('respects weights', () => {
    const shares = allocate(toMinor(100_000), [50, 30, 20]);
    expect(shares).toEqual([toMinor(50_000), toMinor(30_000), toMinor(20_000)]);
  });

  it('handles awkward splits without drift', () => {
    const shares = allocate(10_001, [1, 1, 1, 1, 1, 1, 1]);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(10_001);
  });

  it('returns zeroes when every weight is zero', () => {
    expect(allocate(1000, [0, 0])).toEqual([0, 0]);
  });

  it('rejects negative weights', () => {
    expect(() => allocate(1000, [1, -1])).toThrow(TypeError);
  });
});

describe('parseMoneyInput', () => {
  it('accepts the shapes a person actually types', () => {
    expect(parseMoneyInput('350000')).toBe(toMinor(350_000));
    expect(parseMoneyInput('350,000')).toBe(toMinor(350_000));
    expect(parseMoneyInput('₦350,000')).toBe(toMinor(350_000));
    expect(parseMoneyInput('1 200 000')).toBe(toMinor(1_200_000));
    expect(parseMoneyInput('99.50')).toBe(9_950);
    expect(parseMoneyInput('-500')).toBe(-50_000);
  });

  it('returns null for anything ambiguous rather than guessing a zero', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('   ')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('1.2.3')).toBeNull();
    expect(parseMoneyInput('5-0')).toBeNull();
    expect(parseMoneyInput(null)).toBeNull();
    expect(parseMoneyInput(undefined)).toBeNull();
  });
});

describe('formatMoney', () => {
  it('writes the naira symbol and groups thousands', () => {
    expect(formatMoney(toMinor(350_000))).toBe('₦350,000');
    expect(formatMoney(toMinor(1_234.56), 'NGN', { decimals: true })).toBe('₦1,234.56');
  });

  it('renders negatives with the sign before the symbol', () => {
    expect(formatMoney(toMinor(-5_000))).toBe('-₦5,000');
  });

  it('abbreviates large amounts on request', () => {
    expect(formatMoney(toMinor(1_200_000), 'NGN', { compact: true })).toBe('₦1.2m');
  });

  it('supports other currencies', () => {
    expect(formatMoney(toMinor(1_500), 'USD')).toBe('$1,500');
    expect(formatMoney(toMinor(1_500), 'GHS')).toBe('GH₵1,500');
  });
});
