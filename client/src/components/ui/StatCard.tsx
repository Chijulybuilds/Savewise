import type { ReactNode } from 'react';

import { formatPercent, type CurrencyCode } from '@savewise/shared';

import { cn } from '@/lib/cn';
import { AnimatedMoney } from './AnimatedNumber';

/**
 * Stat card — the headline-figure component used across the dashboard.
 *
 * The delta is the part that took thought. "Expenses up 14%" is *bad* news
 * while "Savings up 14%" is good, so the component cannot infer sentiment from
 * the sign. `invertDelta` says which direction is the good one, and the arrow
 * always points the way the number actually moved.
 */

interface StatCardProps {
  label: string;
  /** Minor units. */
  value: number;
  currency: CurrencyCode;
  /** Percentage change against the previous period. `null` when there is no baseline. */
  delta?: number | null;
  /** `true` when a rise is bad news — expenses, overspend. */
  invertDelta?: boolean;
  caption?: string;
  icon?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function StatCard({
  label,
  value,
  currency,
  delta,
  invertDelta = false,
  caption,
  icon,
  className,
  compact = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group rounded-2xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-border-strong',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        {icon && <span className="shrink-0 text-ink-subtle">{icon}</span>}
      </div>

      <p className={cn('mt-2 font-semibold text-ink', compact ? 'text-xl' : 'text-2xl')}>
        <AnimatedMoney value={value} currency={currency} />
      </p>

      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== null && delta !== undefined && <Delta value={delta} invert={invertDelta} />}
        {caption && <span className="truncate text-ink-subtle">{caption}</span>}
      </div>
    </div>
  );
}

/**
 * The change indicator. Colour is never the only signal — the arrow direction
 * and the signed number both carry the meaning on their own.
 */
export function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const rose = value > 0;
  const flat = Math.abs(value) < 0.05;
  const good = flat ? null : invert ? !rose : rose;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular',
        good === null ? 'text-ink-subtle' : good ? 'text-positive' : 'text-critical',
      )}
    >
      {!flat && (
        <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden="true">
          {rose ? <path d="M6 2.5 10 8H2l4-5.5Z" /> : <path d="M6 9.5 2 4h8L6 9.5Z" />}
        </svg>
      )}
      {flat ? 'No change' : formatPercent(Math.abs(value), 1)}
    </span>
  );
}
