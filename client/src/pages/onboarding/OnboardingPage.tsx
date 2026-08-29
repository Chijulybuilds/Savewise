import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  FINANCIAL_PRIORITIES,
  GOAL_CATEGORIES,
  buildStartingPlan,
  calculatePercentage,
  formatPercent,
  type FinancialPriority,
  type GoalCategory,
} from '@savewise/shared';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input, MoneyInput, Select } from '@/components/ui/Field';
import { SegmentedProgress } from '@/components/ui/Progress';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageMeta } from '@/hooks/usePageMeta';
import { cn } from '@/lib/cn';
import { EASE_ENTRANCE } from '@/lib/motion';
import { readMoney } from '@/lib/moneyField';
import { ApiError } from '@/services/api';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

/**
 * Onboarding.
 *
 * Five steps, one question each. The alternative — a single form with income,
 * priorities, savings and a goal — is the same information but reads as
 * paperwork, and paperwork is where new accounts are abandoned.
 *
 * State is held in the page and persisted to `sessionStorage` on every change,
 * so a refresh or an accidental back-navigation does not restart the flow. It
 * is cleared once onboarding completes.
 *
 * The final step shows a *suggested starting plan*. That phrasing is load
 * bearing: it is a rule of thumb applied to a number the user typed, not
 * advice, and the screen says so.
 */

const STORAGE_KEY = 'savewise.onboarding';

const STEPS = [
  { id: 'income', number: '01', label: 'Income' },
  { id: 'priorities', number: '02', label: 'Priorities' },
  { id: 'savings', number: '03', label: 'Savings' },
  { id: 'goal', number: '04', label: 'First goal' },
  { id: 'plan', number: '05', label: 'Your plan' },
] as const;

interface Draft {
  monthlyIncome: string;
  priorities: FinancialPriority[];
  targetMonthlySavings: string;
  goalName: string;
  goalAmount: string;
  goalCategory: GoalCategory;
  goalDeadline: string;
}

const EMPTY_DRAFT: Draft = {
  monthlyIncome: '',
  priorities: [],
  targetMonthlySavings: '',
  goalName: '',
  goalAmount: '',
  goalCategory: 'emergency',
  goalDeadline: '',
};

