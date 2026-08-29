import type { ReactNode } from 'react';

import type { BudgetHealth, GoalStatus, PlanStatus } from '@savewise/shared';

import { cn } from '@/lib/cn';

/**
 * Badge.
 *
 * Status is never carried by colour alone — every badge shows a word, and the
 * health variants add a shape. A user who cannot distinguish the amber from the
 * green still reads "Watch".
 */

export type BadgeTone =
  'neutral' | 'primary' | 'positive' | 'warning' | 'critical' | 'info' | 'accent';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted ring-border',
  primary: 'bg-primary-soft text-primary ring-primary/20',
  positive: 'bg-positive-soft text-positive ring-positive/20',
  warning: 'bg-warning-soft text-warning ring-warning/25',
  critical: 'bg-critical-soft text-critical ring-critical/25',
  info: 'bg-info-soft text-info ring-info/20',
  accent: 'bg-accent-soft text-accent ring-accent/25',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  /** A small leading dot. Useful for status, redundant for counts. */
  dot?: boolean;
}

export function Badge({ tone = 'neutral', dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Domain badges                                                               */
/* -------------------------------------------------------------------------- */

const HEALTH_COPY: Record<BudgetHealth, { label: string; tone: BadgeTone }> = {
  healthy: { label: 'Healthy', tone: 'positive' },
  watch: { label: 'Watch', tone: 'warning' },
  exceeded: { label: 'Exceeded', tone: 'critical' },
};

export function HealthBadge({ health }: { health: BudgetHealth }) {
  const { label, tone } = HEALTH_COPY[health];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

const GOAL_STATUS_COPY: Record<GoalStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'primary' },
  paused: { label: 'Paused', tone: 'neutral' },
  completed: { label: 'Funded', tone: 'positive' },
  archived: { label: 'Archived', tone: 'neutral' },
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const { label, tone } = GOAL_STATUS_COPY[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const PLAN_STATUS_COPY: Record<PlanStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'primary' },
  paused: { label: 'Paused', tone: 'neutral' },
  completed: { label: 'Complete', tone: 'positive' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const { label, tone } = PLAN_STATUS_COPY[status];
  return <Badge tone={tone}>{label}</Badge>;
}
