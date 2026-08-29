import { toMonthKey } from '@savewise/shared';

import { CategoryDonut, SpendingTrendChart } from '@/components/charts/Charts';
import { ChartCard } from '@/components/charts/ChartCard';
import { SlideUp } from '@/components/motion/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, SkeletonCard, SkeletonRows } from '@/components/ui/States';
import { BudgetHealthCard } from '@/features/dashboard/BudgetHealthCard';
import { OverviewStats, OverviewStatsSkeleton } from '@/features/dashboard/OverviewStats';
import { RecentTransactions } from '@/features/dashboard/RecentTransactions';
import { SavingsProgressCard } from '@/features/dashboard/SavingsProgressCard';
import { InsightCard } from '@/features/insights/InsightCard';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useOverview } from '@/hooks/useApiQueries';
import { useAuthStore } from '@/store/authStore';

/**
 * Dashboard.
 *
 * One request feeds the whole screen. The server already knows how to compute a
 * savings rate, a budget's health and a goal's pace — doing it once there is
 * both faster than six round trips and the only way to guarantee the dashboard
 * and the detail pages agree.
 *
 * This file is deliberately a layout and nothing else. Every panel is its own
 * component with its own empty and loading behaviour.
 */
export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const month = toMonthKey();
  const { data, isPending, error, refetch } = useOverview(month);

  usePageMeta({ title: 'Dashboard — Savewise', noIndex: true });

  const firstName = user?.firstName ?? 'there';

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={data ? `Here is where ${data.monthLabel} stands.` : 'Loading your month.'}
        actions={
          <>
            <ButtonLink to="/transactions" variant="outline" size="sm">
              Add transaction
            </ButtonLink>
            <ButtonLink to="/goals" size="sm">
              New goal
            </ButtonLink>
          </>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          <OverviewStats data={data} />

          {data.topInsight && (
            <SlideUp>
              <InsightCard insight={data.topInsight} compact />
            </SlideUp>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <SlideUp>
              <BudgetHealthCard data={data} />
            </SlideUp>
            <SlideUp delay={0.06}>
              <SavingsProgressCard data={data} />
            </SlideUp>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <SlideUp>
              <ChartCard
                title="Spending over time"
                description="The last twelve months"
                isEmpty={data.trend.every((point) => point.expenses === 0)}
                emptyTitle="No spending recorded yet"
                emptyDescription="Add a few expenses and the trend appears here."
                height={260}
              >
                <SpendingTrendChart data={data.trend} currency={data.currency} />
              </ChartCard>
            </SlideUp>

            <SlideUp delay={0.06}>
              <ChartCard
                title="Where it went"
                description={data.monthLabel}
                isEmpty={data.categories.length === 0}
                emptyTitle="Nothing spent this month"
                emptyDescription="Category breakdown appears once you record an expense."
                height={260}
              >
                <CategoryDonut data={data.categories} currency={data.currency} />
              </ChartCard>
            </SlideUp>
          </div>

          <SlideUp>
            <RecentTransactions transactions={data.recentTransactions} />
          </SlideUp>
        </div>
      )}
    </>
  );
}

/**
 * A skeleton that mirrors the real layout, so nothing jumps when data lands.
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <OverviewStatsSkeleton />
      <SkeletonCard lines={2} />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>
      <SkeletonRows rows={4} />
    </div>
  );
}

/**
 * Greets by local time of day.
 *
 * Uses the *browser's* clock, not the server's: "Good evening" is about where
 * the user is sitting, and a UTC server would wish half of Lagos good afternoon
 * at nine at night.
 */
function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
