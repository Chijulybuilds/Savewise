import { useState } from 'react';

import { formatPercent, toMonthKey } from '@savewise/shared';

import { ChartCard } from '@/components/charts/ChartCard';
import { CategoryDonut, IncomeExpenseChart, SavingsGrowthChart } from '@/components/charts/Charts';
import { SlideUp } from '@/components/motion/Reveal';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Progress } from '@/components/ui/Progress';
import { Tabs } from '@/components/ui/Tabs';
import { Delta } from '@/components/ui/StatCard';
import { ErrorState, SkeletonCard } from '@/components/ui/States';
import {
  useCategoryAnalytics,
  useSavingsAnalytics,
  useSpendingAnalytics,
} from '@/hooks/useApiQueries';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageMeta } from '@/hooks/usePageMeta';
import { cn } from '@/lib/cn';

/**
 * Analytics.
 *
 * Three questions, three tabs: where the money went, whether the habit is
 * holding, and what the current rate leads to. Splitting them keeps each view
 * to two or three charts — a single page with nine charts is a page nobody
 * reads.
 *
 * Each tab fetches only its own data, so opening Analytics does not pull twelve
 * months of three different aggregations at once.
 */

type View = 'flow' | 'savings' | 'categories';

const TABS = [
  { value: 'flow' as const, label: 'Income & spending' },
  { value: 'savings' as const, label: 'Savings' },
  { value: 'categories' as const, label: 'Categories' },
];

