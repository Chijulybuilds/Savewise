import { motion } from 'motion/react';
import { useId, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { SPRING } from '@/lib/motion';

/**
 * Tabs.
 *
 * Implements the ARIA tabs pattern properly, which mostly means getting the
 * keyboard right: arrow keys move between tabs, Home and End jump to the ends,
 * and only the selected tab is in the page's tab order (`tabIndex={-1}` on the
 * rest). Without that, a keyboard user has to Tab through every tab to reach
 * the panel.
 *
 * The active indicator is a single shared element animated with `layoutId`, so
 * it *slides* between tabs rather than cross-fading. That movement is what
 * makes the relationship between the tabs legible.
 */

export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Optional count or status shown after the label. */
  badge?: ReactNode;
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** `pill` for filters inside a card, `underline` for page-level sections. */
  variant?: 'pill' | 'underline';
  label: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  variant = 'pill',
  label,
}: TabsProps<T>) {
  const groupId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: React.KeyboardEvent) {
    const index = items.findIndex((item) => item.value === value);
    if (index === -1) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;

    if (nextIndex === null) return;

    event.preventDefault();
    const next = items[nextIndex];
    if (!next) return;
    onChange(next.value);
    refs.current[next.value]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'flex items-center gap-1',
        variant === 'pill' ? 'rounded-xl bg-surface-sunken p-1' : 'border-b border-border',
        // Horizontal scroll rather than wrapping: a tab strip that wraps to two
        // rows on a 320px screen breaks the "one row of choices" affordance.
        'overflow-x-auto',
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(element) => {
              refs.current[item.value] = element;
            }}
            role="tab"
            type="button"
            id={`${groupId}-${item.value}`}
            aria-selected={selected}
            aria-controls={`${groupId}-${item.value}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              variant === 'pill' ? 'h-8 rounded-lg' : 'h-10 rounded-t-lg',
              selected ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {selected && (
              <motion.span
                // One element shared across every tab — this is what makes the
                // indicator travel instead of blink.
                layoutId={`${groupId}-indicator`}
                transition={SPRING}
                className={cn(
                  'absolute inset-0 -z-10',
                  variant === 'pill'
                    ? 'rounded-lg bg-surface shadow-xs'
                    : 'rounded-none border-b-2 border-primary',
                )}
              />
            )}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  children: ReactNode;
  className?: string;
}

export function TabPanel({ children, className }: TabPanelProps) {
  return (
    <div role="tabpanel" tabIndex={0} className={cn('focus-visible:outline-none', className)}>
      {children}
    </div>
  );
}
