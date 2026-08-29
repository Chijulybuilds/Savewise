import { motion, useReducedMotion } from 'motion/react';

import { SlideUp } from '@/components/motion/Reveal';
import { cn } from '@/lib/cn';
import { EASE_ENTRANCE, VIEWPORT } from '@/lib/motion';
import { Section, SectionHeading } from '../Section';

/**
 * Product reveal — the pipeline from income to confidence.
 *
 * The animation carries the argument: the stages light up *in order*, and the
 * connector between each pair draws before the next stage appears. That
 * sequence is the point — each step depends on the one before it, and a static
 * list of five boxes would not say so.
 */

const STAGES = [
  {
    label: 'Income',
    detail: 'Start from what actually arrives, not what you hope to earn.',
  },
  {
    label: 'Budget',
    detail: 'Give every naira a job before the month begins.',
  },
  {
    label: 'Savings plan',
    detail: 'A fixed amount, on a schedule, with a finish line.',
  },
  {
    label: 'Progress',
    detail: 'Contributions tracked against goals, month by month.',
  },
  {
    label: 'Confidence',
    detail: 'You know what you can spend, and what happens if you keep going.',
  },
] as const;

export function ProductReveal() {
  const reduced = useReducedMotion();

  return (
    <Section id="product">
      <div className="container-page">
        <SectionHeading
          eyebrow="How Savewise works"
          title="One loop, running every month"
          lede="Savewise is not a pile of features. It is a single sequence, and each stage only works because the one before it did."
          align="center"
        />

        {/* Desktop: a horizontal pipeline. */}
        <div className="mt-16 hidden lg:block">
          <ol className="flex items-stretch">
            {STAGES.map((stage, index) => (
              <li key={stage.label} className="flex flex-1 items-start">
                <motion.div
                  className="flex-1"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT}
                  transition={{ delay: index * 0.16, duration: 0.55, ease: EASE_ENTRANCE }}
                >
                  <StageCard stage={stage} index={index} />
                </motion.div>

                {index < STAGES.length - 1 && (
                  <Connector delay={index * 0.16 + 0.32} reduced={Boolean(reduced)} />
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* Mobile and tablet: a vertical sequence. Not the desktop row squeezed —
            a horizontal pipeline at 375px would be five illegible columns. */}
        <ol className="mt-14 space-y-3 lg:hidden">
          {STAGES.map((stage, index) => (
            <motion.li
              key={stage.label}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={VIEWPORT}
              transition={{ delay: index * 0.1, duration: 0.5, ease: EASE_ENTRANCE }}
              className="relative flex gap-4"
            >
              <div className="flex flex-col items-center">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-contrast">
                  {index + 1}
                </span>
                {index < STAGES.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                )}
              </div>

              <div className="pb-5">
                <h3 className="text-base font-semibold text-ink">{stage.label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{stage.detail}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <SlideUp className="mx-auto mt-14 max-w-xl text-center" delay={0.2}>
          <p className="text-sm text-ink-muted">
            Nothing here moves money. Savewise records what you decide and holds you to it.
          </p>
        </SlideUp>
      </div>
    </Section>
  );
}

function StageCard({ stage, index }: { stage: (typeof STAGES)[number]; index: number }) {
  const isLast = index === STAGES.length - 1;

  return (
    <div
      className={cn(
        'h-full rounded-2xl border p-5',
        isLast ? 'border-primary/30 bg-primary-soft' : 'border-border bg-surface',
      )}
    >
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-lg text-xs font-semibold',
          isLast ? 'bg-primary text-primary-contrast' : 'bg-surface-sunken text-ink-muted',
        )}
        aria-hidden="true"
      >
        {index + 1}
      </span>
      <h3 className={cn('mt-4 text-sm font-semibold', isLast ? 'text-primary' : 'text-ink')}>
        {stage.label}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{stage.detail}</p>
    </div>
  );
}

/** The line between two stages, drawn left to right as the sequence advances. */
function Connector({ delay, reduced }: { delay: number; reduced: boolean }) {
  return (
    <div className="relative mx-2 mt-9 h-px w-8 shrink-0 self-start bg-border" aria-hidden="true">
      <motion.div
        className="absolute inset-0 origin-left bg-primary"
        initial={reduced ? { scaleX: 1 } : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={VIEWPORT}
        transition={{ delay, duration: 0.4, ease: EASE_ENTRANCE }}
      />
    </div>
  );
}
