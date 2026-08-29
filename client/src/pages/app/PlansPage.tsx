import { useState } from 'react';

import {
  FREQUENCY_LABELS,
  formatDate,
  formatRelative,
  type PlanDto,
  type PlanStatus,
} from '@savewise/shared';

import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { Badge, PlanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Progress } from '@/components/ui/Progress';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { PlanFormModal } from '@/features/plans/PlanFormModal';
import {
  useDeletePlan,
  usePlans,
  useRecordPlanContribution,
  useUpdatePlan,
} from '@/hooks/useApiQueries';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageMeta } from '@/hooks/usePageMeta';
import { cn } from '@/lib/cn';
import { toast } from '@/store/toastStore';

/**
 * Savings plans.
 *
 * A plan is a *schedule*, not a standing order. Every piece of copy on this
 * screen says so, and the primary action is "Record contribution" rather than
 * "Pay" — Savewise has no access to anyone's money and must never look as
 * though it does.
 */

type Filter = 'all' | PlanStatus;

const FILTERS = [
  { value: 'all' as const, label: 'All' },
  { value: 'active' as const, label: 'Active' },
  { value: 'paused' as const, label: 'Paused' },
  { value: 'completed' as const, label: 'Complete' },
];

export default function PlansPage() {
  usePageMeta({ title: 'Savings plans — Savewise', noIndex: true });

  const [filter, setFilter] = useState<Filter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlanDto | null>(null);
  const [deleting, setDeleting] = useState<PlanDto | null>(null);

  const { data, isPending, error, refetch } = usePlans(filter === 'all' ? {} : { status: filter });
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();
  const recordContribution = useRecordPlanContribution();

  async function toggleStatus(plan: PlanDto) {
    const nextStatus = plan.status === 'paused' ? 'active' : 'paused';
    try {
      await updatePlan.mutateAsync({ id: plan.id, input: { status: nextStatus } });
      toast.success(nextStatus === 'paused' ? 'Plan paused' : 'Plan resumed');
    } catch {
      toast.error('Could not update that plan');
    }
  }

  async function contribute(plan: PlanDto) {
    try {
      await recordContribution.mutateAsync({ id: plan.id, input: {} });
      toast.success(
        'Contribution recorded',
        plan.goalName ? `${plan.goalName} has been credited too.` : undefined,
      );
    } catch {
      toast.error('Could not record that contribution');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deletePlan.mutateAsync(deleting.id);
      toast.success('Plan deleted', 'Contributions you already recorded are unaffected.');
      setDeleting(null);
    } catch {
      toast.error('Could not delete that plan');
    }
  }

  return (
    <>
      <PageHeader
        title="Savings plans"
        description="A fixed amount, on a schedule, with a projected finish date."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New plan
          </Button>
        }
        toolbar={
          <Tabs
            items={FILTERS}
            value={filter}
            onChange={setFilter}
            label="Filter plans by status"
          />
        }
      />

      <p className="mb-6 rounded-xl border border-border bg-surface-sunken/50 px-4 py-3 text-xs leading-relaxed text-ink-muted">
        Savewise does not move money. A plan is a schedule you keep — record each contribution when
        you actually make it, and Savewise tracks the progress and the projection.
      </p>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} lines={4} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No savings plans yet' : `No ${filter} plans`}
          description={
            filter === 'all'
              ? 'A plan turns a goal into a rhythm: ₦55,000 every month until it is funded.'
              : 'Try a different filter, or create a new plan.'
          }
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Create a plan
            </Button>
          }
        />
      ) : (
        <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" stagger={0.05}>
          {data.map((plan) => (
            <StaggerItem key={plan.id} as="div">
              <PlanCard
                plan={plan}
                onContribute={(target) => void contribute(target)}
                onEdit={(target) => {
                  setEditing(target);
                  setFormOpen(true);
                }}
                onDelete={setDeleting}
                onToggleStatus={(target) => void toggleStatus(target)}
                busy={recordContribution.isPending}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <PlanFormModal open={formOpen} onClose={() => setFormOpen(false)} plan={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={`Delete ${deleting?.name ?? 'this plan'}?`}
        description="The schedule is removed. Contributions you already recorded stay in your history."
        confirmLabel="Delete plan"
        loading={deletePlan.isPending}
      />
    </>
  );
}

interface PlanCardProps {
  plan: PlanDto;
  onContribute: (plan: PlanDto) => void;
  onEdit: (plan: PlanDto) => void;
  onDelete: (plan: PlanDto) => void;
  onToggleStatus: (plan: PlanDto) => void;
  busy: boolean;
}

function PlanCard({ plan, onContribute, onEdit, onDelete, onToggleStatus, busy }: PlanCardProps) {
  const { format } = useCurrency();
  const { projection } = plan;
  const isDone = plan.status === 'completed';
  const canContribute = plan.status === 'active';

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl border bg-surface p-5 transition-colors duration-200',
        plan.status === 'paused' || plan.status === 'cancelled'
          ? 'border-dashed border-border'
          : 'border-border hover:border-border-strong',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{plan.name}</h3>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            {format(plan.contributionAmount)} · {FREQUENCY_LABELS[plan.frequency].toLowerCase()}
          </p>
        </div>

        <Dropdown
          label={`Actions for ${plan.name}`}
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={`Actions for ${plan.name}`}
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
                  onEdit(plan);
                }}
              >
                Edit plan
              </DropdownItem>
              <DropdownItem
                disabled={isDone}
                onSelect={() => {
                  close();
                  onToggleStatus(plan);
                }}
              >
                {plan.status === 'paused' ? 'Resume plan' : 'Pause plan'}
              </DropdownItem>

              <DropdownSeparator />

              <DropdownItem
                destructive
                onSelect={() => {
                  close();
                  onDelete(plan);
                }}
              >
                Delete plan
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <PlanStatusBadge status={plan.status} />
        {plan.goalName && <Badge tone="primary">{plan.goalName}</Badge>}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="tabular text-xl font-semibold text-ink">
            {format(plan.contributedAmount)}
          </span>
          <span className="tabular text-xs text-ink-subtle">of {format(plan.targetAmount)}</span>
        </div>

        <Progress
          className="mt-3"
          size="lg"
          value={projection.percentComplete}
          tone={isDone ? 'positive' : 'primary'}
          label={`${plan.name} progress`}
        />

        <p className="tabular mt-2 text-xs text-ink-muted">
          {Math.round(projection.percentComplete)}% complete
          {projection.contributionsRemaining > 0 &&
            ` · ${projection.contributionsRemaining} contribution${projection.contributionsRemaining === 1 ? '' : 's'} to go`}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
        <div>
          <dt className="text-ink-subtle">Monthly equivalent</dt>
          <dd className="tabular mt-0.5 font-medium text-ink">
            {format(projection.monthlyEquivalent)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-subtle">{isDone ? 'Completed' : 'Projected finish'}</dt>
          <dd className="tabular mt-0.5 font-medium text-ink">
            {projection.projectedCompletionDate
              ? formatDate(projection.projectedCompletionDate)
              : '—'}
          </dd>
        </div>
      </dl>

      {canContribute && projection.nextContributionDate && (
        <p className="mt-3 text-2xs text-ink-subtle">
          Next contribution due {formatRelative(projection.nextContributionDate)}
        </p>
      )}

      <Button
        variant={isDone ? 'outline' : 'primary'}
        size="sm"
        className="mt-5 w-full"
        disabled={!canContribute}
        loading={busy}
        onClick={() => onContribute(plan)}
      >
        {isDone ? 'Plan complete' : `Record ${format(plan.contributionAmount)}`}
      </Button>
    </article>
  );
}
