import { cn } from '@/lib/cn';

/**
 * Savewise wordmark.
 *
 * The mark is a rising bar in an aperture — savings accumulating inside a
 * container. Drawn as inline SVG rather than shipped as an asset: it inherits
 * `currentColor`, so it is correct in both themes and on any surface without a
 * second file, and it costs no network request.
 */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-8', className)}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* The container */}
      <rect x="2.5" y="2.5" width="27" height="27" rx="8.5" className="fill-primary" />
      {/* Three rising columns — the habit compounding */}
      <rect x="9" y="18" width="3.6" height="6" rx="1.8" className="fill-primary-contrast/55" />
      <rect
        x="14.2"
        y="13.5"
        width="3.6"
        height="10.5"
        rx="1.8"
        className="fill-primary-contrast/80"
      />
      <rect x="19.4" y="8" width="3.6" height="16" rx="1.8" className="fill-primary-contrast" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** Hide the wordmark, keeping only the mark. Used in the collapsed sidebar. */
  markOnly?: boolean;
}

export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {markOnly ? (
        // Without the wordmark the link would have no accessible name at all —
        // the mark itself is `aria-hidden` decoration.
        <span className="sr-only">Savewise</span>
      ) : (
        <span className="text-lg font-semibold tracking-tight text-ink">Savewise</span>
      )}
    </span>
  );
}
