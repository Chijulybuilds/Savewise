import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';

import { formatMoney, toMinor } from '@savewise/shared';

import { AnimatedMoney, AnimatedPercent } from '@/components/ui/AnimatedNumber';
import { cn } from '@/lib/cn';
import { EASE_ENTRANCE, SPRING_SOFT } from '@/lib/motion';
import { DEMO_CURRENCY, DEMO_SNAPSHOT, DEMO_TRANSACTIONS, DEMO_TREND } from './demoData';

/**
 * The hero's product visualisation.
 *
 * Built in React rather than dropped in as a screenshot. That is a deliberate
 * trade: a real component is a fraction of the weight of a retina PNG, it is
 * sharp at every density, it adapts to the viewport, it inherits the light and
 * dark themes for free — and it cannot go stale when the product changes.
 *
 * The animation is choreographed rather than simultaneous. The card arrives,
 * the balance counts, the line draws itself, the progress fills, then the
 * transactions land one by one. Roughly two seconds end to end, once, on load.
 */

export function ProductMockup({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <div className={cn('relative', className)}>
      {/* A soft colour wash behind the composition. Pure CSS — no image, no
          blur filter on a large surface, nothing that would cost a frame. */}
      <div
        className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 opacity-70"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(60% 50% at 30% 20%, hsl(var(--primary) / 0.16), transparent 70%), radial-gradient(45% 45% at 85% 70%, hsl(var(--accent) / 0.12), transparent 70%)',
        }}
      />

      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduced ? { duration: 0.3 } : { ...SPRING_SOFT, delay: 0.1 }}
        className="relative rounded-3xl border border-border bg-surface p-5 shadow-xl sm:p-6"
      >
        <SummaryCard />
        <TrendPanel />
        <GoalPanel />
        <ActivityList />
      </motion.div>

      <IncomeChip />
      <PlannedSavingsChip />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Panels                                                                      */
/* -------------------------------------------------------------------------- */

function SummaryCard() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs text-ink-muted">Good morning, Chinedu</p>
        <p className="mt-2 text-2xs font-medium uppercase tracking-wider text-ink-subtle">
          Total saved
        </p>
        <p className="mt-1 text-3xl font-semibold text-ink sm:text-4xl">
          <AnimatedMoney value={DEMO_SNAPSHOT.totalSaved} currency={DEMO_CURRENCY} />
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-positive">
          <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden="true">
            <path d="M6 2.5 10 8H2l4-5.5Z" />
          </svg>
          18.4% this month
        </p>
      </div>

      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-2xs font-medium text-primary">
        August
      </span>
    </div>
  );
}

/**
 * A twelve-month savings line that draws itself.
 *
 * `pathLength` is animated rather than `stroke-dashoffset` with a hard-coded
 * length: Motion normalises it to 0–1, so the animation is correct at any
 * width without measuring the path.
 */
function TrendPanel() {
  const reduced = useReducedMotion();
  const gradientId = useId();

  const values = DEMO_TREND.map((point) => point.savings);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const width = 320;
  const height = 68;

  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: height - ((value - min) / range) * (height - 10) - 5,
  }));

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <div className="mt-5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Monthly savings over the last twelve months, trending upward"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.path
          d={area}
          fill={`url(#${gradientId})`}
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        />

        <motion.path
          d={line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={
            reduced ? { duration: 0 } : { delay: 0.5, duration: 1.1, ease: EASE_ENTRANCE }
          }
        />

        {/* The final point, arriving as the line reaches it. */}
        <motion.circle
          cx={points[points.length - 1]?.x ?? width}
          cy={points[points.length - 1]?.y ?? 0}
          r="3.5"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--surface))"
          strokeWidth="2"
          initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.5, type: 'spring', stiffness: 500, damping: 24 }}
        />
      </svg>

      <div className="mt-1.5 flex justify-between text-2xs text-ink-subtle">
        <span>Sep</span>
        <span>Aug</span>
      </div>
    </div>
  );
}

function GoalPanel() {
  const reduced = useReducedMotion();

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface-sunken/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs font-medium uppercase tracking-wider text-ink-subtle">Next goal</p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink">Emergency Fund</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-primary">
          <AnimatedPercent value={DEMO_SNAPSHOT.savingsProgress} />
        </p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/60">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${DEMO_SNAPSHOT.savingsProgress}%` }}
          transition={reduced ? { duration: 0 } : { delay: 0.9, duration: 1, ease: EASE_ENTRANCE }}
        />
      </div>

      <p className="tabular mt-2.5 text-xs text-ink-muted">
        {formatMoney(toMinor(864_000), DEMO_CURRENCY)} of{' '}
        {formatMoney(toMinor(1_200_000), DEMO_CURRENCY)}
      </p>
    </div>
  );
}

/** Recent activity, landing one row at a time after everything else settles. */
function ActivityList() {
  const reduced = useReducedMotion();

  return (
    <ul className="mt-5 space-y-1">
      {DEMO_TRANSACTIONS.slice(0, 3).map((transaction, index) => (
        <motion.li
          key={transaction.description}
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.4 + index * 0.12, duration: 0.4, ease: EASE_ENTRANCE }}
          className="flex items-center gap-3 rounded-lg px-1 py-2"
        >
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold',
              transaction.type === 'income'
                ? 'bg-positive-soft text-positive'
                : transaction.type === 'saving'
                  ? 'bg-primary-soft text-primary'
                  : 'bg-surface-sunken text-ink-muted',
            )}
            aria-hidden="true"
          >
            {transaction.type === 'income' ? '↓' : transaction.type === 'saving' ? '◆' : '↑'}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-ink">
              {transaction.description}
            </span>
            <span className="block text-2xs text-ink-subtle">
              {transaction.category} · {transaction.when}
            </span>
          </span>

          <span
            className={cn(
              'tabular shrink-0 text-xs font-medium',
              transaction.type === 'income' ? 'text-positive' : 'text-ink',
            )}
          >
            {transaction.type === 'income' ? '+' : '−'}
            {formatMoney(transaction.amount, DEMO_CURRENCY)}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Floating chips                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The two satellite cards.
 *
 * Absolutely positioned and hidden below `lg`: overlapping cards need room, and
 * on a phone they would sit on top of the numbers they are meant to complement.
 * On small screens the same figures already appear inside the main card.
 */
function IncomeChip() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: -20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={reduced ? { duration: 0.3 } : { ...SPRING_SOFT, delay: 0.45 }}
      className="absolute -left-10 top-24 hidden rounded-2xl border border-border bg-surface p-4 shadow-lg lg:block"
    >
      <p className="text-2xs font-medium uppercase tracking-wider text-ink-subtle">
        Monthly income
      </p>
      <p className="mt-1 text-lg font-semibold text-ink">
        <AnimatedMoney value={DEMO_SNAPSHOT.monthlyIncome} currency={DEMO_CURRENCY} />
      </p>
    </motion.div>
  );
}

function PlannedSavingsChip() {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 20, y: -10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={reduced ? { duration: 0.3 } : { ...SPRING_SOFT, delay: 0.6 }}
      className="absolute -right-8 bottom-28 hidden rounded-2xl border border-border bg-surface p-4 shadow-lg lg:block"
    >
      <p className="text-2xs font-medium uppercase tracking-wider text-ink-subtle">
        Planned savings
      </p>
      <p className="mt-1 text-lg font-semibold text-ink">
        <AnimatedMoney value={DEMO_SNAPSHOT.plannedSavings} currency={DEMO_CURRENCY} />
      </p>
      <p className="mt-1 text-2xs text-ink-subtle">23% of income</p>
    </motion.div>
  );
}
