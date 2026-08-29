import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useAuthStore } from '@/store/authStore';

/**
 * 404.
 *
 * Offers the destination that is actually useful to whoever hit it: the
 * dashboard for a signed-in user, the home page for everyone else. A generic
 * "go home" link sends a signed-in user to a marketing page they have already
 * decided about.
 */
export default function NotFoundPage() {
  usePageMeta({ title: 'Page not found — Savewise', noIndex: true });
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <Logo />

      <p className="tabular mt-10 font-display text-6xl text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        We could not find that page
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
        The link may be out of date, or the page may have moved. Nothing in your account has
        changed.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {user ? (
          <>
            <ButtonLink to="/dashboard" size="lg">
              Back to dashboard
            </ButtonLink>
            <ButtonLink to="/goals" variant="outline" size="lg">
              View goals
            </ButtonLink>
          </>
        ) : (
          <>
            <ButtonLink to="/" size="lg">
              Back to home
            </ButtonLink>
            <ButtonLink to="/login" variant="outline" size="lg">
              Log in
            </ButtonLink>
          </>
        )}
      </div>
    </div>
  );
}
