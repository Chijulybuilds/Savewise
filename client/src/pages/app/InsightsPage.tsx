import { useState } from 'react';

import { formatMonthKey, recentMonths, toMonthKey } from '@savewise/shared';

import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/States';
import { InsightCard } from '@/features/insights/InsightCard';
import { useInsights } from '@/hooks/useApiQueries';
import { usePageMeta } from '@/hooks/usePageMeta';

/**
 * Insights.
 *
 * The explanatory note above the list is not filler. Every other product in
 * this category calls this feature "AI"; Savewise says plainly that it is a set
 * of rules over the user's own figures, which is both true and — for anything
 * touching someone's money — the more reassuring claim.
 */

const MONTH_OPTIONS = recentMonths(12)
  .reverse()
  .map((month) => ({ value: month, label: formatMonthKey(month) }));

export default function InsightsPage() {
  usePageMeta({ title: 'Insights — Savewise', noIndex: true });

  const [month, setMonth] = useState(toMonthKey());
  const { data, isPending, error, refetch } = useInsights(month);

  return (
    <>
      <PageHeader
        title="Insights"
        description="What changed this month, and what to do about it."
        toolbar={
          <div className="max-w-xs">
            <label htmlFor="insight-month" className="sr-only">
              Choose a month
            </label>
            <Select
              id="insight-month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              options={MONTH_OPTIONS}
            />
          </div>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-surface-sunken/50 px-4 py-3.5">
        <svg
          viewBox="0 0 20 20"
          className="mt-0.5 size-4 shrink-0 text-primary"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.4a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Zm.9 8.7a.9.9 0 1 1-1.8 0V9.6a.9.9 0 1 1 1.8 0v4.5Z" />
        </svg>

        <p className="text-xs leading-relaxed text-ink-muted">
          <strong className="font-medium text-ink">These are rules, not predictions.</strong> Each
          insight is a comparison over your own records — this month against last, your spending
          against your limits, your pace against your deadlines. Nothing here is a model, and
          nothing here is financial advice.
        </p>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={3} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title={`Nothing to report for ${formatMonthKey(month)}`}
          description="Insights appear once there is enough activity in a month to compare."
        />
      ) : (
        <Stagger className="grid gap-4 lg:grid-cols-2" stagger={0.06}>
          {data.map((insight) => (
            <StaggerItem key={insight.id} as="div">
              <InsightCard insight={insight} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
