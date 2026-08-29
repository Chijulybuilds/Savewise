import { useState } from 'react';

import {
  BUDGET_BUCKETS,
  formatMonthKey,
  recentMonths,
  shiftMonth,
  toMonthKey,
  type BudgetCategoryDto,
} from '@savewise/shared';

import { BudgetComparisonChart } from '@/components/charts/Charts';
import { ChartCard } from '@/components/charts/ChartCard';
import { SlideUp, Stagger, StaggerItem } from '@/components/motion/Reveal';
import { Badge, HealthBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Progress, SegmentedProgress } from '@/components/ui/Progress';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/States';
import { BudgetEditor } from '@/features/budget/BudgetEditor';
import { useBudgetForMonth } from '@/hooks/useApiQueries';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageMeta } from '@/hooks/usePageMeta';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/authStore';

/**
 * Budget.
 *
 * The screen answers "am I on course?", not just "what did I plan?". The pace
 * comparison — percentage of budget spent against percentage of the month
 * elapsed — is the piece most budgeting tools leave out, and it is the only
 * thing that turns a progress bar into a warning while there is still time to
 * act on it.
 */

const MONTH_OPTIONS = recentMonths(12)
  .concat(shiftMonth(toMonthKey(), 1))
  .reverse()
  .map((month) => ({ value: month, label: formatMonthKey(month) }));

