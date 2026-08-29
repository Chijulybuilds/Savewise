import { motion } from 'motion/react';

import { MIN_PASSWORD_LENGTH } from '@savewise/shared';

import { cn } from '@/lib/cn';

/**
 * Password requirement checklist.
 *
 * Shows the rules being met as they are met, rather than waiting for a failed
 * submit to reveal them. Each rule is stated positively and mirrors exactly
 * what `passwordSchema` enforces — a checklist that disagrees with the
 * validator is worse than none at all.
 *
 * The list is an `aria-live` region so a screen-reader user hears requirements
 * being satisfied instead of only discovering them on rejection.
 */

interface Rule {
  label: string;
  test: (value: string) => boolean;
}

const RULES: Rule[] = [
  {
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (v) => v.length >= MIN_PASSWORD_LENGTH,
  },
  { label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'A number', test: (v) => /\d/.test(v) },
];

export function PasswordStrength({ password }: { password: string | undefined }) {
  const value = password ?? '';

  // Nothing typed yet: the hint under the field already says what is needed, so
  // showing four red crosses before the first keystroke would just be scolding.
  if (value.length === 0) return null;

  const met = RULES.filter((rule) => rule.test(value)).length;

  return (
    <div>
      <div className="flex gap-1.5" aria-hidden="true">
        {RULES.map((rule, index) => (
          <motion.span
            key={rule.label}
            className={cn(
              'h-1 flex-1 rounded-full',
              index < met
                ? met === RULES.length
                  ? 'bg-positive'
                  : met >= 3
                    ? 'bg-warning'
                    : 'bg-critical'
                : 'bg-surface-sunken',
            )}
            initial={false}
            animate={{ opacity: index < met ? 1 : 0.6 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </div>

      <ul className="mt-2.5 space-y-1" aria-live="polite">
        {RULES.map((rule) => {
          const passed = rule.test(value);
          return (
            <li
              key={rule.label}
              className={cn(
                'flex items-center gap-2 text-xs',
                passed ? 'text-positive' : 'text-ink-subtle',
              )}
            >
              <span
                className="flex size-3.5 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                {passed ? (
                  <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
                    <path d="M10.2 3.3a.7.7 0 0 0-1 0L4.9 7.6 3 5.7a.7.7 0 1 0-1 1l2.4 2.4a.7.7 0 0 0 1 0l4.8-4.8a.7.7 0 0 0 0-1Z" />
                  </svg>
                ) : (
                  <span className="size-1.5 rounded-full bg-current opacity-50" />
                )}
              </span>
              {/* The visible text carries the state for sighted users; the
                  `sr-only` suffix carries it for everyone else. */}
              {rule.label}
              <span className="sr-only">{passed ? ' — met' : ' — not yet met'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
