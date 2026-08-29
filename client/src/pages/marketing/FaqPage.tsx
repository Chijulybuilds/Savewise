import { Faq } from '@/components/marketing/sections/Faq';
import { FinalCta } from '@/components/marketing/sections/FinalCta';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function FaqPage() {
  usePageMeta({
    title: 'FAQ — Savewise',
    description:
      'How Savewise works, why it never holds your money, how the insights are generated, and what happens to your data.',
  });

  return (
    <div className="pt-16">
      <Faq />
      <FinalCta />
    </div>
  );
}
