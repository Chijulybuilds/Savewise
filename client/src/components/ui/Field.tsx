import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/cn';

/**
 * Form controls.
 *
 * Every control is wrapped by `Field`, which owns the wiring that is easy to
 * forget and expensive to get wrong:
 *
 * - a generated id shared by the `<label htmlFor>` and the control, so clicking
 *   the label focuses the input and a screen reader announces the right name;
 * - `aria-describedby` pointing at the hint *and* the error, so both are read
 *   rather than only the last one;
 * - `aria-invalid`, so the error state is conveyed without relying on the red.
 *
 * The error message uses `role="alert"` so it is announced the moment it
 * appears, which is what makes a failed submit perceivable without sight.
 */

interface FieldProps {
  label: string;
  /** Persistent helper text. Distinct from an error. */
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean;
  className?: string;
  /** Receives the wiring; render your control with these props. */
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
  }) => ReactNode;
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-critical" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-ink-subtle">optional</span>
        )}
      </label>

      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs text-critical">
          <svg
            viewBox="0 0 16 16"
            className="mt-px size-3.5 shrink-0"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 1.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5Zm0 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4.5Zm0 7.25a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  'w-full rounded-lg border bg-surface px-3 text-base text-ink transition-colors duration-150 ' +
  'placeholder:text-ink-subtle ' +
  'focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-subtle ' +
  'aria-[invalid=true]:border-critical aria-[invalid=true]:focus:ring-critical/30';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input ref={ref} className={cn(CONTROL_BASE, 'h-10 border-border', className)} {...props} />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(CONTROL_BASE, 'resize-y border-border py-2 leading-relaxed', className)}
      {...props}
    />
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}

/**
 * A native `<select>`, deliberately.
 *
 * A custom listbox would take a week to make as accessible as the one the
 * platform ships, and on mobile the native picker is genuinely better than
 * anything we would build. It is styled to match, with the chevron drawn by us
 * so it looks the same in every browser.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          CONTROL_BASE,
          'h-10 cursor-pointer appearance-none border-border pr-9',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m4 6 4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

/**
 * Money input.
 *
 * Shows major units with a currency symbol; the form layer converts to minor
 * units before anything is sent. `inputMode="decimal"` gets the numeric keypad
 * on mobile without `type="number"`, which brings spinners, silent scroll-wheel
 * edits and locale-dependent decimal parsing along with it.
 */
interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  symbol: string;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { symbol, className, ...props },
  ref,
) {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-ink-muted"
        aria-hidden="true"
      >
        {symbol}
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn(CONTROL_BASE, 'tabular h-10 border-border pl-8', className)}
        {...props}
      />
    </div>
  );
});

/** A styled checkbox that keeps the native input for keyboard and AT support. */
export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'size-4 shrink-0 cursor-pointer rounded border-border-strong text-primary',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
        {...props}
      />
    );
  },
);
