import type { OverviewDto } from '@savewise/shared';

import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { StatCard } from '@/components/ui/StatCard';
import { SkeletonCard } from '@/components/ui/States';

/**
 * The four headline figures.
 *
 * "Total balance" is what the ledger says is left — income recorded minus
 * spending recorded. It is explicitly *not* a custodial balance, and the
 * caption says so, because a number that large next to a fintech logo will
 * otherwise be read as money we are holding.
 *
 * Spending is the one metric where a rise is bad news, so it passes
 * `invertDelta` and gets a red arrow when it goes up.
 */

export function OverviewStats({ data }: { data: OverviewDto }) {
  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" stagger={0.06}>
      <StaggerItem as="div">
        <StatCard
          label="Tracked balance"
          value={data.totalBalance}
          currency={data.currency}
          caption="Recorded, not held"
          icon={<WalletIcon />}
        />
      </StaggerItem>

      <StaggerItem as="div">
        <StatCard
          label="Income this month"
          value={data.monthlyIncome}
          currency={data.currency}
          delta={data.incomeChange}
          caption="vs last month"
          icon={<ArrowInIcon />}
        />
      </StaggerItem>

      <StaggerItem as="div">
        <StatCard
          label="Spent this month"
          value={data.monthlyExpenses}
          currency={data.currency}
          delta={data.expenseChange}
          invertDelta
          caption="vs last month"
          icon={<ArrowOutIcon />}
        />
      </StaggerItem>

      <StaggerItem as="div">
        <StatCard
          label="Total saved"
          value={data.totalSaved}
          currency={data.currency}
          delta={data.savingsChange}
          caption="across all goals"
          icon={<PiggyIcon />}
        />
      </StaggerItem>
    </Stagger>
  );
}

export function OverviewStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonCard key={index} lines={1} />
      ))}
    </div>
  );
}

/* Icons kept local — they exist only to give each card a silhouette. */

const iconProps = {
  viewBox: '0 0 20 20',
  className: 'size-4',
  fill: 'none',
  'aria-hidden': true,
} as const;

function WalletIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 8.5h15" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="12.2" r="1" fill="currentColor" />
    </svg>
  );
}

function ArrowInIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M10 4v9m0 0 3.5-3.5M10 13l-3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowOutIcon() {
  return (
    <svg {...iconProps}>
      <path
        d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PiggyIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.5v7M8 8.5h3.2a1.5 1.5 0 0 1 0 3H8.8a1.5 1.5 0 0 0 0 3H12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
