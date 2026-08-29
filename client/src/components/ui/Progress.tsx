import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/cn';
import { EASE_ENTRANCE } from '@/lib/motion';

/**
 * Progress bar.
 *
 * The fill animates from zero on mount, which is the one place in the product
 * where motion carries meaning rather than polish: watching a bar travel to 72%
 * communicates "you have covered this much ground" in a way a static bar does
 * not.
 *
 * `role="progressbar"` with the aria value attributes means the same
 * information is available to a screen reader, which sees no animation at all.
 */

export type ProgressTone = 'primary' | 'positive' | 'warning' | 'critical' | 'accent' | 'neutral';

const TONES: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  positive: 'bg-positive',
  warning: 'bg-warning',
  critical: 'bg-critical',
  accent: 'bg-accent',
  neutral: 'bg-ink-subtle',
};

const SIZES = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2.5',
} as const;

interface ProgressProps {
  /** 0–100. Values above 100 are clamped for the bar but kept in the label. */
  value: number;
  tone?: ProgressTone;
  size?: keyof typeof SIZES;
  className?: string;
  /** Accessible name — what this bar is measuring. */
  label: string;
  /** Skip the entrance animation, e.g. inside a list that already staggers. */
  animate?: boolean;
}

export function Progress({
  value,
  tone = 'primary',
  size = 'md',
  className,
  label,
  animate = true,
}: ProgressProps) {
  const reduced = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        'w-full overflow-hidden rounded-full bg-surface-sunken',
        SIZES[size],
        className,
      )}
    >
      <motion.div
        className={cn('h-full rounded-full', TONES[tone])}
        initial={animate && !reduced ? { width: 0 } : false}
        animate={{ width: `${clamped}%` }}
        transition={reduced ? { duration: 0 } : { duration: 0.9, ease: EASE_ENTRANCE, delay: 0.1 }}
      />
    </div>
  );
}

interface SegmentedProgressProps {
  segments: { value: number; tone: ProgressTone; label: string }[];
  className?: string;
  label: string;
}

/**
 * A single bar split across several categories — the needs / wants / savings
 * split, or a budget broken down by bucket. One bar reads faster than three,
 * and the relative widths *are* the comparison.
 */
export function SegmentedProgress({ segments, className, label }: SegmentedProgressProps) {
  const reduced = useReducedMotion();
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);

  return (
    <div
      className={cn(
        'flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken',
        className,
      )}
      role="img"
      aria-label={`${label}: ${segments.map((s) => `${s.label} ${Math.round((s.value / (total || 1)) * 100)}%`).join(', ')}`}
    >
      {segments.map((segment, index) => (
        <motion.div
          key={segment.label}
          className={cn('h-full first:rounded-l-full last:rounded-r-full', TONES[segment.tone])}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${total > 0 ? (Math.max(0, segment.value) / total) * 100 : 0}%` }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.8, ease: EASE_ENTRANCE, delay: 0.1 + index * 0.08 }
          }
        />
      ))}
    </div>
  );
}

interface RingProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: ProgressTone;
  label: string;
  children?: React.ReactNode;
  className?: string;
}

const RING_STROKES: Record<ProgressTone, string> = {
  primary: 'stroke-primary',
  positive: 'stroke-positive',
  warning: 'stroke-warning',
  critical: 'stroke-critical',
  accent: 'stroke-accent',
  neutral: 'stroke-ink-subtle',
};

/** A circular gauge for a single headline percentage — goal completion, budget used. */
export function RingProgress({
  value,
  size = 120,
  strokeWidth = 10,
  tone = 'primary',
  label,
  children,
  className,
}: RingProgressProps) {
  const reduced = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={`${label}: ${Math.round(clamped)} percent`}
        // Rotated so the arc starts at twelve o'clock rather than three.
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-surface-sunken"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('fill-none', RING_STROKES[tone])}
          strokeDasharray={circumference}
          initial={reduced ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={
            reduced ? { duration: 0 } : { duration: 1.1, ease: EASE_ENTRANCE, delay: 0.15 }
          }
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  );
}