function loadDraft(): Draft {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? { ...EMPTY_DRAFT, ...(JSON.parse(stored) as Partial<Draft>) } : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

export default function OnboardingPage() {
  usePageMeta({ title: 'Set up your plan — Savewise', noIndex: true });

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { symbol, format } = useCurrency();
  const reduced = useReducedMotion();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Private mode with storage disabled: the flow still works, it just will
      // not survive a refresh.
    }
  }, [draft]);

  const income = readMoney(draft.monthlyIncome);
  const desiredSavings = readMoney(draft.targetMonthlySavings);
  const plan = buildStartingPlan(income, desiredSavings);

  const canAdvance =
    step === 0
      ? income > 0
      : step === 1
        ? draft.priorities.length > 0
        : step === 2
          ? desiredSavings >= 0
          : true;

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function togglePriority(key: FinancialPriority) {
    setDraft((current) => ({
      ...current,
      priorities: current.priorities.includes(key)
        ? current.priorities.filter((value) => value !== key)
        : [...current.priorities, key].slice(0, 4),
    }));
  }

  async function finish() {
    setSubmitting(true);
    setError(null);

    const goalAmount = readMoney(draft.goalAmount);
    const hasGoal = draft.goalName.trim().length >= 2 && goalAmount > 0;

    try {
      const result = await authService.completeOnboarding({
        monthlyIncome: income,
        priorities: draft.priorities,
        targetMonthlySavings: plan.savings,
        firstGoal: hasGoal
          ? {
              name: draft.goalName.trim(),
              targetAmount: goalAmount,
              category: draft.goalCategory,
              deadline: draft.goalDeadline ? new Date(draft.goalDeadline) : null,
            }
          : null,
      });

      setUser(result.user);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* Nothing to clean up if storage is unavailable. */
      }

      toast.success('You are set up', 'Your first budget is ready to edit.');
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not save your plan. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-header items-center justify-between px-6 lg:px-10">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 justify-center px-6 py-8 lg:px-10">
        <div className="w-full max-w-xl">
          <StepIndicator current={step} />

          <div className="mt-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: EASE_ENTRANCE }}
              >
                {step === 0 && (
                  <StepShell
                    title={`Let's start with what comes in${user?.firstName ? `, ${user.firstName}` : ''}`}
                    description="Roughly what do you earn in a typical month? An estimate is fine — you can change it any time."
                  >
                    <Field label="Monthly income" required>
                      {(props) => (
                        <MoneyInput
                          {...props}
                          symbol={symbol}
                          value={draft.monthlyIncome}
                          onChange={(event) => update({ monthlyIncome: event.target.value })}
                          placeholder="520,000"
                          autoFocus
                        />
                      )}
                    </Field>
                  </StepShell>
                )}

                {step === 1 && (
                  <StepShell
                    title="What are you working toward?"
                    description="Pick up to four. Savewise uses these to decide which insights are worth showing you."
                  >
                    <div className="flex flex-wrap gap-2">
                      {FINANCIAL_PRIORITIES.map((priority) => {
                        const selected = draft.priorities.includes(priority.key);
                        return (
                          <button
                            key={priority.key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => togglePriority(priority.key)}
                            className={cn(
                              'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                              selected
                                ? 'border-primary bg-primary-soft text-primary'
                                : 'border-border text-ink-muted hover:border-border-strong hover:text-ink',
                            )}
                          >
                            {priority.label}
                          </button>
                        );
                      })}
                    </div>
                  </StepShell>
                )}

                {step === 2 && (
                  <StepShell
                    title="How much would you like to save each month?"
                    description={`A common starting point is 20% — ${format(Math.round(income * 0.2))} on your income. Leave it blank and Savewise will suggest that.`}
                  >
                    <Field label="Monthly savings target">
                      {(props) => (
                        <MoneyInput
                          {...props}
                          symbol={symbol}
                          value={draft.targetMonthlySavings}
                          onChange={(event) => update({ targetMonthlySavings: event.target.value })}
                          placeholder={String(Math.round(income / 100 / 5) * 5)}
                          autoFocus
                        />
                      )}
                    </Field>

                    {desiredSavings > 0 && income > 0 && (
                      <p className="mt-3 text-xs text-ink-muted">
                        That is {formatPercent(calculatePercentage(desiredSavings, income), 1)} of
                        your income.
                        {desiredSavings > income * 0.5 &&
                          ' Savewise will cap the suggested plan at half your income so there is enough left to live on.'}
                      </p>
                    )}
                  </StepShell>
                )}

                {step === 3 && (
                  <StepShell
                    title="What is the first thing you are saving for?"
                    description="Optional, but a goal with a date is what makes the rest of Savewise useful. You can skip this and add one later."
                  >
                    <div className="space-y-4">
                      <Field label="Goal name">
                        {(props) => (
                          <Input
                            {...props}
                            value={draft.goalName}
                            onChange={(event) => update({ goalName: event.target.value })}
                            placeholder="Emergency fund"
                            autoFocus
                          />
                        )}
                      </Field>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Target amount">
                          {(props) => (
                            <MoneyInput
                              {...props}
                              symbol={symbol}
                              value={draft.goalAmount}
                              onChange={(event) => update({ goalAmount: event.target.value })}
                              placeholder="1,200,000"
                            />
                          )}
                        </Field>

                        <Field label="Category">
                          {(props) => (
                            <Select
                              {...props}
                              value={draft.goalCategory}
                              onChange={(event) =>
                                update({ goalCategory: event.target.value as GoalCategory })
                              }
                              options={GOAL_CATEGORIES.map((category) => ({
                                value: category.key,
                                label: category.label,
                              }))}
                            />
                          )}
                        </Field>
                      </div>

                      <Field label="Target date" hint="Used to work out the monthly amount.">
                        {(props) => (
                          <Input
                            {...props}
                            type="date"
                            value={draft.goalDeadline}
                            onChange={(event) => update({ goalDeadline: event.target.value })}
                          />
                        )}
                      </Field>
                    </div>
                  </StepShell>
                )}

                {step === 4 && (
                  <StepShell
                    title="Your suggested starting plan"
                    description="A starting point, built from the income you entered. Everything here is editable from the moment you land on your dashboard."
                  >
                    <div className="rounded-2xl border border-border bg-surface p-5">
                      <p className="text-xs text-ink-muted">Monthly income</p>
                      <p className="tabular mt-1 text-2xl font-semibold text-ink">
                        {format(plan.income)}
                      </p>

                      <SegmentedProgress
                        className="mt-5"
                        label="Suggested split"
                        segments={[
                          { value: plan.essentials, tone: 'primary', label: 'Essentials' },
                          { value: plan.savings, tone: 'accent', label: 'Savings' },
                          { value: plan.discretionary, tone: 'neutral', label: 'Discretionary' },
                        ]}
                      />

                      <dl className="mt-5 space-y-3">
                        <PlanRow
                          label="Essential expenses"
                          value={format(plan.essentials)}
                          share={calculatePercentage(plan.essentials, plan.income)}
                          swatch="bg-primary"
                        />
                        <PlanRow
                          label="Savings"
                          value={format(plan.savings)}
                          share={plan.savingsRate}
                          swatch="bg-accent"
                          accent
                        />
                        <PlanRow
                          label="Discretionary spending"
                          value={format(plan.discretionary)}
                          share={calculatePercentage(plan.discretionary, plan.income)}
                          swatch="bg-ink-subtle"
                        />
                      </dl>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
                      This is a suggestion, not financial advice. Savewise applies a common rule of
                      thumb to the figure you entered — it knows nothing about your circumstances. A
                      draft budget will be created from this split so you have something concrete to
                      adjust.
                    </p>

                    {error && (
                      <p
                        role="alert"
                        className="mt-4 rounded-lg bg-critical-soft px-3 py-2.5 text-sm text-critical"
                      >
                        {error}
                      </p>
                    )}
                  </StepShell>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-10 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
            >
              Back
            </Button>

            <div className="flex items-center gap-3">
              {step === 3 && (
                <Button variant="ghost" onClick={() => setStep(4)}>
                  Skip for now
                </Button>
              )}

              {step < STEPS.length - 1 ? (
                <Button
                  size="lg"
                  disabled={!canAdvance}
                  onClick={() => setStep((current) => current + 1)}
                >
                  Continue
                </Button>
              ) : (
                <Button size="lg" loading={submitting} onClick={() => void finish()}>
                  Start using Savewise
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{description}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

/**
 * The step rail.
 *
 * `aria-current="step"` marks where the user is, and the completed steps carry
 * a visually-hidden "completed" so the progress is legible without sight.
 */
function StepIndicator({ current }: { current: number }) {
  return (
    <nav aria-label="Setup progress">
      <ol className="flex items-center gap-2">
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;

          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'h-1 rounded-full transition-colors duration-500',
                    done || active ? 'bg-primary' : 'bg-surface-sunken',
                  )}
                />
                <p
                  className={cn(
                    'mt-2 hidden truncate text-2xs font-medium sm:block',
                    active ? 'text-primary' : done ? 'text-ink-muted' : 'text-ink-subtle',
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  <span className="tabular">{step.number}</span> {step.label}
                  {done && <span className="sr-only"> — completed</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-xs text-ink-subtle sm:hidden">
        Step {current + 1} of {STEPS.length} · {STEPS[current]?.label}
      </p>
    </nav>
  );
}

function PlanRow({
  label,
  value,
  share,
  swatch,
  accent,
}: {
  label: string;
  value: string;
  share: number;
  swatch: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex items-center gap-2 text-sm text-ink-muted">
        <span className={cn('size-2 rounded-sm', swatch)} aria-hidden="true" />
        {label}
      </dt>
      <dd className="flex items-baseline gap-2">
        <span className={cn('tabular text-sm font-semibold', accent ? 'text-primary' : 'text-ink')}>
          {value}
        </span>
        <span className="tabular w-10 text-right text-2xs text-ink-subtle">
          {Math.round(share)}%
        </span>
      </dd>
    </div>
  );
}
