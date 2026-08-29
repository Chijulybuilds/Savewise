import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { DURATION, EASE_SWIFT } from '@/lib/motion';

/**
 * Dropdown menu.
 *
 * Closes on Escape, on outside click, and on selection. Focus returns to the
 * trigger on Escape so a keyboard user is not stranded — the single detail that
 * separates a usable menu from a decorative one.
 *
 * Positioned with plain CSS rather than a floating-element library: our menus
 * are anchored to a corner in a known layout, and 12kb of positioning maths for
 * three call sites is not a trade worth making.
 */

interface DropdownProps {
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    ref: React.Ref<HTMLButtonElement>;
  }) => ReactNode;
  children: (props: { close: () => void }) => ReactNode;
  align?: 'start' | 'end';
  className?: string;
  /** Accessible name for the menu itself. */
  label: string;
}

export function Dropdown({ trigger, children, align = 'end', className, label }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // Returning focus is what makes Escape feel like "go back" rather than
      // "lose your place".
      triggerRef.current?.focus();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((value) => !value), ref: triggerRef })}

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: DURATION.fast, ease: EASE_SWIFT }}
            className={cn(
              'absolute top-[calc(100%+0.5rem)] z-40 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg',
              align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            )}
          >
            {children({ close: () => setOpen(false) })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownItemProps {
  onSelect: () => void;
  children: ReactNode;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export function DropdownItem({
  onSelect,
  children,
  icon,
  destructive,
  disabled,
}: DropdownItemProps) {
  return (
    <button
      role="menuitem"
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:bg-surface-sunken',
        'disabled:pointer-events-none disabled:opacity-50',
        destructive ? 'text-critical hover:bg-critical-soft' : 'text-ink hover:bg-surface-sunken',
      )}
    >
      {icon && <span className="shrink-0 text-ink-subtle">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
      {children}
    </div>
  );
}
