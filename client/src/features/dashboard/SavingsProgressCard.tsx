import { Link } from 'react-router-dom';

import type { OverviewDto } from '@savewise/shared';

import { AnimatedMoney } from '@/components/ui/AnimatedNumber';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { RingProgress } from '@/components/ui/Progress';
import { useCurrency } from '@/hooks/useCurrency';

/**
 * Combined goal progress.
 *
 * A ring rather than a bar: this is a single share-of-whole figure, and the
 * ring gives the card a focal point that a fourth horizontal bar would not.
 */
export function SavingsProgressCard({ data }: { data: OverviewDto }) {
  const { format } = useCurrency();
  const { goals } = data;

  if (goals.activeCount === 0 && goals.completedCount === 0) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader title="Savings goals" description="Nothing being saved for yet" />
        <div className="mt-5 flex-1">
          <p className="text-sm leading-relaxed text-ink-muted">
            A goal turns "save more" into a number and a date — and Savewise works out what each
            month has to look like.
          </p>
        </div>
        <ButtonLink to="/goals" size="sm" className="mt-5 w-full">
          Create your first goal
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Savings goals"
        description={`${goals.activeCount} active${goals.completedCount > 0 ? ` · ${goals.completedCount} funded` : ''}`}
      />

      <div className="mt-4 flex flex-1 items-center gap-5">
        <RingProgress
          value={goals.percentComplete}
          size={104}
          strokeWidth={9}
          label="Combined goal progress"
        >
          <span className="tabular text-lg font-semibold text-ink">
            {Math.round(goals.percentComplete)}%
          </span>
          <span className="text-2xs text-ink-subtle">funded</span>
        </RingProgress>

        <dl className="min-w-0 flex-1 space-y-3 text-xs">
          <div>
            <dt className="text-ink-subtle">Saved</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink">
              <AnimatedMoney value={goals.totalSaved} currency={data.currency} />
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Still to go</dt>
            <dd className="tabular mt-0.5 font-medium text-ink-muted">
              {format(goals.totalRemaining)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Committed monthly</dt>
            <dd className="tabular mt-0.5 font-medium text-primary">
              {format(goals.committedMonthly)}
            </dd>
          </div>
        </dl>
      </div>

      <Link
        to="/goals"
        className="mt-5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        View all goals →
      </Link>
    </Card>
  );
}
