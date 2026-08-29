import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { describeError } from '@/lib/errorCopy';
import { Button } from './Button';

/**
 * Loading, empty and error states.
 *
 * Every asynchronous surface in Savewise renders one of these — there is no
 * screen that can show a blank rectangle while it thinks. They live together
 * because they are the same decision made three ways, and keeping them in one
 * file makes it obvious when a new screen has only handled one of them.
 */

/* -------------------------------------------------------------------------- */
/* Loading                                                                     */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden="true" />;
}

/**
 * A skeleton shaped like the content it replaces.
 *
 * Matching the real layout is what stops the page reflowing when data lands —
 * a generic grey box that is the wrong height causes exactly the jump it was
 * meant to prevent.
 */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      className={cn('rounded-2xl border border-border bg-surface p-5', className)}
      // One announcement for the whole block, rather than one per grey bar.
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-40" />
      <div className="mt-5 space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={index === lines - 1 ? 'w-2/3' : 'w-full'} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3"
        >
          <div className="skeleton size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/5" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty                                                                       */
/* -------------------------------------------------------------------------- */

interface EmptyStateProps {
  title: string;
  description: string;
  /** The one action that resolves the emptiness. */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * An empty state is an instruction, not an apology. Each one names the single
 * next action that would fill it.
 */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Error                                                                       */
/* -------------------------------------------------------------------------- */

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  /** Overrides the derived message where the screen has better context. */
  title?: string;
}

/**
 * Turns an unknown thrown value into something a person can act on.
 *
 * The message shown is always one we wrote. A server's internal error text
 * never reaches the screen — the API client already normalised 5xx bodies, and
 * this is the second gate.
 */
export function ErrorState({ error, onRetry, className, title }: ErrorStateProps) {
  const { heading, message, retryable } = describeError(error, title);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-critical/20 bg-critical-soft/40 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-critical/10 text-critical">
        <svg viewBox="0 0 20 20" className="size-5" fill="currentColor" aria-hidden="true">
          <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.5a.9.9 0 0 1 .9.9v4.2a.9.9 0 0 1-1.8 0V6.4a.9.9 0 0 1 .9-.9Zm0 8.9a1.05 1.05 0 1 1 0-2.1 1.05 1.05 0 0 1 0 2.1Z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-ink">{heading}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{message}</p>
      {onRetry && retryable && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
