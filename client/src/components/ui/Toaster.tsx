import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { slideInRight } from '@/lib/motion';
import { useToastStore, type ToastVariant } from '@/store/toastStore';

/**
 * Toast viewport.
 *
 * Mounted once at the app root. The `aria-live` region is the important part:
 * a confirmation that only exists visually is invisible to a screen-reader
 * user, who then has no idea whether their save worked.
 *
 * `polite` for success and info so they queue behind whatever is being read;
 * errors are rendered in an `assertive` region so they interrupt.
 */

const ICONS: Record<ToastVariant, ReactNode> = {
  success: (
    <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm3.7 5.3a.9.9 0 0 0-1.3 0L9 10.7 7.6 9.3a.9.9 0 1 0-1.3 1.3l2 2a.9.9 0 0 0 1.3 0l4.1-4.1a.9.9 0 0 0 0-1.2Z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.5a.9.9 0 0 1 .9.9v4.2a.9.9 0 1 1-1.8 0V6.4a.9.9 0 0 1 .9-.9Zm0 8.9a1.05 1.05 0 1 1 0-2.1 1.05 1.05 0 0 1 0 2.1Z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.4a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Zm.9 8.7a.9.9 0 1 1-1.8 0V9.6a.9.9 0 1 1 1.8 0v4.5Z" />
    </svg>
  ),
};

const TONES: Record<ToastVariant, string> = {
  success: 'border-positive/25 bg-surface text-positive',
  error: 'border-critical/25 bg-surface text-critical',
  info: 'border-info/25 bg-surface text-info',
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  const errors = toasts.filter((toast) => toast.variant === 'error');
  const others = toasts.filter((toast) => toast.variant !== 'error');

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:items-end sm:p-6"
      // Not `role="region"` — this is a live announcer, and giving it a
      // landmark role would put an empty region in the page outline.
    >
      <div
        aria-live="assertive"
        aria-atomic="false"
        className="flex w-full flex-col items-center gap-2 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {errors.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </AnimatePresence>
      </div>

      <div
        aria-live="polite"
        aria-atomic="false"
        className="flex w-full flex-col items-center gap-2 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {others.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: { id: string; variant: ToastVariant; title: string; description?: string | undefined };
  onDismiss: () => void;
}) {
  return (
    <motion.div
      layout
      variants={slideInRight}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
        TONES[toast.variant],
      )}
    >
      <span className="mt-0.5 shrink-0">{ICONS[toast.variant]}</span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-ink-muted">{toast.description}</p>}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-0.5 shrink-0 rounded p-1 text-ink-subtle transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
          <path
            d="m4 4 8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </motion.div>
  );
}
