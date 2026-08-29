import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { cn } from '@/lib/cn';
import { DEMO_INSIGHTS } from '../demoData';
import { Section, SectionHeading } from '../Section';

/**
 * Insights section.
 *
 * The important line on this whole page is the one under the heading: these are
 * rules, not a model. Claiming AI would be both untrue and worse — a rule can
 * be explained, and "you spent 26% more on transport than last month" is more
 * useful than a confident guess about why.
 */

const SEVERITY_STYLES = {
  positive: {
    ring: 'ring-positive/20',
    chip: 'bg-positive-soft text-positive',
    label: 'Good news',
  },
  warning: {
    ring: 'ring-warning/25',
    chip: 'bg-warning-soft text-warning',
    label: 'Worth a look',
  },
  neutral: {
    ring: 'ring-border',
    chip: 'bg-surface-sunken text-ink-muted',
    label: 'Noticed',
  },
} as const;

export function InsightsShowcase() {
  return (
    <Section id="insights" tone="sunken">
      <div className="container-page">
        <SectionHeading
          eyebrow="Financial insights"
          title="Plain sentences about your own numbers"
          lede="Savewise compares this month with last, your spending with your limits, and your pace with your deadlines. Every insight is a rule you could check by hand — no model, no guesswork, no pretending."
        />

        <Stagger className="mt-14 grid gap-4 md:grid-cols-2" stagger={0.08}>
          {DEMO_INSIGHTS.map((insight) => {
            const style = SEVERITY_STYLES[insight.severity];

            return (
              <StaggerItem key={insight.title} as="div">
                <article
                  className={cn(
                    'flex h-full flex-col rounded-2xl bg-surface p-6 ring-1 ring-inset',
                    style.ring,
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn('rounded-full px-2.5 py-1 text-2xs font-medium', style.chip)}
                    >
                      {style.label}
                    </span>

                    <div className="text-right">
                      <p className="tabular text-xl font-semibold text-ink">{insight.metric}</p>
                      <p className="text-2xs text-ink-subtle">{insight.metricLabel}</p>
                    </div>
                  </div>

                  <h3 className="mt-5 text-base font-semibold text-ink">{insight.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{insight.message}</p>

                  <p className="mt-auto flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-ink-muted">
                    <svg
                      viewBox="0 0 16 16"
                      className="mt-0.5 size-3.5 shrink-0 text-primary"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M8 1.5a4.5 4.5 0 0 0-2.6 8.17c.35.25.6.63.6 1.06v.02a.75.75 0 0 0 .75.75h2.5a.75.75 0 0 0 .75-.75v-.02c0-.43.25-.81.6-1.06A4.5 4.5 0 0 0 8 1.5ZM6.5 13a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3Z" />
                    </svg>
                    {insight.recommendation}
                  </p>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>

        <p className="mt-8 text-center text-xs text-ink-subtle">
          Illustrative examples. Your insights are generated from your own records.
        </p>
      </div>
    </Section>
  );
}
