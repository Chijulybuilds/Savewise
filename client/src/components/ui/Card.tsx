import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Card — the primary content surface.
 *
 * One border, one radius, one shadow. Financial interfaces get noisy fast, and
 * the fastest way to make a dashboard look like a template is to give every
 * panel a different elevation. Elevation here means *interactivity*, not
 * importance: `interactive` cards lift, static ones do not.
 */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover affordances. Use only when the whole card is clickable. */
  interactive?: boolean;
  /** Removes the inner padding, for cards that own their own layout. */
  flush?: boolean;
}

export function Card({ interactive, flush, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface shadow-xs',
        !flush && 'p-5',
        interactive &&
          'cursor-pointer transition-[border-color,box-shadow] duration-200 ease-swift hover:border-border-strong hover:shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned controls: a filter, a menu, a link. */
  action?: ReactNode;
  className?: string;
  /** Heading level, so a card in a subsection does not break the outline. */
  as?: 'h2' | 'h3' | 'h4';
}

export function CardHeader({
  title,
  description,
  action,
  className,
  as: Heading = 'h3',
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <Heading className="text-sm font-semibold text-ink">{title}</Heading>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-4 flex items-center gap-3 border-t border-border pt-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}
