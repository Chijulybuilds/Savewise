import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Page header.
 *
 * Owns the single `<h1>` for every application screen, which keeps the heading
 * outline correct without each page having to remember. Actions sit on the same
 * row on desktop and drop below the title on narrow screens rather than
 * squeezing — a "New goal" button that wraps to two lines looks broken.
 */

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Secondary controls — filters, a month picker — placed under the title. */
  toolbar?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, toolbar, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-prose text-sm text-ink-muted">{description}</p>}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {toolbar && <div className="mt-5">{toolbar}</div>}
    </header>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