export default function AnalyticsPage() {
  usePageMeta({ title: 'Analytics — Savewise', noIndex: true });

  const [view, setView] = useState<View>('flow');

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Twelve months of your own numbers, and where the current pace leads."
        toolbar={<Tabs items={TABS} value={view} onChange={setView} label="Analytics view" />}
      />

      {view === 'flow' && <FlowView />}
      {view === 'savings' && <SavingsView />}
      {view === 'categories' && <CategoriesView />}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Income and spending                                                         */
/* -------------------------------------------------------------------------- */

function FlowView() {
  const { format, currency } = useCurrency();
  const { data, isPending, error, refetch } = useSpendingAnalytics(12);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isPending) return <TwoCardSkeleton />;

  const hasData = data.months.some((month) => month.income > 0 || month.expenses > 0);

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryTile label="Average income" value={format(data.averageMonthlyIncome)} />
          <SummaryTile label="Average spending" value={format(data.averageMonthlyExpenses)} />
          <SummaryTile
            label="Highest spend month"
            value={
              data.highestSpendMonth
                ? `${data.highestSpendMonth.label} · ${format(data.highestSpendMonth.expenses)}`
                : '—'
            }
          />
        </div>
      </SlideUp>

      <SlideUp delay={0.05}>
        <ChartCard
          title="Income, spending and savings"
          description="The last twelve months, side by side"
          isEmpty={!hasData}
          height={320}
          footer={
            <p className="text-xs leading-relaxed text-ink-subtle">
              Savings are shown separately from spending: money set aside has left your current
              account but is still yours.
            </p>
          }
        >
          <IncomeExpenseChart data={data.months} currency={currency} height={320} />
        </ChartCard>
      </SlideUp>

      <SlideUp delay={0.1}>
        <Card>
          <CardHeader title="Month by month" description="Savings rate against income" as="h2" />

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <caption className="sr-only">
                Monthly income, spending, savings and savings rate
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-4 text-xs font-medium text-ink-subtle">
                    Month
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-4 text-right text-xs font-medium text-ink-subtle"
                  >
                    Income
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-4 text-right text-xs font-medium text-ink-subtle"
                  >
                    Spent
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-4 text-right text-xs font-medium text-ink-subtle"
                  >
                    Saved
                  </th>
                  <th
                    scope="col"
                    className="w-32 py-2 text-right text-xs font-medium text-ink-subtle"
                  >
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...data.months].reverse().map((month) => (
                  <tr key={month.month}>
                    <td className="py-2.5 pr-4 font-medium text-ink">{month.label}</td>
                    <td className="tabular py-2.5 pr-4 text-right text-ink-muted">
                      {format(month.income, { compact: true })}
                    </td>
                    <td className="tabular py-2.5 pr-4 text-right text-ink-muted">
                      {format(month.expenses, { compact: true })}
                    </td>
                    <td className="tabular py-2.5 pr-4 text-right font-medium text-primary">
                      {format(month.savings, { compact: true })}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <Progress
                          className="w-16"
                          value={month.savingsRate}
                          size="sm"
                          animate={false}
                          tone={
                            month.savingsRate >= 20
                              ? 'positive'
                              : month.savingsRate >= 10
                                ? 'primary'
                                : 'warning'
                          }
                          label={`${month.label} savings rate`}
                        />
                        <span className="tabular w-10 text-right text-xs text-ink-muted">
                          {formatPercent(month.savingsRate)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </SlideUp>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Savings                                                                     */
/* -------------------------------------------------------------------------- */

function SavingsView() {
  const { format, currency } = useCurrency();
  const { data, isPending, error, refetch } = useSavingsAnalytics(12);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isPending) return <TwoCardSkeleton />;

  const hasData = data.cumulative.some((point) => point.balance > 0);
  const projectionEnd = data.projection[data.projection.length - 1];

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryTile
            label="Average savings rate"
            value={formatPercent(data.averageSavingsRate, 1)}
          />
          <SummaryTile
            label="Best month"
            value={
              data.bestMonth ? `${data.bestMonth.label} · ${format(data.bestMonth.savings)}` : '—'
            }
          />
          <SummaryTile
            label="Saved so far"
            value={format(data.cumulative[data.cumulative.length - 1]?.balance ?? 0)}
            accent
          />
        </div>
      </SlideUp>

      <SlideUp delay={0.05}>
        <ChartCard
          title="Savings, accumulating"
          description="Everything you have set aside, month by month"
          isEmpty={!hasData}
          emptyTitle="No savings recorded yet"
          emptyDescription="Contribute to a goal and this line starts climbing."
          height={280}
        >
          <SavingsGrowthChart
            data={data.cumulative.map((point) => ({ label: point.label, balance: point.balance }))}
            currency={currency}
            height={280}
          />
        </ChartCard>
      </SlideUp>

      <SlideUp delay={0.1}>
        <ChartCard
          title="If you keep this up"
          description="Twelve months at your current committed contributions"
          isEmpty={data.projection.length <= 1}
          emptyTitle="Nothing committed yet"
          emptyDescription="Set a monthly amount on a goal to see where it leads."
          height={260}
          footer={
            projectionEnd ? (
              <p className="text-xs leading-relaxed text-ink-subtle">
                Straight-line projection from what you have committed to your active goals. No
                interest or investment return is modelled — Savewise tracks money you hold, it does
                not promise a return. In twelve months this pace reaches{' '}
                <strong className="font-medium text-ink">{format(projectionEnd.balance)}</strong>.
              </p>
            ) : null
          }
        >
          <SavingsGrowthChart
            data={data.projection.map((point) => ({ label: point.label, balance: point.balance }))}
            currency={currency}
            height={260}
          />
        </ChartCard>
      </SlideUp>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

function CategoriesView() {
  const { format, currency } = useCurrency();
  const month = toMonthKey();
  const { data, isPending, error, refetch } = useCategoryAnalytics(month);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isPending) return <TwoCardSkeleton />;

  return (
    <div className="space-y-6">
      <SlideUp>
        <ChartCard
          title="Where this month went"
          description={`${format(data.total)} spent across ${data.categories.length} categories`}
          isEmpty={data.categories.length === 0}
          emptyTitle="Nothing spent this month"
          emptyDescription="Record an expense and the breakdown appears here."
          height={280}
        >
          <CategoryDonut data={data.categories} currency={currency} height={280} />
        </ChartCard>
      </SlideUp>

      <SlideUp delay={0.05}>
        <Card>
          <CardHeader title="Category detail" description="Compared with last month" as="h2" />

          {data.categories.length === 0 ? (
            <p className="mt-5 text-sm text-ink-muted">No spending recorded this month.</p>
          ) : (
            <ul className="mt-5 divide-y divide-border">
              {data.categories.map((category) => (
                <li key={category.category} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{category.label}</p>
                    <p className="text-2xs capitalize text-ink-subtle">{category.bucket}</p>
                  </div>

                  <div className="w-24 shrink-0 sm:w-32">
                    <Progress
                      value={category.percentage}
                      size="sm"
                      animate={false}
                      label={`${category.label} share of spending`}
                    />
                    <p className="tabular mt-1 text-2xs text-ink-subtle">
                      {formatPercent(category.percentage)} of spending
                    </p>
                  </div>

                  <div className="w-24 shrink-0 text-right sm:w-28">
                    <p className="tabular text-sm font-medium text-ink">
                      {format(category.amount)}
                    </p>
                    {category.changePercent !== null && (
                      <p className="mt-0.5 flex justify-end text-2xs">
                        <Delta value={category.changePercent} invert />
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </SlideUp>

      <SlideUp delay={0.1}>
        <Card>
          <CardHeader title="Needs, wants and savings" description="This month's split" as="h2" />

          <ul className="mt-5 space-y-4">
            {data.buckets.map((bucket) => (
              <li key={bucket.bucket}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium capitalize text-ink">{bucket.bucket}</span>
                  <span className="tabular text-ink-muted">
                    {format(bucket.amount)} · {formatPercent(bucket.percentage)}
                  </span>
                </div>
                <Progress
                  className="mt-2"
                  value={bucket.percentage}
                  tone={
                    bucket.bucket === 'needs'
                      ? 'primary'
                      : bucket.bucket === 'savings'
                        ? 'accent'
                        : 'neutral'
                  }
                  label={`${bucket.bucket} share`}
                />
              </li>
            ))}
          </ul>
        </Card>
      </SlideUp>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared                                                                      */
/* -------------------------------------------------------------------------- */

function SummaryTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={cn('tabular mt-1 text-lg font-semibold', accent ? 'text-primary' : 'text-ink')}>
        {value}
      </p>
    </div>
  );
}

function TwoCardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} lines={0} />
        ))}
      </div>
      <SkeletonCard lines={6} />
      <SkeletonCard lines={6} />
    </div>
  );
}
