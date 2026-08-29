import { motion, useReducedMotion } from 'motion/react';

import { ButtonLink } from '@/components/ui/Button';
import { EASE_ENTRANCE } from '@/lib/motion';
import { ProductMockup } from '../ProductMockup';

/**
 * Hero.
 *
 * One idea, stated plainly: build the habit, reach the goal. The headline is
 * set in the display serif — the only place on the page it appears at this
 * size — which is what gives the page its voice in the first second.
 *
 * The copy staggers in on load rather than on scroll, because it is already in
 * view. Each line is a separate element so the phrasing arrives in the order it
 * reads.
 */

export function Hero() {
  const reduced = useReducedMotion();

  const rise = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE_ENTRANCE, delay: reduced ? 0 : delay },
  });

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32 lg:pt-40">
      {/* The faint grid, fading out before it reaches the content. */}
      <div
        className="grid-texture pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{ maskImage: 'radial-gradient(80% 60% at 50% 0%, black, transparent)' }}
        aria-hidden="true"
      />

      <div className="container-page">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="max-w-xl">
            <motion.p
              {...rise(0.05)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted"
            >
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />A savings
              system, not a spreadsheet
            </motion.p>

            <motion.h1
              {...rise(0.12)}
              className="mt-6 font-display text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl"
            >
              Build the habit.
              <br />
              <span className="text-primary">Reach the goal.</span>
            </motion.h1>

            <motion.p {...rise(0.2)} className="mt-6 text-lg leading-relaxed text-ink-muted">
              Savewise turns income into intentional saving, smarter spending, and financial
              progress you can actually measure.
            </motion.p>

            <motion.div {...rise(0.28)} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/register" size="lg" className="sm:w-auto">
                Start saving
              </ButtonLink>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border-strong px-6 text-base font-medium text-ink transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                See how it works
                <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                  <path
                    d="M8 3v10M4 9l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </motion.div>

            <motion.p {...rise(0.36)} className="mt-6 text-xs text-ink-subtle">
              Free to start · No card required · Savewise never holds your money
            </motion.p>
          </div>

          <div className="lg:pl-6">
            <ProductMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
