import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';
import { modalContent, overlay } from '@/lib/motion';
import { Button, IconButton } from './Button';

/**
 * Accessible dialog.
 *
 * Built by hand rather than pulled from a library, and the accessibility work
 * is the reason it exists:
 *
 * - **Focus is moved in** on open and **restored** to the trigger on close, so
 *   a keyboard user is never dropped back at the top of the document.
 * - **Focus is trapped**: Tab and Shift+Tab cycle within the dialog, because
 *   tabbing onto the page behind an open modal is disorienting and lets a user
 *   interact with content that is visually hidden from them.
 * - **Escape closes**, and the backdrop click closes — but only when the press
 *   *started* on the backdrop, so a text selection that drifts outside the
 *   dialog does not dismiss it and lose the form.
 * - `aria-modal` plus a labelled title tells assistive technology that the rest
 *   of the page is inert.
 *
 * Rendered in a portal so no ancestor's `overflow` or `transform` can clip it.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // The page behind must not scroll while a dialog is open. `scrollbar-gutter`
    // in the base stylesheet keeps the layout from shifting when it locks.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first control rather than the panel itself, so a keyboard user
    // lands on something they can act on.
    //
    // The guard matters: a field marked `autoFocus` claims focus synchronously
    // on mount, and a timer that fires 50ms later would yank focus away from it
    // — mid-keystroke for anyone who started typing immediately. If focus is
    // already inside the dialog, leave it exactly where it is.
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;

      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }, 50);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      // Wrap at both ends — this is the trap.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  // Tracks where a press began, so a drag that ends on the backdrop after
  // starting inside the dialog does not count as "clicked outside".
  const pressStartedOnBackdrop = useRef(false);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            variants={overlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(event) => {
              pressStartedOnBackdrop.current = event.target === event.currentTarget;
            }}
            onMouseUp={(event) => {
              if (pressStartedOnBackdrop.current && event.target === event.currentTarget) onClose();
              pressStartedOnBackdrop.current = false;
            }}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            variants={modalContent}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-border bg-surface shadow-xl',
              // A sheet on phones, a centred dialog from `sm` up. Not the same
              // component squeezed — a different, better shape for the screen.
              'rounded-t-3xl sm:rounded-2xl',
              SIZES[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold text-ink">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
                    {description}
                  </p>
                )}
              </div>
              <IconButton
                label="Close"
                size="sm"
                onClick={onClose}
                className="-mr-1 -mt-1 shrink-0"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
                  <path
                    d="m4 4 8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </IconButton>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-sunken/50 px-5 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

/** Destructive confirmations. Deletion is irreversible, so it always asks. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = true,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
