import { BudgetIntelligence } from '@/components/marketing/sections/BudgetIntelligence';
import { DashboardShowcase } from '@/components/marketing/sections/DashboardShowcase';
import { FinalCta } from '@/components/marketing/sections/FinalCta';
import { GoalsShowcase } from '@/components/marketing/sections/GoalsShowcase';
import { InsightsShowcase } from '@/components/marketing/sections/InsightsShowcase';
import { Section, SectionHeading } from '@/components/marketing/Section';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { usePageMeta } from '@/hooks/usePageMeta';

/**
 * Features page.
 *
 * Reuses the landing page's showcase sections rather than restating them in
 * different words. A feature described twice in two voices is a feature nobody
 * trusts — and it doubles the copy that has to stay in sync with the product.
 */

const CAPABILITIES = [
  {
    title: 'Integer money, everywhere',
    body: 'Every amount is stored as a whole number of kobo. No floating-point balance, no cent that appears from nowhere after a division.',
  },
  {
    title: 'Goals that do the arithmetic',
    body: 'Target, deadline and current balance become a required monthly contribution and a projected completion date — recalculated every time you look.',
  },
  {
    title: 'Budgets that track themselves',
    body: 'Set limits once. Spend is aggregated from your transactions on read, so a back-dated or edited entry updates the month correctly.',
  },
  {
    title: 'Recurring savings plans',
    body: 'Weekly, fortnightly or monthly schedules with a projected finish date. Attach a plan to a goal and every recorded contribution credits both.',
  },
  {
    title: 'A rules-based insight engine',
    body: 'Nine rules over your own figures, each one a comparison you could check by hand. No model, and nothing dressed up as intelligence.',
  },
  {
    title: 'Twelve months of analytics',
    body: 'Income against spending, savings rate over time, category trends, and a straight-line projection of where the current habit leads.',
  },
  {
    title: 'Designed for both themes',
    body: 'Light and dark are two deliberate palettes, not one inverted. Charts, states and shadows are specified separately for each.',
  },
  {
    title: 'Built to be used with a keyboard',
    body: 'Focus is visible everywhere, dialogs trap and restore it, tabs follow the arrow-key pattern, and every control is a real control.',
  },
];

export default function FeaturesPage() {
  usePageMeta({
    title: 'Features — Savewise',
    description:
      'Savings goals with real deadlines, self-tracking budgets, recurring plans, a rules-based insight engine and twelve months of analytics.',
  });

  return (
    <>
      <Section className="pt-32 sm:pt-36" compact>
        <div className="container-page">
          <SectionHeading
            eyebrow="Features"
            title="Everything Savewise does, and why"
            lede="A short product with a small number of ideas, each one carried all the way through."
            align="center"
          />

          <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.05}>
            {CAPABILITIES.map((capability) => (
              <StaggerItem key={capability.title} as="div">
                <article className="h-full rounded-2xl border border-border bg-surface p-5">
                  <h3 className="text-sm font-semibold text-ink">{capability.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{capability.body}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      <GoalsShowcase />
      <BudgetIntelligence />
      <InsightsShowcase />
      <DashboardShowcase />
      <FinalCta />
    </>
  );
}
