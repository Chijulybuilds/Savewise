import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { CURRENCIES, CURRENCY_CODES, registerSchema, type RegisterInput } from '@savewise/shared';

import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { usePageMeta } from '@/hooks/usePageMeta';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code,
  label: `${CURRENCIES[code].symbol}  ${CURRENCIES[code].name}`,
}));

/**
 * Registration.
 *
 * Currency is asked for here rather than during onboarding because every amount
 * the user enters from this point on is denominated in it — including the first
 * question onboarding asks.
 */
export default function RegisterPage() {
  usePageMeta({ title: 'Create your account — Savewise', noIndex: true });

  const navigate = useNavigate();
  const registerUser = useAuthStore((state) => state.register);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    // Validate as the user corrects a mistake, not on every keystroke from the
    // start — being told a password is too short while typing it is hostile.
    mode: 'onTouched',
    defaultValues: { firstName: '', lastName: '', email: '', password: '', currency: 'NGN' },
  });

  const password = watch('password');

  async function onSubmit(values: RegisterInput) {
    try {
      const user = await registerUser(values);
      toast.success(`Welcome to Savewise, ${user.firstName}`);
      navigate('/onboarding', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = error.fieldErrors;
        if (Object.keys(fields).length > 0) {
          for (const [field, message] of Object.entries(fields)) {
            setError(field as keyof RegisterInput, { message });
          }
        } else {
          setError('root', { message: error.message });
        }
        return;
      }
      setError('root', { message: 'Something went wrong. Please try again.' });
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Two minutes to set up. Then it mostly runs itself."
      aside={{
        quote: 'Give every naira a job.',
        caption:
          'Set your income, name what you are saving for, and Savewise works out what each month needs to look like for you to get there.',
      }}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName?.message} required>
            {(props) => (
              <Input
                {...props}
                {...register('firstName')}
                autoComplete="given-name"
                autoFocus
                placeholder="Chinedu"
              />
            )}
          </Field>

          <Field label="Last name" error={errors.lastName?.message} required>
            {(props) => (
              <Input
                {...props}
                {...register('lastName')}
                autoComplete="family-name"
                placeholder="Okafor"
              />
            )}
          </Field>
        </div>

        <Field label="Email" error={errors.email?.message} required>
          {(props) => (
            <Input
              {...props}
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field
          label="Password"
          error={errors.password?.message}
          hint="At least 10 characters, with an uppercase letter and a number."
          required
        >
          {(props) => (
            <Input
              {...props}
              {...register('password')}
              type="password"
              autoComplete="new-password"
              placeholder="Choose a strong password"
            />
          )}
        </Field>

        <PasswordStrength password={password} />

        <Field
          label="Currency"
          error={errors.currency?.message}
          hint="Used for every amount in your account."
          required
        >
          {(props) => <Select {...props} {...register('currency')} options={CURRENCY_OPTIONS} />}
        </Field>

        {errors.root && (
          <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2.5 text-sm text-critical">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Create account
        </Button>

        <p className="text-xs leading-relaxed text-ink-subtle">
          Savewise is a planning tool. It does not connect to your bank, hold funds, or move money.
        </p>
      </form>
    </AuthLayout>
  );
}
