import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { Section, SectionHeading } from '../Section';

/**
 * The problem section.
 *
 * Named honestly rather than dramatised. Each card is a specific failure mode
 * someone will recognise from their own month — that recognition is what earns
 * the right to describe a solution in the next section.
 */

const PROBLEMS = [
  {
    title: 'Saving whatever is left',
    body: 'There is rarely anything left. Saving last means saving least, and it makes the amount a matter of luck rather than intent.',
  },
  {
    title: 'No idea where it went',
    body: 'The money is gone and the month felt ordinary. Without a breakdown, every month looks the same and nothing ever changes.',
  },
  {
    title: 'Budgets set by wishful thinking',
    body: 'A budget built on what you wish you spent gets abandoned by the second week — and then feels like a personal failure.',
  },
  {
    title: 'Saving in bursts',
    body: 'Two strong months, then a quiet one, then a purchase that undoes both. Consistency beats intensity, but nothing is tracking it.',
  },
  {
    title: 'Goals with no arithmetic',
    body: '"Save for rent" is a wish. Rent by August at ₦155,000 a month is a plan — and the difference is a calculation nobody does.',
  },
  {
    title: 'No warning before it is late',
    body: 'You find out you are behind when the deadline arrives, at which point the only fix is a large one.',
  },
] as const;

export function Problem() {
  return (
    <Section id="problem" tone="sunken">
      <div className="container-page">
        <SectionHeading
          eyebrow="The problem"
          title="Most saving fails for boring, fixable reasons"
          lede="Not discipline. Structure. Every one of these is a gap between intention and information."
        />

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {PROBLEMS.map((problem, index) => (
            <StaggerItem key={problem.title} as="div">
              <article className="group h-full rounded-2xl border border-border bg-surface p-6 transition-colors duration-300 hover:border-border-strong">
                <span className="tabular text-2xs font-semibold text-ink-subtle" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-base font-semibold text-ink">{problem.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{problem.body}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
