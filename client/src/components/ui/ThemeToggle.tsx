import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/cn';
import { useThemeStore } from '@/store/themeStore';

/**
 * Theme toggle.
 *
 * A single button that flips between the two themes, with the icon crossfading
 * and rotating so the change is legible at a glance. `aria-pressed` conveys the
 * current state, and the label names what pressing it will *do* rather than
 * what the state is — "Switch to dark theme" is actionable, "Dark theme" is
 * ambiguous.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const resolved = useThemeStore((state) => state.resolved);
  const toggle = useThemeStore((state) => state.toggle);
  const isDark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className={cn(
        'relative inline-flex size-9 items-center justify-center overflow-hidden rounded-lg text-ink-muted',
        'transition-colors duration-200 hover:bg-surface-sunken hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={resolved}
          initial={{ opacity: 0, rotate: -60, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 60, scale: 0.7 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {isDark ? (
            <svg viewBox="0 0 20 20" className="size-[18px]" fill="currentColor" aria-hidden="true">
              <path d="M10 1.5a.8.8 0 0 1 .8.8v1.4a.8.8 0 0 1-1.6 0V2.3a.8.8 0 0 1 .8-.8Zm0 13a.8.8 0 0 1 .8.8v1.4a.8.8 0 0 1-1.6 0v-1.4a.8.8 0 0 1 .8-.8ZM18.5 10a.8.8 0 0 1-.8.8h-1.4a.8.8 0 0 1 0-1.6h1.4a.8.8 0 0 1 .8.8Zm-13 0a.8.8 0 0 1-.8.8H3.3a.8.8 0 0 1 0-1.6h1.4a.8.8 0 0 1 .8.8Zm10.5-6a.8.8 0 0 1 0 1.13l-1 1a.8.8 0 1 1-1.13-1.13l1-1A.8.8 0 0 1 16 4Zm-9.87 9.87a.8.8 0 0 1 0 1.13l-1 1A.8.8 0 0 1 4 14.87l1-1a.8.8 0 0 1 1.13 0ZM16 16a.8.8 0 0 1-1.13 0l-1-1a.8.8 0 1 1 1.13-1.13l1 1A.8.8 0 0 1 16 16ZM6.13 6.13A.8.8 0 0 1 5 6.13l-1-1A.8.8 0 0 1 5.13 4l1 1a.8.8 0 0 1 0 1.13ZM10 6.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" className="size-[18px]" fill="currentColor" aria-hidden="true">
              <path d="M16.9 12.6a7.2 7.2 0 0 1-9.5-9.5.8.8 0 0 0-1-1.05 8.8 8.8 0 1 0 11.55 11.55.8.8 0 0 0-1.05-1Z" />
            </svg>
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
