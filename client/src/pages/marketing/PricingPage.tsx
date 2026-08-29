import { Faq } from '@/components/marketing/sections/Faq';
import { FinalCta } from '@/components/marketing/sections/FinalCta';
import { Pricing } from '@/components/marketing/sections/Pricing';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function PricingPage() {
  usePageMeta({
    title: 'Pricing — Savewise',
    description:
      'Free, Pro and Family tiers. Savewise is a portfolio project and processes no payments — every plan creates the same free account.',
  });

  return (
    <div className="pt-16">
      <Pricing />
      <Faq compact />
      <FinalCta />
    </div>
  );
}
