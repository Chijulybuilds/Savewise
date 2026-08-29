import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { calculatePercentage, formatMoney, formatPercent, toMinor } from '@savewise/shared';

import { SlideUp } from '@/components/motion/Reveal';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { EASE_ENTRANCE, VIEWPORT } from '@/lib/motion';
import { DEMO_CATEGORIES, DEMO_CURRENCY, DEMO_GOALS, DEMO_TREND } from '../demoData';
import { Section, SectionHeading } from '../Section';

/**
 * Dashboard showcase.
 *
 * Genuinely interactive rather than a picture of an interface: the tabs work,
 * the bars respond, the numbers recompute. Someone evaluating the product can
 * poke at it before creating an account, which is worth more than a carousel of
 * screenshots.
 *
 * The bars are plain divs, not Recharts — this section renders on the landing
 * page, and pulling in the charting library for three columns of colour would
 * cost more than the section is worth.
 */

type View = 'overview' | 'spending' | 'goals';

const TABS = [
  { value: 'overview' as const, label: 'Overview' },
  { value: 'spending' as const, label: 'Spending' },
  { value: 'goals' as const, label: 'Goals' },
];

export function DashboardShowcase() {
  const [view, setView] = useState<View>('overview');

  return (
    <Section id="dashboard">
      <div className="container-page">
        <SectionHeading
          eyebrow="The dashboard"
          title="Everything above the fold, in one glance"
          lede="Balance, spending, goal progress and this month's insight — without clicking into four different screens."
          align="center"
        />

        <SlideUp className="mt-12">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface shadow-lg">
            {/* A restrained browser chrome. Enough to say "this is an app", not
                so much that it becomes a skeuomorphic distraction. */}
            <div className="flex items-center gap-2 border-b border-border bg-surface-sunken/60 px-4 py-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-border-strong" />
                <span className="size-2.5 rounded-full bg-border-strong" />
                <span className="size-2.5 rounded-full bg-border-strong" />
              </span>
              <span className="mx-auto rounded-md bg-surface px-3 py-1 text-2xs text-ink-subtle">
                savewise.app/dashboard
              </span>
            </div>

            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-ink-muted">Good evening, Chinedu</p>
                  <p className="mt-0.5 text-xl font-semibold text-ink">August at a glance</p>
                </div>

                <Tabs
                  items={TABS}
                  value={view}
                  onChange={setView}
                  label="Dashboard preview"
                  className="self-start sm:self-auto"
                />
              </div>

              <div className="mt-6">
                {view === 'overview' && <OverviewView />}
                {view === 'spending' && <SpendingView />}
                {view === 'goals' && <GoalsView />}
              </div>
            </div>
          </div>
        </SlideUp>

        <p className="mt-6 text-center text-xs text-ink-subtle">
          Interactive preview with demo figures. Try the tabs.
        </p>
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/* Views                                                                       */
/* -------------------------------------------------------------------------- */

const STATS = [
  { label: 'Total balance', value: toMinor(1_496_654), delta: '+8.2%', good: true },
  { label: 'Monthly income', value: toMinor(597_800), delta: '+3.8%', good: true },
  { label: 'Monthly spend', value: toMinor(359_756), delta: '−1.5%', good: true },
  { label: 'Total saved', value: toMinor(1_426_769), delta: '+9.1%', good: true },
];

function OverviewView() {
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.35 }}
            className="rounded-xl border border-border bg-surface-sunken/40 p-4"
          >
            <dt className="text-2xs text-ink-muted">{stat.label}</dt>
            <dd className="tabular mt-1.5 text-base font-semibold text-ink sm:text-lg">
              {formatMoney(stat.value, DEMO_CURRENCY, { compact: true })}
            </dd>
            <dd
              className={cn(
                'mt-0.5 text-2xs font-medium',
                stat.good ? 'text-positive' : 'text-critical',
              )}
            >
              {stat.delta}
            </dd>
          </motion.div>
        ))}
      </dl>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <MiniBarChart />

        <div className="rounded-xl border border-primary/25 bg-primary-soft p-4">
          <p className="text-2xs font-semibold uppercase tracking-wider text-primary">This month</p>
          <p className="mt-2 text-sm font-medium text-ink">Strong savings habit</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
            You kept 19.8% of what came in — {formatMoney(toMinor(118_202), DEMO_CURRENCY)} set
            aside.
          </p>
          <p className="mt-3 border-t border-primary/20 pt-3 text-xs text-ink-muted">
            Consider raising a goal target while the habit is holding.
          </p>
        </div>
      </div>
    </div>
  );
}

