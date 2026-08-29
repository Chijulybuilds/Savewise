import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { Avatar } from '@/components/ui/Avatar';
import { DEMO_TESTIMONIALS } from '../demoData';
import { Section, SectionHeading } from '../Section';

/**
 * Social proof.
 *
 * Labelled as illustrative, prominently and more than once. Savewise is a
 * portfolio project with no users, and presenting invented quotes as real
 * testimonials would be the one genuinely dishonest thing on the page — the
 * quotes are here to show the *voice*, not to claim traction.
 */

export function SocialProof() {
  return (
    <Section id="stories">
      <div className="container-page">
        <SectionHeading
          eyebrow="Illustrative stories"
          title="What using it actually sounds like"
          lede="Written to show how Savewise fits into a month. These are sample scenarios, not customer quotes."
          align="center"
        />

        <Stagger className="mt-14 grid gap-4 md:grid-cols-3" stagger={0.1}>
          {DEMO_TESTIMONIALS.map((testimonial) => (
            <StaggerItem key={testimonial.name} as="div">
              <figure className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6">
                <svg
                  viewBox="0 0 24 24"
                  className="size-6 text-primary/30"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M9.5 5C6.5 6.6 4.8 9.4 4.8 13v6h6.4v-6H8c0-2.2 1-3.9 2.9-4.9L9.5 5Zm9.3 0C15.8 6.6 14 9.4 14 13v6h6.4v-6h-3.2c0-2.2 1-3.9 2.9-4.9L18.8 5Z" />
                </svg>

                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink">
                  {testimonial.quote}
                </blockquote>

                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                  <Avatar name={testimonial.name} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {testimonial.name}
                    </span>
                    <span className="block truncate text-xs text-ink-subtle">
                      {testimonial.role}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-8 text-center text-xs text-ink-subtle">
          Sample scenarios written for this demonstration. Savewise is a portfolio project and has
          no customers to quote.
        </p>
      </div>
    </Section>
  );
}
