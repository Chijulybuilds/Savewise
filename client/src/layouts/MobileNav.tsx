import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { DURATION, EASE_SWIFT, SPRING } from '@/lib/motion';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS, SETTINGS_ITEM } from './navigation';

/**
 * Mobile navigation.
 *
 * A bottom bar rather than a hamburger drawer, because on a phone the primary
 * destinations should be reachable with a thumb, not two taps away behind a
 * menu. Four destinations plus "More" fits comfortably at 320px; the remaining
 * screens live in a sheet that slides up from the same bar.
 *
 * `env(safe-area-inset-bottom)` keeps the bar clear of the home indicator on
 * modern iPhones, where a fixed bottom bar otherwise sits underneath it.
 */

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMoreOpen(false), [location.pathname]);

  const moreIsActive = [...SECONDARY_NAV_ITEMS, SETTINGS_ITEM].some(
    (item) => item.to === location.pathname,
  );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <ul className="flex items-stretch">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center gap-1 py-2.5 text-2xs font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-ink-subtle',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="mobile-nav-active"
                        transition={SPRING}
                        className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"
                      />
                    )}
                    {item.icon}
                    {item.shortLabel ?? item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              aria-controls="more-sheet"
              className={cn(
                'flex w-full flex-col items-center gap-1 py-2.5 text-2xs font-medium transition-colors',
                moreIsActive ? 'text-primary' : 'text-ink-subtle',
              )}
            >
              <svg
                viewBox="0 0 20 20"
                className="size-[18px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="4.5" cy="10" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="15.5" cy="10" r="1.5" />
              </svg>
              More
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-ink/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              id="more-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="More destinations"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: DURATION.base, ease: EASE_SWIFT }}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-surface p-4 pb-8"
              style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
            >
              {/* A grab handle: signals the sheet is dismissible without a
                  visible close button competing with the list. */}
              <div
                className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong"
                aria-hidden="true"
              />

              <ul className="space-y-1">
                {[...SECONDARY_NAV_ITEMS, SETTINGS_ITEM].map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors',
                          isActive
                            ? 'bg-primary-soft text-primary'
                            : 'text-ink hover:bg-surface-sunken',
                        )
                      }
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="mt-3 w-full rounded-xl border border-border py-3 text-sm font-medium text-ink-muted"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
