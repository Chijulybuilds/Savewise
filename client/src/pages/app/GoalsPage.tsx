import { useState } from 'react';

import type { GoalDto, GoalStatus } from '@savewise/shared';

import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RingProgress } from '@/components/ui/Progress';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { ContributeModal } from '@/features/goals/ContributeModal';
import { GoalCard } from '@/features/goals/GoalCard';
import { GoalFormModal } from '@/features/goals/GoalFormModal';
import { useCurrency } from '@/hooks/useCurrency';
import { useDeleteGoal, useGoals, useUpdateGoal } from '@/hooks/useApiQueries';
import { usePageMeta } from '@/hooks/usePageMeta';
import { toast } from '@/store/toastStore';

/**
 * Goals.
 *
 * The page owns which dialog is open and which goal it is acting on; the cards
 * are presentational and report intent upward. That keeps three modals from
 * each needing their own copy of "which goal did they click?".
 */

type Filter = 'all' | GoalStatus;

const FILTERS = [
  { value: 'all' as const, label: 'All' },
  { value: 'active' as const, label: 'Active' },
  { value: 'paused' as const, label: 'Paused' },
  { value: 'completed' as const, label: 'Funded' },
];

export default function GoalsPage() {
  usePageMeta({ title: 'Savings goals — Savewise', noIndex: true });

  const [filter, setFilter] = useState<Filter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalDto | null>(null);
  const [contributing, setContributing] = useState<GoalDto | null>(null);
  const [deleting, setDeleting] = useState<GoalDto | null>(null);

  const { format } = useCurrency();
  const { data, isPending, error, refetch } = useGoals(filter === 'all' ? {} : { status: filter });
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  async function toggleStatus(goal: GoalDto) {
    const nextStatus = goal.status === 'paused' ? 'active' : 'paused';
    try {
      await updateGoal.mutateAsync({ id: goal.id, input: { status: nextStatus } });
      toast.success(nextStatus === 'paused' ? 'Goal paused' : 'Goal resumed');
    } catch {
      toast.error('Could not update that goal');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteGoal.mutateAsync(deleting.id);
      // Contributions are kept and detached, not deleted — saying so here stops
      // the user assuming their savings history just vanished.
      toast.success('Goal deleted', 'Its past contributions stay in your transaction history.');
      setDeleting(null);
    } catch {
      toast.error('Could not delete that goal');
    }
  }

  const overview = data?.overview;

  return (
    <>
      <PageHeader
        title="Savings goals"
        description="Each goal has a target, a date, and the monthly amount that gets you there."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New goal
          </Button>
        }
        toolbar={
          <Tabs
            items={FILTERS}
            value={filter}
            onChange={setFilter}
            label="Filter goals by status"
          />
        }
      />

      {overview && overview.activeCount + overview.completedCount > 0 && (
        <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <RingProgress
              value={overview.percentComplete}
              size={96}
              strokeWidth={9}
              label="Combined progress across all goals"
            >
              <span className="tabular text-base font-semibold text-ink">
                {Math.round(overview.percentComplete)}%
              </span>
            </RingProgress>

            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Stat label="Saved so far" value={format(overview.totalSaved)} />
              <Stat label="Combined target" value={format(overview.totalTarget)} />
              <Stat label="Still to go" value={format(overview.totalRemaining)} />
              <Stat label="Committed monthly" value={format(overview.committedMonthly)} accent />
            </dl>
          </div>
        </section>
      )}

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} lines={4} />
          ))}
        </div>
      ) : data.goals.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'No goals yet' : `No ${filter} goals`}
          description={
            filter === 'all'
              ? 'A goal turns "save more" into a number and a date. Savewise handles the arithmetic from there.'
              : 'Try a different filter, or create a new goal.'
          }
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Create a goal
            </Button>
          }
        />
      ) : (
        <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" stagger={0.05}>
          {data.goals.map((goal) => (
            <StaggerItem key={goal.id} as="div">
              <GoalCard
                goal={goal}
                onContribute={setContributing}
                onEdit={(target) => {
                  setEditing(target);
                  setFormOpen(true);
                }}
                onDelete={setDeleting}
                onToggleStatus={(target) => void toggleStatus(target)}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <GoalFormModal open={formOpen} onClose={() => setFormOpen(false)} goal={editing} />

      <ContributeModal
        open={contributing !== null}
        onClose={() => setContributing(null)}
        goal={contributing}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={`Delete ${deleting?.name ?? 'this goal'}?`}
        description="The goal is removed. Contributions you already recorded stay in your transaction history."
        confirmLabel="Delete goal"
        loading={deleteGoal.isPending}
      />
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className={`tabular mt-1 text-sm font-semibold ${accent ? 'text-primary' : 'text-ink'}`}>
        {value}
      </dd>
    </div>
  );
}
