import { useEffect, useState } from 'react';

/**
 * Delays a rapidly-changing value until it settles.
 *
 * Used by the transaction search box: firing a request on every keystroke would
 * send a dozen queries to type "groceries", and the results for "g" are never
 * what the user wanted anyway. 350ms is long enough to skip intermediate
 * keystrokes and short enough that the list still feels live.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    // Each new keystroke cancels the pending update, so the timer only fires
    // once the value has actually stopped changing.
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
