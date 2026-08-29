import { Spinner } from '@/components/ui/Spinner';

/**
 * Shown while a lazily-loaded route chunk downloads.
 *
 * Deliberately minimal and centred rather than a full skeleton: a route chunk
 * usually arrives in well under a second, and a detailed skeleton that flashes
 * for 200ms is more jarring than a quiet spinner.
 */
export function RouteFallback() {
  return (
    <div
      className="flex min-h-[60dvh] items-center justify-center"
      role="status"
      aria-label="Loading page"
    >
      <Spinner className="size-6 text-ink-subtle" />
    </div>
  );
}
