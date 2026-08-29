import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

/**
 * Button.
 *
 * A real `<button>` (or a real `<a>` via `ButtonLink`) — never a styled `div`.
 * That is not pedantry: it is what gives keyboard activation, focus order and
 * the correct role to a screen reader for free.
 *
 * The `active:scale-[0.98]` is the whole microinteraction. It reads as a
 * physical press without animating anything that would delay the click.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-swift ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-contrast shadow-xs hover:bg-primary-hover',
  secondary: 'bg-surface-sunken text-ink hover:bg-border/60',
  outline:
    'border border-border-strong bg-surface text-ink hover:border-ink-subtle hover:bg-surface-sunken',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-critical text-white shadow-xs hover:brightness-110',
  accent: 'bg-accent text-accent-contrast shadow-xs hover:brightness-105',
};

const SIZES: Record<ButtonSize, string> = {
  // 36 / 40 / 48px tall. The `md` default clears the 40px comfortable-target
  // guidance, and `sm` is reserved for dense toolbars where a label is present.
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export type ButtonProps = ButtonBaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      // Defaults to `button`. An unspecified type inside a form is `submit`,
      // which is how a "Cancel" button ends up saving the record.
      type={type}
      disabled={disabled || loading}
      // Announces the pending state instead of leaving a screen-reader user
      // with a button that silently stopped responding.
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-4" />
          {/* The label stays mounted so the button keeps its width and the
              surrounding layout does not jump while a request is in flight. */}
          <span className="opacity-70">{children}</span>
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
});

export type ButtonLinkProps = ButtonBaseProps & LinkProps;

/** The same visual treatment on a real anchor — so it opens in a new tab, copies, and is crawlable. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}

/**
 * A square button holding only an icon.
 *
 * `label` is required and becomes `aria-label` — an icon-only control with no
 * accessible name is invisible to assistive technology, so the API makes it
 * impossible to omit.
 */
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'fullWidth'> {
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', variant = 'ghost', className, children, ...props },
  ref,
) {
  const dimensions = size === 'sm' ? 'size-9' : size === 'lg' ? 'size-12' : 'size-10';

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={cn('px-0', dimensions, className)}
      {...props}
    >
      {children}
    </Button>
  );
});
