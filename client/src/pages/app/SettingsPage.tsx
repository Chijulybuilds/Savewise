import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import {
  CURRENCIES,
  CURRENCY_CODES,
  FINANCIAL_PRIORITIES,
  changePasswordSchema,
  type ChangePasswordInput,
  type FinancialPriority,
} from '@savewise/shared';

import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { SlideUp } from '@/components/motion/Reveal';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Checkbox, Field, Input, MoneyInput, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageMeta } from '@/hooks/usePageMeta';
import { readMoney, writeMoney } from '@/lib/moneyField';
import { cn } from '@/lib/cn';
import { ApiError } from '@/services/api';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore, type ThemePreference } from '@/store/themeStore';
import { toast } from '@/store/toastStore';

/**
 * Settings.
 *
 * Grouped into tabs rather than one long scroll: profile, preferences,
 * appearance and security are unrelated concerns, and burying "change password"
 * under a wall of notification toggles is how people fail to change it.
 */

type Section = 'profile' | 'preferences' | 'appearance' | 'security';

const SECTIONS = [
  { value: 'profile' as const, label: 'Profile' },
  { value: 'preferences' as const, label: 'Preferences' },
  { value: 'appearance' as const, label: 'Appearance' },
  { value: 'security' as const, label: 'Security' },
];

export default function SettingsPage() {
  usePageMeta({ title: 'Settings — Savewise', noIndex: true });
  const [section, setSection] = useState<Section>('profile');

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile, how Savewise behaves, and your account security."
        toolbar={
          <Tabs
            items={SECTIONS}
            value={section}
            onChange={setSection}
            variant="underline"
            label="Settings sections"
          />
        }
      />

      <div className="max-w-2xl">
        {section === 'profile' && <ProfileSection />}
        {section === 'preferences' && <PreferencesSection />}
        {section === 'appearance' && <AppearanceSection />}
        {section === 'security' && <SecuritySection />}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(60),
  lastName: z.string().trim().min(1, 'Enter your last name').max(60),
  currency: z.enum(CURRENCY_CODES),
  monthlyIncome: z.string(),
});

type ProfileValues = z.infer<typeof profileSchema>;

const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code,
  label: `${CURRENCIES[code].symbol}  ${CURRENCIES[code].name}`,
}));

function ProfileSection() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { symbol } = useCurrency();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      currency: user?.currency ?? 'NGN',
      monthlyIncome: writeMoney(user?.monthlyIncome ?? 0),
    },
  });

  async function onSubmit(values: ProfileValues) {
    try {
      const { user: updated } = await authService.updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        currency: values.currency,
        monthlyIncome: readMoney(values.monthlyIncome),
      });
      setUser(updated);
      toast.success('Profile updated');
    } catch (error) {
      setError('root', {
        message: error instanceof ApiError ? error.message : 'Could not save your profile.',
      });
    }
  }

  if (!user) return null;

  return (
    <SlideUp>
      <Card>
        <CardHeader
          title="Profile"
          description="How Savewise addresses you and formats money."
          as="h2"
        />

        <div className="mt-5 flex items-center gap-4 border-b border-border pb-5">
          <Avatar name={`${user.firstName} ${user.lastName}`} src={user.avatarUrl} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-ink-subtle">{user.email}</p>
            <p className="mt-1 text-2xs text-ink-subtle">
              Email addresses cannot be changed in this build.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName?.message} required>
              {(props) => <Input {...props} {...register('firstName')} autoComplete="given-name" />}
            </Field>
            <Field label="Last name" error={errors.lastName?.message} required>
              {(props) => <Input {...props} {...register('lastName')} autoComplete="family-name" />}
            </Field>
          </div>

          <Field
            label="Currency"
            hint="Changes how amounts are displayed. Stored values are unchanged."
            error={errors.currency?.message}
            required
          >
            {(props) => <Select {...props} {...register('currency')} options={CURRENCY_OPTIONS} />}
          </Field>

          <Field
            label="Typical monthly income"
            hint="Used to pre-fill budgets and suggest a savings split."
            error={errors.monthlyIncome?.message}
          >
            {(props) => (
              <MoneyInput
                {...props}
                {...register('monthlyIncome')}
                symbol={symbol}
                placeholder="520,000"
              />
            )}
          </Field>

          {errors.root && (
            <p
              role="alert"
              className="rounded-lg bg-critical-soft px-3 py-2.5 text-sm text-critical"
            >
              {errors.root.message}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </form>
      </Card>
    </SlideUp>
  );
}

