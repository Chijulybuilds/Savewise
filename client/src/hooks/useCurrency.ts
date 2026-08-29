import { useCallback, useMemo } from 'react';

import {
  DEFAULT_CURRENCY,
  currencySymbol,
  formatMoney,
  parseMoneyInput,
  toMajor,
  type CurrencyCode,
  type FormatMoneyOptions,
  type Minor,
} from '@savewise/shared';

import { useAuthStore } from '@/store/authStore';

/**
 * The signed-in user's currency, plus formatting bound to it.
 *
 * Every component that shows an amount uses this rather than importing
 * `formatMoney` and passing a currency, which is how a hard-coded `'NGN'` ends
 * up on a screen belonging to someone saving in cedi.
 */
export function useCurrency() {
  const currency: CurrencyCode = useAuthStore((state) => state.user?.currency) ?? DEFAULT_CURRENCY;

  const format = useCallback(
    (minor: Minor, options?: FormatMoneyOptions) => formatMoney(minor, currency, options),
    [currency],
  );

  const formatCompact = useCallback(
    (minor: Minor) => formatMoney(minor, currency, { compact: true }),
    [currency],
  );

  return useMemo(
    () => ({
      currency,
      symbol: currencySymbol(currency),
      format,
      formatCompact,
      /** Major units for a form field — `1_000_050` becomes `"10000.5"`. */
      toInput: (minor: Minor) => (minor === 0 ? '' : String(toMajor(minor))),
      /** Free-form input to minor units. `null` when it is not a number. */
      fromInput: parseMoneyInput,
    }),
    [currency, format, formatCompact],
  );
}
