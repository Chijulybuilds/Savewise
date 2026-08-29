import type { Transition, Variants } from 'motion/react';

/**
 * The motion system.
 *
 * Three principles, applied everywhere:
 *
 * 1. **Motion explains, it does not decorate.** Things move to show where they
 *    came from or what changed. Nothing loops, nothing drifts, nothing moves
 *    because the page is idle.
 * 2. **One vocabulary.** Every entrance is a short rise with a fade; every
 *    interactive response is the same spring. When the whole product
 *    decelerates identically, motion reads as a material rather than an effect.
 * 3. **Distance is small, duration is short.** 8–20px and 0.4–0.7s. Anything
 *    larger reads as a slideshow and gets in the way of reading a number.
 *
 * Reduced-motion is honoured in two layers: this file exposes zero-distance
 * variants, and `index.css` collapses any CSS transition that slipped past.
 */

/** The house easing — a firm start that settles rather than bounces. */
export const EASE_ENTRANCE = [0.22, 1, 0.36, 1] as const;
export const EASE_SWIFT = [0.16, 1, 0.3, 1] as const;

/** For anything the user directly manipulates: buttons, cards, toggles. */
export const SPRING: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 32,
  mass: 0.8,
};

/** A softer spring for larger surfaces — panels, drawers, modals. */
export const SPRING_SOFT: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  mass: 1,
};

export const DURATION = {
  fast: 0.2,
  base: 0.45,
  slow: 0.7,
} as const;

/* -------------------------------------------------------------------------- */
/* Variants                                                                    */
/* -------------------------------------------------------------------------- */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE_ENTRANCE } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_ENTRANCE } },
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_ENTRANCE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.base, ease: EASE_ENTRANCE } },
};

/**
 * A parent that releases its children in sequence.
 *
 * `delayChildren` lets the container settle before anything inside it moves,
 * which is what makes a stagger read as one considered gesture rather than a
 * queue of separate animations.
 */
export function staggerContainer(stagger = 0.07, delay = 0.05): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };
}

export const staggerItem: Variants = slideUp;

/** Dialogs: scale from just under full size so they arrive rather than zoom. */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: SPRING_SOFT },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: DURATION.fast } },
};

export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/** Toasts and drawers arrive from the edge they are anchored to. */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: SPRING },
  exit: { opacity: 0, x: 24, transition: { duration: DURATION.fast } },
};

/**
 * Viewport trigger defaults.
 *
 * `once: true` — a section that re-animates every time it scrolls back into
 * view is a section the reader cannot re-read. `amount: 0.25` fires when a
 * quarter of the element is visible, which lands before the reader's eye does.
 */
export const VIEWPORT = { once: true, amount: 0.25 } as const;

/** For tall sections where waiting for 25% would be too late. */
export const VIEWPORT_EARLY = { once: true, amount: 0.1 } as const;

/* -------------------------------------------------------------------------- */
/* Reduced motion                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Strip the movement from a variant set while keeping the opacity change and,
 * crucially, the final visible state. Removing the animation entirely would
 * leave `initial="hidden"` elements stuck at `opacity: 0` forever.
 */
export function staticVariants(): Variants {
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.01 } },
  };
}
