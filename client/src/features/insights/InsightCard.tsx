import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { InsightDto, InsightSeverity } from '@savewise/shared';

import { cn } from '@/lib/cn';

/**
 * A single insight.
 *
 * Severity is expressed three ways at once — an icon, a word, and a colour — so
 * the meaning survives a colour-vision difference or a greyscale screenshot.
 *
 * The recommendation is visually separated from the observation because they
 * are different kinds of statement: one is a fact about the user's month, the
 * other is a suggestion they are free to ignore.
 */

const SEVERITY = {
  positive: {
    label: 'Good news',
    ring: 'ring-positive/20',
    chip: 'bg-positive-soft text-positive',
    icon: (
      <path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm3 4.3a.75.75 0 0 0-1.06 0L7.2 8.55 6.06 7.4A.75.75 0 0 0 5 8.46l1.67 1.68a.75.75 0 0 0 1.06 0L11 6.86a.75.75 0 0 0 0-1.06Z" />
    ),
  },
  neutral: {
    label: 'Noticed',
    ring: 'ring-border',
    chip: 'bg-surface-sunken text-ink-muted',
    icon: (
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 2.8a.85.85 0 1 1 0 1.7.85.85 0 0 1 0-1.7Zm.75 7.05a.75.75 0 0 1-1.5 0V7.7a.75.75 0 0 1 1.5 0v3.65Z" />
    ),
  },
  warning: {
    label: 'Worth a look',
    ring: 'ring-warning/25',
    chip: 'bg-warning-soft text-warning',
    icon: (
      <path d="M8.7 2.2a.8.8 0 0 0-1.4 0L1.4 12.8a.8.8 0 0 0 .7 1.2h11.8a.8.8 0 0 0 .7-1.2L8.7 2.2ZM8 5.6a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 5.6Zm0 6.4a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />
    ),
  },
  critical: {
    label: 'Needs attention',
    ring: 'ring-critical/30',
    chip: 'bg-critical-soft text-critical',
    icon: (
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.5Zm0 7.25a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />
    ),
  },
} satisfies Record<InsightSeverity, { label: string; ring: string; chip: string; icon: ReactNode }>;

export function InsightCard({
  insight,
  compact = false,
}: {
  insight: InsightDto;
  compact?: boolean;
}) {
  const style = SEVERITY[insight.severity];

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl bg-surface ring-1 ring-inset',
        style.ring,
        compact ? 'p-5' : 'p-6',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium',
            style.chip,
          )}
        >
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true">
            {style.icon}
          </svg>
          {style.label}
        </span>

        {insight.metric && (
          <div className="shrink-0 text-right">
            <p className="tabular text-lg font-semibold text-ink">{insight.metric.value}</p>
            <p className="text-2xs text-ink-subtle">{insight.metric.label}</p>
          </div>
        )}
      </div>

      <h3 className={cn('font-semibold text-ink', compact ? 'mt-4 text-sm' : 'mt-5 text-base')}>
        {insight.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{insight.message}</p>

      {(insight.recommendation ?? insight.action) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {insight.recommendation && (
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-ink-muted">
              {insight.recommendation}
            </p>
          )}

          {insight.action && (
            <Link
              to={insight.action.href}
              className="shrink-0 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {insight.action.label} →
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
