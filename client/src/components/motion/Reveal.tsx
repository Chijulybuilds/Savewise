import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import {
  DURATION,
  EASE_ENTRANCE,
  VIEWPORT,
  fadeIn,
  scaleIn,
  slideUp,
  staggerContainer,
  staticVariants,
} from '@/lib/motion';

/**
 * Motion primitives.
 *
 * Sections and cards compose these rather than writing variants inline, which
 * is what keeps every entrance in the product identical. Each one checks
 * `useReducedMotion` and swaps to a distance-free variant — the element still
 * becomes visible, it simply stops travelling.
 */

/**
 * A fixed set of motion-wrapped tags.
 *
 * Built once at module scope rather than calling `motion(tag)` during render:
 * that factory returns a *new component type* each time, which React treats as
 * a different element and remounts — losing focus, form state and any running
 * animation on every parent re-render.
 */
const TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  header: motion.header,
  footer: motion.footer,
  ul: motion.ul,
  li: motion.li,
  p: motion.p,
  span: motion.span,
  h2: motion.h2,
  h3: motion.h3,
} as const;

export type MotionTag = keyof typeof TAGS;

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before starting. Used to phrase a group by hand. */
  delay?: number;
  /** Render as something other than a `div` — keeps section markup semantic. */
  as?: MotionTag;
  id?: string;
}

function useVariants(base: Variants, delay: number): Variants {
  const reduced = useReducedMotion();
  const source = reduced ? staticVariants() : base;

  if (delay === 0) return source;

  const visible = source.visible;
  const transition =
    typeof visible === 'object' && visible !== null && 'transition' in visible
      ? (visible.transition as object)
      : { duration: DURATION.base, ease: EASE_ENTRANCE };

  return {
    ...source,
    visible: {
      ...(typeof visible === 'object' ? visible : {}),
      transition: { ...transition, delay },
    },
  };
}

function createReveal(base: Variants) {
  return function Reveal({ children, className, delay = 0, as = 'div', id }: RevealProps) {
    const variants = useVariants(base, delay);
    const Component = TAGS[as];

    return (
      <Component
        id={id}
        className={className}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
      >
        {children}
      </Component>
    );
  };
}

/** Fades in when scrolled into view. The quietest entrance we have. */
export const FadeIn = createReveal(fadeIn);

/** The default entrance: a short rise with a fade. */
export const SlideUp = createReveal(slideUp);

/** For things that should feel like they *appeared* — cards, badges, figures. */
export const ScaleIn = createReveal(scaleIn);

interface StaggerProps extends RevealProps {
  /** Gap between children, in seconds. */
  stagger?: number;
}

/**
 * Releases its `<StaggerItem>` children in sequence.
 *
 * Under reduced motion the stagger collapses to zero, so the group appears at
 * once instead of a slow cascade nobody asked for.
 */
export function Stagger({
  children,
  className,
  stagger = 0.07,
  delay = 0.05,
  as = 'div',
  id,
}: StaggerProps) {
  const reduced = useReducedMotion();
  const Component = TAGS[as];

  return (
    <Component
      id={id}
      className={className}
      variants={staggerContainer(reduced ? 0 : stagger, reduced ? 0 : delay)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: Omit<RevealProps, 'delay' | 'id'>) {
  const reduced = useReducedMotion();
  const Component = TAGS[as];

  return (
    <Component className={className} variants={reduced ? staticVariants() : slideUp}>
      {children}
    </Component>
  );
}

/**
 * A card that lifts very slightly on hover.
 *
 * Three pixels. Enough to say "this responds to you", not enough to shift the
 * reader's eye off the number they were reading.
 */
export function FloatingCard({ children, className, delay = 0 }: Omit<RevealProps, 'as' | 'id'>) {
  const reduced = useReducedMotion();
  const variants = useVariants(slideUp, delay);

  return (
    <motion.div
      className={cn('will-change-transform', className)}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      whileHover={reduced ? undefined : { y: -3 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}
