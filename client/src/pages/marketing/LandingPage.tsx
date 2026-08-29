import { BudgetIntelligence } from '@/components/marketing/sections/BudgetIntelligence';
import { DashboardShowcase } from '@/components/marketing/sections/DashboardShowcase';
import { Faq } from '@/components/marketing/sections/Faq';
import { FinalCta } from '@/components/marketing/sections/FinalCta';
import { GoalsShowcase } from '@/components/marketing/sections/GoalsShowcase';
import { Hero } from '@/components/marketing/sections/Hero';
import { HowItWorks } from '@/components/marketing/sections/HowItWorks';
import { InsightsShowcase } from '@/components/marketing/sections/InsightsShowcase';
import { Pricing } from '@/components/marketing/sections/Pricing';
import { Problem } from '@/components/marketing/sections/Problem';
import { ProductReveal } from '@/components/marketing/sections/ProductReveal';
import { SocialProof } from '@/components/marketing/sections/SocialProof';
import { usePageMeta } from '@/hooks/usePageMeta';

/**
 * Landing page.
 *
 * Ordered as an argument rather than a feature list: name the problem, show the
 * shape of the solution, then demonstrate it three ways (goals, budget,
 * insights), let the reader try it, explain the effort, and only then ask for
 * anything.
 *
 * The page is a composition of sections and nothing else — every section owns
 * its own layout, spacing and motion, so reordering the narrative is a matter
 * of moving one line.
 */
export default function LandingPage() {
  usePageMeta({
    title: 'Savewise — Build the habit. Reach the goal.',
    description:
      'Savewise turns income into intentional saving: goals with real deadlines, budgets you can keep, and plain-English insights from your own numbers.',
  });

  return (
    <>
      <Hero />
      <Problem />
      <ProductReveal />
      <GoalsShowcase />
      <BudgetIntelligence />
      <InsightsShowcase />
      <DashboardShowcase />
      <HowItWorks />
      <SocialProof />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
