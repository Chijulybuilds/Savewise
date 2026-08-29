import type { GoalDto, GoalPace } from '@savewise/shared';
import { formatDate, goalCategoryLabel } from '@savewise/shared';

import { Badge, GoalStatusBadge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/cn';
import { useCurrency } from '@/hooks/useCurrency';

/**
 * A savings goal.
 *
 * The card answers the four questions in order: how far along, how much is
 * left, when it is due, and — the one people never work out — what it costs per
 * month to actually land on that date.
 *
 * Pace is stated in words rather than implied by a colour, because "ahead of
 * schedule" and "behind schedule" are the whole point of tracking a goal.
 */

const PACE_COPY: Record<GoalPace, { label: string; tone: BadgeTone } | null> = {
  ahead: { label: 'Ahead of schedule', tone: 'positive' },
  on_track: { label: 'On track', tone: 'primary' },
  behind: { label: 'Behind schedule', tone: 'warning' },
  stalled: { label: 'No monthly amount set', tone: 'neutral' },
  completed: { label: 'Fully funded', tone: 'positive' },
  no_deadline: null,
};

interface GoalCardProps {
  goal: GoalDto;
  onContribute: (goal: GoalDto) => void;
  onEdit: (goal: GoalDto) => void;
  onDelete: (goal: GoalDto) => void;
  onToggleStatus: (goal: GoalDto) => void;
}

export function GoalCard({ goal, onContribute, onEdit, onDelete, onToggleStatus }: GoalCardProps) {
  const { format } = useCurrency();
  const { progress } = goal;
  const pace = PACE_COPY[progress.pace];

  const tone = progress.isComplete
    ? 'positive'
    : progress.pace === 'behind'
      ? 'warning'
      : 'primary';

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl border bg-surface p-5 transition-colors duration-200',
        goal.status === 'paused'
          ? 'border-dashed border-border'
          : 'border-border hover:border-border-strong',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{goal.name}</h3>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            {goalCategoryLabel(goal.category)}
            {goal.deadline ? ` · due ${formatDate(goal.deadline)}` : ' · no deadline'}
          </p>
        </div>

        <Dropdown
          label={`Actions for ${goal.name}`}
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={`Actions for ${goal.name}`}
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
                <circle cx="8" cy="3.5" r="1.3" />
                <circle cx="8" cy="8" r="1.3" />
                <circle cx="8" cy="12.5" r="1.3" />
              </svg>
            </button>
          )}
        >
          {({ close }) => (
            <>
              <DropdownItem
                onSelect={() => {
                  close();
                  onContribute(goal);
                }}
                disabled={goal.status === 'completed' || goal.status === 'archived'}
              >
                Record contribution
              </DropdownItem>
              <DropdownItem
                onSelect={() => {
                  close();
                  onEdit(goal);
                }}
              >
                Edit goal
              </DropdownItem>
              <DropdownItem
                onSelect={() => {
                  close();
                  onToggleStatus(goal);
                }}
                disabled={goal.status === 'completed'}
              >
                {goal.status === 'paused' ? 'Resume goal' : 'Pause goal'}
              </DropdownItem>

              <DropdownSeparator />

              <DropdownItem
                destructive
                onSelect={() => {
                  close();
                  onDelete(goal);
                }}
              >
                Delete goal
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <GoalStatusBadge status={goal.status} />
        {pace && goal.status === 'active' && <Badge tone={pace.tone}>{pace.label}</Badge>}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="tabular text-xl font-semibold text-ink">
            {format(goal.currentAmount)}
          </span>
          <span className="tabular text-xs text-ink-subtle">of {format(goal.targetAmount)}</span>
        </div>

        <Progress
          value={progress.percentComplete}
          tone={tone}
          size="lg"
          label={`${goal.name} progress`}
          className="mt-3"
        />

        <p className="tabular mt-2 text-xs text-ink-muted">
          {Math.round(progress.percentComplete)}% funded
          {progress.remainingAmount > 0 && ` · ${format(progress.remainingAmount)} to go`}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
        <div>
          <dt className="text-ink-subtle">Your monthly amount</dt>
          <dd className="tabular mt-0.5 font-medium text-ink">
            {goal.monthlyContribution > 0 ? format(goal.monthlyContribution) : 'Not set'}
          </dd>
        </div>

        <div>
          <dt className="text-ink-subtle">
            {goal.deadline ? 'Needed to hit the date' : 'Projected completion'}
          </dt>
          <dd
            className={cn(
              'tabular mt-0.5 font-medium',
              progress.pace === 'behind' ? 'text-warning' : 'text-ink',
            )}
          >
            {progress.isComplete
              ? 'Complete'
              : goal.deadline
                ? `${format(progress.requiredMonthlyContribution)}/mo`
                : progress.projectedCompletionDate
                  ? formatDate(progress.projectedCompletionDate)
                  : 'Not on track'}
          </dd>
        </div>
      </dl>

      <Button
        variant={progress.isComplete ? 'outline' : 'primary'}
        size="sm"
        className="mt-5 w-full"
        onClick={() => onContribute(goal)}
        disabled={goal.status === 'completed' || goal.status === 'archived'}
      >
        {progress.isComplete ? 'Goal funded' : 'Record contribution'}
      </Button>
    </article>
  );
}
