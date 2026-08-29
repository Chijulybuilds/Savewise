import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with conflict resolution.
 *
 * `clsx` handles the conditionals; `tailwind-merge` makes the *last* utility
 * win when two conflict. Without it, `cn('px-4', props.className)` silently
 * ignores a caller's `px-8`, which quietly breaks every component that accepts
 * a `className` override.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