/* -------------------------------------------------------------------------- */
/* Preferences                                                                 */
/* -------------------------------------------------------------------------- */

function PreferencesSection() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { symbol } = useCurrency();

  const [target, setTarget] = useState(writeMoney(user?.preferences.targetMonthlySavings ?? 0));
  const [threshold, setThreshold] = useState(String(user?.preferences.budgetAlertThreshold ?? 80));
  const [priorities, setPriorities] = useState<FinancialPriority[]>(
    user?.preferences.priorities ?? [],
  );
  const [milestones, setMilestones] = useState(user?.preferences.notifyOnGoalMilestone ?? true);
  const [budgetAlerts, setBudgetAlerts] = useState(
    user?.preferences.notifyOnBudgetExceeded ?? true,
  );
  const [saving, setSaving] = useState(false);

  function togglePriority(key: FinancialPriority) {
    setPriorities((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key].slice(0, 8),
    );
  }

  async function save() {
    setSaving(true);
    try {
      const { user: updated } = await authService.updatePreferences({
        targetMonthlySavings: readMoney(target),
        budgetAlertThreshold: Number(threshold),
        priorities,
        notifyOnGoalMilestone: milestones,
        notifyOnBudgetExceeded: budgetAlerts,
      });
      setUser(updated);
      toast.success('Preferences saved');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save your preferences.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideUp className="space-y-6">
      <Card>
        <CardHeader title="Savings" description="What you are aiming for each month." as="h2" />

        <div className="mt-5 space-y-5">
          <Field
            label="Monthly savings target"
            hint="Savewise compares this against what you actually set aside."
          >
            {(props) => (
              <MoneyInput
                {...props}
                symbol={symbol}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="120,000"
              />
            )}
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">
              What matters most right now
            </legend>
            <div className="flex flex-wrap gap-2">
              {FINANCIAL_PRIORITIES.map((priority) => {
                const selected = priorities.includes(priority.key);
                return (
                  <button
                    key={priority.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => togglePriority(priority.key)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
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
          </fieldset>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Notifications"
          description="In-app only. Savewise sends no email or SMS."
          as="h2"
        />

        <div className="mt-5 space-y-4">
          <Field
            label="Warn me when a category reaches"
            hint="A percentage of its limit, between 50 and 100."
          >
            {(props) => (
              <Input
                {...props}
                type="number"
                min={50}
                max={100}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            )}
          </Field>

          <ToggleRow
            label="Goal milestones"
            description="When a goal passes 25%, 50%, 75% or is fully funded."
            checked={milestones}
            onChange={setMilestones}
          />

          <ToggleRow
            label="Budget warnings"
            description="When a category passes the threshold above, or goes over."
            checked={budgetAlerts}
            onChange={setBudgetAlerts}
          />
        </div>

        <Button className="mt-6" loading={saving} onClick={() => void save()}>
          Save preferences
        </Button>
      </Card>
    </SlideUp>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg py-1">
      <Checkbox
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{description}</span>
      </span>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Appearance                                                                  */
/* -------------------------------------------------------------------------- */

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Warm paper and deep evergreen.' },
  { value: 'dark', label: 'Dark', description: 'A forest at night. Designed, not inverted.' },
  { value: 'system', label: 'System', description: 'Follow your device, changing as it does.' },
];

function AppearanceSection() {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <SlideUp>
      <Card>
        <CardHeader title="Theme" description="Applies immediately and is remembered." as="h2" />

        <fieldset className="mt-5">
          <legend className="sr-only">Theme preference</legend>

          <div className="grid gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 transition-colors',
                    'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                    selected
                      ? 'border-primary bg-primary-soft'
                      : 'border-border hover:border-border-strong',
                  )}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={selected}
                    onChange={() => setPreference(option.value)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'block text-sm font-medium',
                      selected ? 'text-primary' : 'text-ink',
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                    {option.description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Card>
    </SlideUp>
  );
}

/* -------------------------------------------------------------------------- */
/* Security                                                                    */
/* -------------------------------------------------------------------------- */

function SecuritySection() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');

  async function onSubmit(values: ChangePasswordInput) {
    try {
      await authService.changePassword(values);
      // Every session was revoked server-side, this one included — so the only
      // correct next step is to send the user back to sign in.
      setUser(null);
      toast.success('Password changed', 'Please sign in again with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = error.fieldErrors;
        if (Object.keys(fields).length > 0) {
          for (const [field, message] of Object.entries(fields)) {
            setError(field as keyof ChangePasswordInput, { message });
          }
        } else {
          setError('root', { message: error.message });
        }
        return;
      }
      setError('root', { message: 'Could not change your password.' });
    }
  }

  return (
    <SlideUp className="space-y-6">
      <Card>
        <CardHeader
          title="Change password"
          description="Signs you out everywhere, including here."
          as="h2"
        />

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-5">
          <Field label="Current password" error={errors.currentPassword?.message} required>
            {(props) => (
              <Input
                {...props}
                {...register('currentPassword')}
                type="password"
                autoComplete="current-password"
              />
            )}
          </Field>

          <Field label="New password" error={errors.newPassword?.message} required>
            {(props) => (
              <Input
                {...props}
                {...register('newPassword')}
                type="password"
                autoComplete="new-password"
              />
            )}
          </Field>

          <PasswordStrength password={newPassword} />

          <Field label="Confirm new password" error={errors.confirmPassword?.message} required>
            {(props) => (
              <Input
                {...props}
                {...register('confirmPassword')}
                type="password"
                autoComplete="new-password"
              />
            )}
          </Field>

          {errors.root && (
            <p
              role="alert"
              className="rounded-lg bg-critical-soft px-3 py-2.5 text-sm text-critical"
            >
              {errors.root.message}
            </p>
          )}

          <Button type="submit" loading={isSubmitting}>
            Change password
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="How your account is protected" as="h2" />

        <ul className="mt-4 space-y-3 text-sm text-ink-muted">
          <SecurityNote>
            Your password is stored only as a bcrypt hash. Nobody — including us — can read it.
          </SecurityNote>
          <SecurityNote>
            Sessions live in httpOnly cookies that page scripts cannot read, so a cross-site
            scripting flaw could not steal your session.
          </SecurityNote>
          <SecurityNote>
            Every session token is single-use and rotates. If an old one is ever replayed, the whole
            session family is revoked immediately.
          </SecurityNote>
          <SecurityNote>
            Savewise has no access to any bank account. It records what you tell it and nothing
            else.
          </SecurityNote>
        </ul>
      </Card>
    </SlideUp>
  );
}

function SecurityNote({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-xs leading-relaxed">
      <svg
        viewBox="0 0 16 16"
        className="mt-0.5 size-3.5 shrink-0 text-primary"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm3 4.3a.75.75 0 0 0-1.06 0L7.2 8.55 6.06 7.4A.75.75 0 0 0 5 8.46l1.67 1.68a.75.75 0 0 0 1.06 0L11 6.86a.75.75 0 0 0 0-1.06Z" />
      </svg>
      {children}
    </li>
  );
}
