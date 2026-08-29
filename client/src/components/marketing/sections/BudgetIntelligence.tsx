import { motion, useReducedMotion } from 'motion/react';

import { calculatePercentage, formatMoney } from '@savewise/shared';

import { SlideUp } from '@/components/motion/Reveal';
import { AnimatedMoney } from '@/components/ui/AnimatedNumber';
import { cn } from '@/lib/cn';
import { EASE_ENTRANCE, VIEWPORT } from '@/lib/motion';
import { DEMO_BUDGET, DEMO_CATEGORIES, DEMO_CURRENCY } from '../demoData';
import { Section, SectionHeading } from '../Section';

/**
 * Budget section.
 *
 * The headline visual is one bar split three ways. A single bar makes the
 * *proportions* the subject — which is the only thing a budget split is really
 * about — where three separate bars would invite comparing lengths that share
 * no baseline.
 *
 * The category list underneath shows the state that matters: not what was
 * planned, but how much of each limit is gone.
 */

const SPLIT = [
  { key: 'needs', label: 'Needs', amount: DEMO_BUDGET.needs, className: 'bg-primary' },
  { key: 'savings', label: 'Savings', amount: DEMO_BUDGET.savings, className: 'bg-accent' },
  { key: 'wants', label: 'Wants', amount: DEMO_BUDGET.wants, className: 'bg-primary/35' },
] as const;

export function BudgetIntelligence() {
  const reduced = useReducedMotion();
  const total = SPLIT.reduce((sum, part) => sum + part.amount, 0);

  return (
    <Section id="budget">
      <div className="container-page">
        <SectionHeading
          eyebrow="Budget intelligence"
          title="Know what you can spend before you spend it"
          lede="Savewise splits your income into needs, savings and wants, then tracks every category against its limit as the month goes on."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          {/* The split */}
          <SlideUp className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-ink-muted">Monthly income</p>
                <p className="mt-1 text-3xl font-semibold text-ink">
                  <AnimatedMoney value={DEMO_BUDGET.income} currency={DEMO_CURRENCY} />
                </p>
              </div>
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-2xs font-medium text-primary">
                Fully allocated
              </span>
            </div>

            <div className="mt-7 flex h-3 w-full gap-1 overflow-hidden rounded-full bg-surface-sunken">
              {SPLIT.map((part, index) => (
                <motion.div
                  key={part.key}
                  className={cn('h-full first:rounded-l-full last:rounded-r-full', part.className)}
                  initial={reduced ? false : { width: 0 }}
                  whileInView={{ width: `${(part.amount / total) * 100}%` }}
                  viewport={VIEWPORT}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { duration: 0.8, ease: EASE_ENTRANCE, delay: 0.15 + index * 0.12 }
                  }
                />
              ))}
            </div>

            <dl className="mt-7 grid grid-cols-3 gap-4">
              {SPLIT.map((part) => (
                <div key={part.key}>
                  <dt className="flex items-center gap-2 text-xs text-ink-muted">
                    <span className={cn('size-2 rounded-sm', part.className)} aria-hidden="true" />
                    {part.label}
                  </dt>
                  <dd className="tabular mt-1.5 text-base font-semibold text-ink">
                    {formatMoney(part.amount, DEMO_CURRENCY)}
                  </dd>
                  <dd className="tabular text-2xs text-ink-subtle">
                    {Math.round(calculatePercentage(part.amount, total))}% of income
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-7 border-t border-border pt-5 text-xs leading-relaxed text-ink-subtle">
              Savewise suggests a starting split when you sign up. It is a starting point you edit,
              not advice — you know your month better than any default does.
            </p>
          </SlideUp>

          {/* Category usage */}
          <SlideUp delay={0.12} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <h3 className="text-sm font-semibold text-ink">This month, by category</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Limits set at the start; spend tracked as it happens.
            </p>

            <ul className="mt-6 space-y-4">
              {DEMO_CATEGORIES.map((category, index) => {
                const over = category.used > 100;
                const watch = category.used >= 80 && category.used <= 100;

                return (
                  <li key={category.label}>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="font-medium text-ink">{category.label}</span>
                      <span
                        className={cn(
                          'tabular font-medium',
                          over ? 'text-critical' : watch ? 'text-warning' : 'text-ink-muted',
                        )}
                      >
                        {formatMoney(category.amount, DEMO_CURRENCY)} · {category.used}%
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          over ? 'bg-critical' : watch ? 'bg-warning' : 'bg-primary',
                        )}
                        initial={reduced ? false : { width: 0 }}
                        whileInView={{ width: `${Math.min(100, category.used)}%` }}
                        viewport={VIEWPORT}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { duration: 0.7, ease: EASE_ENTRANCE, delay: 0.2 + index * 0.07 }
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="mt-6 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-xs text-ink">
              <svg
                viewBox="0 0 16 16"
                className="mt-px size-3.5 shrink-0 text-warning"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 1.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5Zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.5Zm0 7.25a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />
              </svg>
              <span>
                Dining is at 103% with a week to go — Savewise tells you before month end.
              </span>
            </p>
          </SlideUp>
        </div>
      </div>
    </Section>
  );
}
