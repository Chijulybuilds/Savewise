import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import {
  formatMoney,
  formatPercent,
  type CurrencyCode,
  type FormatMoneyOptions,
} from '@savewise/shared';

import { cn } from '@/lib/cn';

/**
 * A number that counts up when it first scrolls into view.
 *
 * Two details make this feel considered rather than gimmicky:
 *
 * - It animates **once**, on entry, and only when the value is worth animating.
 *   A balance that re-counts on every re-render is unreadable.
 * - The element carries the final value in `aria-label` and marks the visible
 *   text `aria-hidden`, so assistive technology reads "₦420,000" once instead
 *   of announcing sixty intermediate numbers.
 *
 * Tabular figures (see `.tabular` in the stylesheet) keep the digits from
 * shifting sideways as they change.
 */

interface AnimatedNumberProps {
  value: number;
  /** Turns the raw number into what the user reads. */
  format: (value: number) => string;
  className?: string;
  durationMs?: number;
  /** Skip the animation — for values that update in place, like a live filter. */
  animateOnView?: boolean;
}

export function AnimatedNumber({
  value,
  format,
  className,
  durationMs = 900,
  animateOnView = true,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(() => (animateOnView && !reduced ? 0 : value));
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!animateOnView || reduced) {
      setDisplay(value);
      return;
    }

    if (!inView) return;

    // Once it has run, later value changes are applied directly — a mutation
    // that updates a balance should show the new number, not replay a count-up.
    if (hasAnimated.current) {
      setDisplay(value);
      return;
    }

    hasAnimated.current = true;
    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
  }, [inView, value, animateOnView, reduced, durationMs]);

  return (
    <span ref={ref} className={cn('tabular', className)} aria-label={format(value)}>
      <span aria-hidden="true">{format(display)}</span>
    </span>
  );
}

interface AnimatedMoneyProps {
  /** Minor units. */
  value: number;
  currency: CurrencyCode;
  options?: FormatMoneyOptions;
  className?: string;
  animateOnView?: boolean;
}

export function AnimatedMoney({
  value,
  currency,
  options,
  className,
  animateOnView = true,
}: AnimatedMoneyProps) {
  return (
    <AnimatedNumber
      value={value}
      // Rounded to whole minor units before formatting so the intermediate
      // frames are valid amounts rather than fractions of a kobo.
      format={(amount) => formatMoney(Math.round(amount), currency, options)}
      className={className}
      animateOnView={animateOnView}
    />
  );
}

export function AnimatedPercent({
  value,
  className,
  fractionDigits = 0,
  animateOnView = true,
}: {
  value: number;
  className?: string;
  fractionDigits?: number;
  animateOnView?: boolean;
}) {
  return (
    <AnimatedNumber
      value={value}
      format={(amount) => formatPercent(amount, fractionDigits)}
      className={className}
      animateOnView={animateOnView}
    />
  );
}
