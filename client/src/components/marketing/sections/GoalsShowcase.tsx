import { calculatePercentage, formatMoney, goalCategoryLabel } from '@savewise/shared';

import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { DEMO_CURRENCY, DEMO_GOALS } from '../demoData';
import { Section, SectionHeading } from '../Section';

/**
 * Savings goals section.
 *
 * Each card shows the four numbers that turn a wish into a plan: how far along,
 * how much is left, when it is due, and what it costs per month to get there.
 * The last one is the one people never work out for themselves, so it gets its
 * own row at the bottom of the card.
 *
 * Percentages are computed with the same `calculatePercentage` the API uses, so
 * the marketing page cannot drift from the product.
 */

export function GoalsShowcase() {
  return (
    <Section id="goals" tone="sunken">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
          <SectionHeading
            eyebrow="Savings goals"
            title="A goal is a number, a date, and a monthly amount"
            lede="Name what you are saving for and Savewise works out the rest — including whether your current pace actually gets you there."
            className="lg:sticky lg:top-24"
          />

          <Stagger className="space-y-4" stagger={0.09}>
            {DEMO_GOALS.map((goal) => {
              const percent = calculatePercentage(goal.saved, goal.target);
              const remaining = goal.target - goal.saved;

              return (
                <StaggerItem key={goal.name} as="div">
                  <article className="rounded-2xl border border-border bg-surface p-5 transition-colors duration-300 hover:border-border-strong sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-ink">{goal.name}</h3>
                        <p className="mt-0.5 text-xs text-ink-subtle">
                          {goalCategoryLabel(goal.category)} · due {goal.deadline}
                        </p>
                      </div>
                      <Badge tone="primary">{Math.round(percent)}%</Badge>
                    </div>

                    <div className="mt-5">
                      <Progress value={percent} label={`${goal.name} progress`} size="lg" />
                    </div>

                    <div className="tabular mt-3 flex items-baseline justify-between text-sm">
                      <span className="font-semibold text-ink">
                        {formatMoney(goal.saved, DEMO_CURRENCY)}
                      </span>
                      <span className="text-ink-subtle">
                        of {formatMoney(goal.target, DEMO_CURRENCY)}
                      </span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
                      <div>
                        <dt className="text-ink-subtle">Still to save</dt>
                        <dd className="tabular mt-0.5 font-medium text-ink">
                          {formatMoney(remaining, DEMO_CURRENCY)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-subtle">Needed each month</dt>
                        <dd className="tabular mt-0.5 font-medium text-primary">
                          {formatMoney(goal.monthlyRequired, DEMO_CURRENCY)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </div>
    </Section>
  );
}
