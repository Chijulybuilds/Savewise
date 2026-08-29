import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { loginSchema, type LoginInput } from '@savewise/shared';

import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { usePageMeta } from '@/hooks/usePageMeta';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

/**
 * Sign in.
 *
 * The Zod schema is imported from `@savewise/shared` — the same object the API
 * validates against. The rules cannot drift, and the error copy a user reads
 * while typing is the copy the server would have produced.
 */
export default function LoginPage() {
  usePageMeta({ title: 'Log in — Savewise', noIndex: true });

  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    try {
      const user = await login(values.email, values.password);

      // Return them to whatever they were trying to reach before the guard
      // redirected them here.
      const from = (location.state as { from?: string } | null)?.from;
      const destination = user.onboardingCompleted ? (from ?? '/dashboard') : '/onboarding';

      toast.success(`Welcome back, ${user.firstName}`);
      navigate(destination, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        // Field-level errors from the API land on the right inputs; anything
        // else becomes a form-level message above the button.
        const fields = error.fieldErrors;
        if (Object.keys(fields).length > 0) {
          for (const [field, message] of Object.entries(fields)) {
            setError(field as keyof LoginInput, { message });
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
      title="Welcome back"
      subtitle="Pick up where your plan left off."
      aside={{
        quote: 'Saving should feel like a system, not a struggle.',
        caption:
          'Your goals, budgets and contributions are exactly where you left them — along with what changed since you last looked.',
      }}
      footer={
        <>
          New to Savewise?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="Email" error={errors.email?.message} required>
          {(props) => (
            <Input
              {...props}
              {...register('email')}
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field label="Password" error={errors.password?.message} required>
          {(props) => (
            <Input
              {...props}
              {...register('password')}
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
            />
          )}
        </Field>

        {errors.root && (
          <p role="alert" className="rounded-lg bg-critical-soft px-3 py-2.5 text-sm text-critical">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Log in
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-border bg-surface-sunken/60 p-4">
        <p className="text-xs font-medium text-ink">Trying the demo?</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          Sign in with{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-2xs">demo@savewise.local</code> and{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-2xs">DemoPassword123!</code> after
          running the seed script. Development credentials only.
        </p>
      </div>
    </AuthLayout>
  );
}
