import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Section, SectionHeading } from '../Section';

/**
 * Pricing.
 *
 * Every tier's call to action goes to the same place: registration. There is no
 * billing in this project, so a "Buy Pro" button that opened a checkout would
 * be a dead end — and a dead CTA is worse than an honest one. The note under
 * the grid says so plainly.
 */

interface Tier {
  name: string;
  price: string;
  cadence?: string;
  summary: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '₦0',
    cadence: 'forever',
    summary: 'Everything you need to run a monthly budget and two savings goals.',
    features: [
      'Monthly budgets with category limits',
      'Up to 2 savings goals',
      'Unlimited transactions',
      'Monthly insights',
      'Light and dark themes',
    ],
    cta: 'Start free',
  },
  {
    name: 'Pro',
    price: '₦1,500',
    cadence: 'per month',
    summary: 'For people running several goals at once and planning further ahead.',
    features: [
      'Everything in Free',
      'Unlimited savings goals',
      'Recurring savings plans',
      'Twelve-month analytics and projections',
      'Category trend comparisons',
      'Export to CSV',
    ],
    cta: 'Start free trial',
    featured: true,
  },
  {
    name: 'Family',
    price: '₦3,500',
    cadence: 'per month',
    summary: 'Shared goals for a household, with everyone contributing.',
    features: [
      'Everything in Pro',
      'Up to 5 members',
      'Shared household goals',
      'Per-member contribution tracking',
      'Combined household budget',
    ],
    cta: 'Start free trial',
  },
];

export function Pricing({ compact = false }: { compact?: boolean }) {
  return (
    <Section id="pricing" tone="sunken" compact={compact}>
      <div className="container-page">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple tiers, no surprises"
          lede="Start free and stay there if it covers you. Nothing here charges a card."
          align="center"
        />

        <Stagger className="mt-14 grid items-start gap-5 lg:grid-cols-3" stagger={0.1}>
          {TIERS.map((tier) => (
            <StaggerItem key={tier.name} as="div">
              <article
                className={cn(
                  'relative flex h-full flex-col rounded-2xl border bg-surface p-6 sm:p-7',
                  tier.featured ? 'border-primary/40 shadow-lg lg:-my-4 lg:py-11' : 'border-border',
                )}
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-2xs font-medium text-primary-contrast">
                    Most useful
                  </span>
                )}

                <h3 className="text-sm font-semibold text-ink">{tier.name}</h3>

                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight text-ink">
                    {tier.price}
                  </span>
                  {tier.cadence && <span className="text-xs text-ink-subtle">{tier.cadence}</span>}
                </p>

                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{tier.summary}</p>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-muted">
                      <svg
                        viewBox="0 0 16 16"
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm3 4.3a.75.75 0 0 0-1.06 0L7.2 8.55 6.06 7.4A.75.75 0 0 0 5 8.46l1.67 1.68a.75.75 0 0 0 1.06 0L11 6.86a.75.75 0 0 0 0-1.06Z" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <ButtonLink
                  to="/register"
                  variant={tier.featured ? 'primary' : 'outline'}
                  size="lg"
                  fullWidth
                  className="mt-7"
                >
                  {tier.cta}
                </ButtonLink>
              </article>
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-relaxed text-ink-subtle">
          Savewise is a portfolio project and processes no payments. Every plan above creates the
          same free account — the tiers are here to show how the product would be positioned.
        </p>
      </div>
    </Section>
  );
}
