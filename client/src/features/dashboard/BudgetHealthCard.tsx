import { Link } from 'react-router-dom';

import type { OverviewDto } from '@savewise/shared';

import { HealthBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { useCurrency } from '@/hooks/useCurrency';

/**
 * Budget health.
 *
 * Handles the case that matters most on a fresh account: no budget for this
 * month. Rather than rendering a bar at 0% — which reads as "you have spent
 * nothing", the opposite of the truth — it shows what has actually been spent
 * and offers to set limits.
 */
export function BudgetHealthCard({ data }: { data: OverviewDto }) {
  const { format } = useCurrency();
  const { budget } = data;

  if (!budget.exists) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader title="Budget health" description={`No budget set for ${data.monthLabel}`} />

        <div className="mt-5 flex-1">
          <p className="text-2xl font-semibold text-ink">{format(budget.spent)}</p>
          <p className="mt-1 text-xs text-ink-muted">spent so far this month, against no limits</p>
        </div>

        <ButtonLink to="/budget" variant="outline" size="sm" className="mt-5 w-full">
          Set this month&rsquo;s limits
        </ButtonLink>
      </Card>
    );
  }

  const tone =
    budget.health === 'exceeded' ? 'critical' : budget.health === 'watch' ? 'warning' : 'primary';

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Budget health"
        description={data.monthLabel}
        action={<HealthBadge health={budget.health} />}
      />

      <div className="mt-6 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-2xl font-semibold text-ink">
            {Math.round(budget.percentageUsed)}%
          </span>
          <span className="text-xs text-ink-muted">of budget used</span>
        </div>

        <Progress
          value={budget.percentageUsed}
          tone={tone}
          size="lg"
          label="Budget used this month"
          className="mt-3"
        />

        <dl className="mt-5 grid grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-ink-subtle">Spent</dt>
            <dd className="tabular mt-0.5 font-medium text-ink">{format(budget.spent)}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">
              {budget.health === 'exceeded' ? 'Over budget' : 'Remaining'}
            </dt>
            <dd
              className={`tabular mt-0.5 font-medium ${budget.health === 'exceeded' ? 'text-critical' : 'text-ink'}`}
            >
              {format(
                budget.health === 'exceeded' ? budget.spent - budget.budgeted : budget.remaining,
              )}
            </dd>
          </div>
        </dl>
      </div>

      <Link
        to="/budget"
        className="mt-5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Open budget →
      </Link>
    </Card>
  );
}
