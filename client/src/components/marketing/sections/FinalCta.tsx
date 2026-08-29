import { SlideUp } from '@/components/motion/Reveal';
import { ButtonLink } from '@/components/ui/Button';
import { Section } from '../Section';

/**
 * Closing call to action.
 *
 * One statement, one button. The page has already made its argument; adding a
 * feature list here would only give the reader something new to weigh up at the
 * exact moment they should be deciding.
 */
export function FinalCta() {
  return (
    <Section id="get-started" className="overflow-hidden">
      <div className="container-page">
        <SlideUp className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* A quiet wash, drawn in CSS. */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(70% 60% at 50% 0%, hsl(var(--primary) / 0.12), transparent 70%)',
            }}
          />
          <div
            className="grid-texture pointer-events-none absolute inset-0 -z-10 opacity-30"
            style={{ maskImage: 'radial-gradient(60% 70% at 50% 50%, black, transparent)' }}
            aria-hidden="true"
          />

          <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
            Your future deserves a plan, not a hope.
          </h2>

          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
            Set one goal, give it a date, and let the arithmetic do the rest.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink to="/register" size="lg">
              Create your savings plan
            </ButtonLink>
            <ButtonLink to="/login" variant="outline" size="lg">
              I already have an account
            </ButtonLink>
          </div>

          <p className="mt-7 text-xs text-ink-subtle">
            Free to start · No card required · Savewise never holds your money
          </p>
        </SlideUp>
      </div>
    </Section>
  );
}