function SpendingView() {
  const total = DEMO_CATEGORIES.reduce((sum, category) => sum + category.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-ink-muted">Spent in August</p>
        <p className="tabular text-lg font-semibold text-ink">
          {formatMoney(total, DEMO_CURRENCY)}
        </p>
      </div>

      <ul className="space-y-3">
        {DEMO_CATEGORIES.map((category, index) => {
          const share = calculatePercentage(category.amount, total);
          return (
            <li key={category.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-ink">{category.label}</span>
                <span className="tabular text-ink-muted">
                  {formatMoney(category.amount, DEMO_CURRENCY)} · {formatPercent(share)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${share}%` }}
                  transition={{ delay: index * 0.05, duration: 0.6, ease: EASE_ENTRANCE }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GoalsView() {
  return (
    <ul className="space-y-3">
      {DEMO_GOALS.map((goal, index) => {
        const percent = calculatePercentage(goal.saved, goal.target);
        return (
          <motion.li
            key={goal.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.35 }}
            className="rounded-xl border border-border p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">{goal.name}</span>
              <span className="tabular text-sm font-semibold text-primary">
                {Math.round(percent)}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ delay: 0.1 + index * 0.06, duration: 0.7, ease: EASE_ENTRANCE }}
              />
            </div>

            <p className="tabular mt-2 text-2xs text-ink-subtle">
              {formatMoney(goal.saved, DEMO_CURRENCY)} of {formatMoney(goal.target, DEMO_CURRENCY)}{' '}
              · {formatMoney(goal.monthlyRequired, DEMO_CURRENCY)}/month to stay on track
            </p>
          </motion.li>
        );
      })}
    </ul>
  );
}

/** Twelve months of income against spend, drawn with divs. */
function MiniBarChart() {
  const reduced = useReducedMotion();
  const max = Math.max(...DEMO_TREND.map((point) => point.income));

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-2xs font-medium text-ink-muted">Income vs spending</p>

      <div
        className="mt-4 flex h-28 items-end gap-1.5"
        role="img"
        aria-label="Twelve months of income compared with spending"
      >
        {DEMO_TREND.map((point, index) => (
          <div key={point.label} className="flex flex-1 flex-col justify-end gap-0.5">
            <motion.div
              className="w-full rounded-t-sm bg-primary"
              initial={reduced ? false : { height: 0 }}
              whileInView={{ height: `${(point.income / max) * 70}px` }}
              viewport={VIEWPORT}
              transition={{ delay: index * 0.03, duration: 0.5, ease: EASE_ENTRANCE }}
            />
            <motion.div
              className="w-full rounded-b-sm bg-accent/70"
              initial={reduced ? false : { height: 0 }}
              whileInView={{ height: `${(point.expenses / max) * 40}px` }}
              viewport={VIEWPORT}
              transition={{ delay: 0.1 + index * 0.03, duration: 0.5, ease: EASE_ENTRANCE }}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-2xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-primary" aria-hidden="true" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-accent/70" aria-hidden="true" /> Spent
        </span>
        <span className="tabular ml-auto text-ink-subtle">
          avg{' '}
          {formatMoney(
            Math.round(DEMO_TREND.reduce((s, p) => s + p.expenses, 0) / DEMO_TREND.length),
            DEMO_CURRENCY,
            { compact: true },
          )}
          /mo
        </span>
      </div>
    </div>
  );
}
