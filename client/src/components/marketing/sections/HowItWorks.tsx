import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { Section, SectionHeading } from '../Section';

/**
 * How it works.
 *
 * Four steps, each with the honest amount of effort it takes. "Two minutes"
 * sets a real expectation; "get started in seconds" would not survive contact
 * with the first form.
 */

const STEPS = [
  {
    step: '01',
    title: 'Add your income',
    body: 'Tell Savewise what comes in and when. Salary, freelance work, anything irregular — it all counts toward what you can plan with.',
    effort: 'About two minutes',
  },
  {
    step: '02',
    title: 'Set your goals',
    body: 'Name what you are saving for, the amount, and the date. Savewise works out the monthly contribution that gets you there.',
    effort: 'One minute per goal',
  },
  {
    step: '03',
    title: 'Build your budget',
    body: 'Start from the suggested split and adjust it. Category limits, savings first, everything else after.',
    effort: 'Five minutes, once a month',
  },
  {
    step: '04',
    title: 'Track your progress',
    body: 'Record what you spend and contribute. Savewise handles the arithmetic and tells you when something needs attention.',
    effort: 'A few seconds at a time',
  },
] as const;

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="sunken">
      <div className="container-page">
        <SectionHeading
          eyebrow="Getting started"
          title="Four steps, then it runs itself"
          lede="The setup is front-loaded on purpose. Do it once properly and the monthly upkeep is a few taps."
        />

        <Stagger
          className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.08}
        >
          {STEPS.map((step) => (
            <StaggerItem key={step.step} as="div" className="bg-surface">
              <article className="flex h-full flex-col p-6">
                <span className="tabular text-2xs font-semibold text-primary" aria-hidden="true">
                  {step.step}
                </span>
                <h3 className="mt-3 text-base font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                <p className="mt-5 border-t border-border pt-4 text-2xs text-ink-subtle">
                  {step.effort}
                </p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
