import type { ReactNode } from 'react';

import { formatMoney, type CurrencyCode } from '@savewise/shared';

import { cn } from '@/lib/cn';
import { CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';

/**
 * The frame every chart sits in.
 *
 * Loading, empty and error are handled here rather than in each chart, so no
 * visualisation can accidentally ship without them — and so a chart with no
 * data shows an explanation instead of an empty axis, which reads as broken.
 */

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Fixed height keeps the card from collapsing while data loads. */
  height?: number;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  /** Rendered under the chart — a legend, a total, a caveat. */
  footer?: ReactNode;
}

export function ChartCard({
  title,
  description,
  action,
  children,
  height = 280,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyTitle = 'Nothing to chart yet',
  emptyDescription = 'Add a few transactions and this will fill in.',
  className,
  footer,
}: ChartCardProps) {
  return (
    <section className={cn('rounded-2xl border border-border bg-surface p-5', className)}>
      <CardHeader title={title} description={description} action={action} as="h2" />

      <div className="mt-5" style={{ minHeight: height }}>
        {isLoading ? (
          <ChartSkeleton height={height} />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} className="border-0 bg-transparent py-8" />
        ) : isEmpty ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            className="border-0 py-10"
          />
        ) : (
          children
        )}
      </div>

      {footer && !isLoading && !error && <div className="mt-4">{footer}</div>}
    </section>
  );
}

/**
 * A skeleton shaped like a chart — an axis and a plausible silhouette — rather
 * than a grey rectangle, so the card does not change shape when data arrives.
 */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  const bars = [45, 62, 38, 71, 55, 80, 48, 66, 58, 74, 52, 68];

  return (
    <div
      className="flex flex-col gap-3"
      style={{ height }}
      role="status"
      aria-label="Loading chart"
    >
      <div className="flex flex-1 items-end gap-2">
        {bars.map((value, index) => (
          <div key={index} className="skeleton flex-1 rounded-md" style={{ height: `${value}%` }} />
        ))}
      </div>
      <div className="flex gap-2">
        {bars.map((_, index) => (
          <Skeleton key={index} className="h-2 flex-1" />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                     */
/* -------------------------------------------------------------------------- */

interface TooltipPayloadEntry {
  name?: string | number;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  currency: CurrencyCode;
  /** Values are already in major units — skip the money formatting. */
  raw?: boolean;
}

/**
 * A tooltip that matches the design system.
 *
 * Recharts' default is a white box with inline styles that ignores the theme
 * entirely, which looks exactly as out of place in dark mode as it sounds.
 */
export function ChartTooltip({ active, payload, label, currency, raw }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="pointer-events-none rounded-xl border border-border bg-surface px-3 py-2 shadow-lg">
      {label !== undefined && (
        <p className="mb-1.5 text-xs font-medium text-ink">{String(label)}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-ink-muted">{entry.name}</span>
            <span className="tabular ml-auto font-medium text-ink">
              {typeof entry.value === 'number'
                ? raw
                  ? entry.value.toLocaleString()
                  : formatMoney(entry.value, currency)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A legend rendered as ordinary DOM.
 *
 * Recharts' built-in legend is not reachable by keyboard and its text does not
 * respond to the page's font settings; a plain list is more accessible and
 * easier to lay out responsively.
 */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; value?: string }[];
  className?: string;
}) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-ink-muted">{item.label}</span>
          {item.value && <span className="tabular font-medium text-ink">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}
