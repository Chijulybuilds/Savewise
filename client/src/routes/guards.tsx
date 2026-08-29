import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';

/**
 * Route guards.
 *
 * These are a *navigation* concern, not a security one. The real boundary is
 * the API: every protected endpoint verifies the session server-side, so a user
 * who edits their way past a guard reaches a screen that fetches nothing. The
 * guards exist to send people to the right place, not to keep them out.
 */

/** Shown while the initial `/auth/me` is in flight. */
function SessionSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
      <Logo />
      <Spinner className="size-5 text-ink-subtle" />
      <span className="sr-only" role="status">
        Restoring your session
      </span>
    </div>
  );
}

/**
 * Requires a session. Remembers where the user was heading so they land there
 * after signing in rather than on a generic dashboard.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const initialising = useAuthStore((state) => state.initialising);
  const location = useLocation();

  if (initialising) return <SessionSplash />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}

/**
 * Requires a *completed* session — signed in and through onboarding.
 *
 * A half-configured account has no income, no budget and no goals, so every
 * screen would be an empty state. Sending them to finish onboarding is kinder
 * than showing eight "nothing here yet" panels.
 */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const initialising = useAuthStore((state) => state.initialising);
  const location = useLocation();

  if (initialising) return <SessionSplash />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!user.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

/**
 * For `/login` and `/register`. A signed-in user landing here is bounced to
 * their dashboard — showing them a sign-in form they do not need is confusing,
 * and submitting it would just re-authenticate the account they already hold.
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const initialising = useAuthStore((state) => state.initialising);

  if (initialising) return <SessionSplash />;
  if (user)
    return <Navigate to={user.onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;

  return <>{children}</>;
}