export default function BudgetPage() {
  usePageMeta({ title: 'Budget — Savewise', noIndex: true });

  const [month, setMonth] = useState(toMonthKey());
  const [editorOpen, setEditorOpen] = useState(false);

  const { format, currency } = useCurrency();
  const monthlyIncome = useAuthStore((state) => state.user?.monthlyIncome ?? 0);
  const { data: budget, isPending, error, refetch } = useBudgetForMonth(month);

  return (
    <>
      <PageHeader
        title="Budget"
        description="Set a limit for each category, then watch the month against it."
        actions={
          budget ? (
            <Button variant="outline" onClick={() => setEditorOpen(true)}>
              Edit budget
            </Button>
          ) : (
            <Button onClick={() => setEditorOpen(true)}>Create budget</Button>
          )
        }
        toolbar={
          <div className="max-w-xs">
            <label htmlFor="budget-month" className="sr-only">
              Choose a month
            </label>
            <Select
              id="budget-month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              options={MONTH_OPTIONS}
            />
          </div>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="space-y-6">
          <SkeletonCard lines={3} />
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonCard lines={5} />
            <SkeletonCard lines={5} />
          </div>
        </div>
      ) : !budget ? (
        <EmptyState
          title={`No budget for ${formatMonthKey(month)}`}
          description="A budget is a set of limits you decide before the month starts. Savewise tracks your actual spending against them as you go."
          action={
            <Button onClick={() => setEditorOpen(true)}>Create this month&rsquo;s budget</Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <SlideUp>
            <Card>
              <CardHeader
                title={`${budget.monthLabel} at a glance`}
                description={`${Math.round(budget.totals.monthElapsedPercentage)}% of the month has passed`}
                action={<HealthBadge health={budget.totals.health} />}
                as="h2"
              />

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="tabular text-2xl font-semibold text-ink">
                      {format(budget.totals.spent)}
                    </span>
                    <span className="tabular text-sm text-ink-subtle">
                      of {format(budget.totals.budgeted)}
                    </span>
                  </div>

                  <Progress
                    className="mt-3"
                    size="lg"
                    value={budget.totals.percentageUsed}
                    tone={
                      budget.totals.health === 'exceeded'
                        ? 'critical'
                        : budget.totals.health === 'watch'
                          ? 'warning'
                          : 'primary'
                    }
                    label="Budget used this month"
                  />

                  <PaceNote
                    used={budget.totals.percentageUsed}
                    elapsed={budget.totals.monthElapsedPercentage}
                    projected={format(budget.totals.projectedMonthEndSpend)}
                    budgeted={format(budget.totals.budgeted)}
                    willExceed={budget.totals.projectedMonthEndSpend > budget.totals.budgeted}
                  />
                </div>

                <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5 text-xs lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <Stat label="Planned income" value={format(budget.plannedIncome)} />
                  <Stat label="Actual income" value={format(budget.totals.actualIncome)} />
                  <Stat label="Planned savings" value={format(budget.plannedSavings)} />
                  <Stat label="Actually saved" value={format(budget.totals.actualSavings)} accent />
                </dl>
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-3 text-xs font-medium text-ink">Needs, wants and savings</p>

                <SegmentedProgress
                  label="Budget split by bucket"
                  segments={BUDGET_BUCKETS.map((bucket) => {
                    const entry = budget.buckets.find((item) => item.bucket === bucket);
                    return {
                      value: entry?.budgeted ?? 0,
                      tone:
                        bucket === 'needs'
                          ? 'primary'
                          : bucket === 'savings'
                            ? 'accent'
                            : 'neutral',
                      label: bucket,
                    } as const;
                  })}
                />

                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {budget.buckets.map((bucket) => (
                    <li key={bucket.bucket} className="flex items-center gap-2 text-xs">
                      <span
                        className={cn(
                          'size-2 rounded-sm',
                          bucket.bucket === 'needs'
                            ? 'bg-primary'
                            : bucket.bucket === 'savings'
                              ? 'bg-accent'
                              : 'bg-ink-subtle',
                        )}
                        aria-hidden="true"
                      />
                      <span className="capitalize text-ink-muted">{bucket.bucket}</span>
                      <span className="tabular font-medium text-ink">
                        {format(bucket.budgeted)}
                      </span>
                      <span className="tabular text-ink-subtle">
                        {Math.round(bucket.percentageOfIncome)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </SlideUp>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <SlideUp>
              <Card flush className="p-5">
                <CardHeader title="By category" description="Limit against actual spend" as="h2" />

                {budget.categories.length === 0 ? (
                  <EmptyState
                    className="mt-4 border-0 py-10"
                    title="No category limits set"
                    description="Add limits to see where the month is going."
                    action={
                      <Button size="sm" variant="outline" onClick={() => setEditorOpen(true)}>
                        Add limits
                      </Button>
                    }
                  />
                ) : (
                  <Stagger className="mt-5 space-y-4" stagger={0.04}>
                    {budget.categories.map((line) => (
                      <StaggerItem key={line.category} as="div">
                        <CategoryRow line={line} />
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </Card>
            </SlideUp>

            <SlideUp delay={0.06}>
              <ChartCard
                title="Budgeted vs spent"
                description={budget.monthLabel}
                isEmpty={budget.categories.length === 0}
                emptyTitle="Nothing to compare yet"
                emptyDescription="Set some category limits and the comparison appears here."
                height={340}
              >
                <BudgetComparisonChart
                  data={budget.categories
                    .filter((line) => line.budgeted > 0 || line.spent > 0)
                    .slice(0, 8)
                    .map((line) => ({
                      label: line.label,
                      budgeted: line.budgeted,
                      spent: line.spent,
                    }))}
                  currency={currency}
                  height={340}
                />
              </ChartCard>
            </SlideUp>
          </div>

          {budget.notes && (
            <SlideUp>
              <Card>
                <CardHeader title="Notes" as="h2" />
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{budget.notes}</p>
              </Card>
            </SlideUp>
          )}
        </div>
      )}

      <BudgetEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        month={month}
        budget={budget}
        suggestedIncome={monthlyIncome}
      />
    </>
  );
}

function CategoryRow({ line }: { line: BudgetCategoryDto }) {
  const { format } = useCurrency();

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{line.label}</span>
          {line.budgeted === 0 && (
            <Badge tone="neutral" className="shrink-0">
              Unbudgeted
            </Badge>
          )}
        </span>

        <span className="tabular shrink-0 text-xs text-ink-muted">
          {format(line.spent)}
          {line.budgeted > 0 && ` of ${format(line.budgeted)}`}
        </span>
      </div>

      <Progress
        className="mt-2"
        value={line.budgeted > 0 ? line.percentageUsed : 100}
        tone={
          line.health === 'exceeded' ? 'critical' : line.health === 'watch' ? 'warning' : 'primary'
        }
        label={`${line.label} budget used`}
      />

      <p className="tabular mt-1.5 text-2xs text-ink-subtle">
        {line.budgeted === 0
          ? 'Spent outside your budget'
          : line.overspend > 0
            ? `${format(line.overspend)} over`
            : `${format(line.remaining)} left`}
      </p>
    </div>
  );
}

/**
 * The pace comparison.
 *
 * Spending 60% of a budget is fine on the 20th and alarming on the 5th. Stating
 * both numbers together is what makes the bar above it actionable.
 */
function PaceNote({
  used,
  elapsed,
  projected,
  budgeted,
  willExceed,
}: {
  used: number;
  elapsed: number;
  projected: string;
  budgeted: string;
  willExceed: boolean;
}) {
  const ahead = used > elapsed + 10;

  return (
    <p
      className={cn(
        'mt-4 rounded-lg px-3 py-2.5 text-xs leading-relaxed',
        willExceed || ahead ? 'bg-warning-soft text-ink' : 'bg-surface-sunken text-ink-muted',
      )}
    >
      {Math.round(used)}% of the budget spent, {Math.round(elapsed)}% of the month gone.{' '}
      {willExceed
        ? `At this pace you would finish the month around ${projected}, against a ${budgeted} budget.`
        : `At this pace you would finish around ${projected} — inside your ${budgeted} budget.`}
    </p>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-ink-subtle">{label}</dt>
      <dd className={cn('tabular mt-0.5 font-medium', accent ? 'text-primary' : 'text-ink')}>
        {value}
      </dd>
    </div>
  );
}
