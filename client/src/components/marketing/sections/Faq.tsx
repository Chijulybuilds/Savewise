import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

import { SlideUp } from '@/components/motion/Reveal';
import { cn } from '@/lib/cn';
import { EASE_SWIFT } from '@/lib/motion';
import { Section, SectionHeading } from '../Section';

/**
 * FAQ accordion.
 *
 * The panel is animated with `height: auto` rather than a fixed pixel value, so
 * the answer can be any length and still open cleanly. `aria-expanded` and
 * `aria-controls` on the trigger, plus a real `<h3>` wrapping the button, keep
 * the disclosure pattern navigable by heading — which is how screen-reader
 * users actually move through a page like this.
 *
 * Multiple panels can be open at once. Forcing one-at-a-time would mean closing
 * an answer someone was mid-way through reading.
 */

const QUESTIONS = [
  {
    question: 'Does Savewise hold my money?',
    answer:
      'No. Savewise is a planning and tracking tool — it records what you have decided to do with your money and holds you to it. There are no accounts, no deposits, no transfers and no bank connections. Every balance you see is a record you created.',
  },
  {
    question: 'Do I have to connect my bank account?',
    answer:
      'There is nothing to connect. You record income, spending and contributions yourself. That is more effort than an automatic feed, and it is also why the categories are always right and why nothing about your bank leaves your bank.',
  },
  {
    question: 'How are the insights generated? Is it AI?',
    answer:
      'No. It is a rules engine — a set of explicit comparisons over your own figures. "You spent 26% more on transport than last month" is arithmetic, not a prediction. Every insight could be checked by hand, which is exactly why it can be trusted.',
  },
  {
    question: 'What happens if I miss a contribution?',
    answer:
      'Nothing punitive. Savewise recalculates: it shows the new monthly amount needed to still hit your deadline, and flags the goal as behind schedule so you find out while there is time to fix it cheaply.',
  },
  {
    question: 'Can I use a currency other than naira?',
    answer:
      'Yes. Savewise supports the naira, dollar, pound, euro, cedi, shilling and rand, and formats amounts for the currency you choose. Every amount is stored as a whole number of minor units, so there is no rounding drift regardless of currency.',
  },
  {
    question: 'Is the suggested plan financial advice?',
    answer:
      'It is not. The starting split Savewise proposes during onboarding is a common rule of thumb applied to the income you entered, offered as a starting point to edit. It knows nothing about your circumstances, and it is labelled as a suggestion everywhere it appears.',
  },
  {
    question: 'What happens to my data?',
    answer:
      'It stays in your account. Savewise stores what you enter — income, budgets, goals, transactions — and nothing else. Passwords are hashed, sessions are held in httpOnly cookies that page scripts cannot read, and there is no third-party analytics on the application.',
  },
];

export function Faq({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState<number[]>([0]);

  const toggle = (index: number) =>
    setOpen((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index],
    );

  return (
    <Section id="faq" compact={compact}>
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="FAQ"
            title="The questions worth asking first"
            lede="Particularly the one about whether we hold your money. We do not."
            className="lg:sticky lg:top-24"
          />

          <SlideUp>
            <ul className="divide-y divide-border border-y border-border">
              {QUESTIONS.map((item, index) => (
                <FaqItem
                  key={item.question}
                  question={item.question}
                  answer={item.answer}
                  open={open.includes(index)}
                  onToggle={() => toggle(index)}
                  id={`faq-${index}`}
                />
              ))}
            </ul>
          </SlideUp>
        </div>
      </div>
    </Section>
  );
}

interface FaqItemProps {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
  id: string;
}

function FaqItem({ question, answer, open, onToggle, id }: FaqItemProps) {
  const reduced = useReducedMotion();

  return (
    <li>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-trigger`}
          className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-base font-medium text-ink">{question}</span>

          <motion.span
            className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-ink-muted"
            animate={{ rotate: open ? 45 : 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.25, ease: EASE_SWIFT }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" className="size-3" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </motion.span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-trigger`}
            // Animating to `auto` lets any answer length open correctly; the
            // overflow clip is what keeps the text from spilling mid-transition.
            initial={reduced ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { height: 'auto', opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0.1 } : { duration: 0.3, ease: EASE_SWIFT }}
            className={cn('overflow-hidden')}
          >
            <p className="max-w-prose pb-6 pr-10 text-sm leading-relaxed text-ink-muted">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
