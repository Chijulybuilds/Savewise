import type { ReactNode } from 'react';

import { SlideUp } from '@/components/motion/Reveal';
import { cn } from '@/lib/cn';

/**
 * The rhythm of the landing page.
 *
 * Every section uses the same vertical spacing and the same eyebrow → heading →
 * lede stack. That repetition is what makes a long page feel composed rather
 * than assembled: the reader learns the shape once and can then skim it.
 */

interface SectionProps {
  id?: string;
  children: ReactNode;
  className?: string;
  /** A slightly recessed background, for alternating bands down the page. */
  tone?: 'canvas' | 'sunken' | 'ink';
  /** Tighter spacing for sections that sit directly beneath another. */
  compact?: boolean;
}

export function Section({
  id,
  children,
  className,
  tone = 'canvas',
  compact = false,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative',
        compact ? 'py-16 sm:py-20' : 'py-20 sm:py-28 lg:py-32',
        tone === 'sunken' && 'bg-surface-sunken/50',
        tone === 'ink' && 'bg-ink text-ink-inverse dark:bg-surface-sunken',
        className,
      )}
      // Scroll offset for the fixed header, so an in-page anchor does not land
      // with its heading tucked underneath the navigation bar.
      style={{ scrollMarginTop: '4rem' }}
    >
      {children}
    </section>
  );
}

interface SectionHeadingProps {
  /** A short category label above the heading. */
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  /** Inverts the palette for use on the dark band. */
  inverse?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  className,
  inverse = false,
}: SectionHeadingProps) {
  return (
    <SlideUp className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && (
        <p
          className={cn(
            'mb-4 text-2xs font-semibold uppercase tracking-[0.14em]',
            inverse ? 'text-primary' : 'text-primary',
          )}
        >
          {eyebrow}
        </p>
      )}

      <h2
        className={cn(
          'text-3xl font-semibold tracking-tight sm:text-4xl',
          inverse ? 'text-ink-inverse' : 'text-ink',
        )}
      >
        {title}
      </h2>

      {lede && (
        <p
          className={cn(
            'mt-4 text-lg leading-relaxed',
            inverse ? 'text-ink-inverse/70' : 'text-ink-muted',
          )}
        >
          {lede}
        </p>
      )}
    </SlideUp>
  );
}

/**
 * A hairline that fades out at both ends.
 *
 * Used between sections where a full-bleed rule would be too assertive — it
 * suggests a boundary without drawing one.
 */
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-px w-full bg-gradient-to-r from-transparent via-border to-transparent',
        className,
      )}
      role="presentation"
    />
  );
}
