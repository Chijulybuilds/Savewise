import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/Toaster';
import { queryClient } from '@/lib/queryClient';
import { AppRoutes } from '@/routes/AppRoutes';
import { useAuthStore } from '@/store/authStore';

/**
 * Application root.
 *
 * Provider order matters: the error boundary is outermost so it can catch a
 * render failure anywhere below, including inside the router. The toaster sits
 * outside the router so a toast survives navigation.
 */
export function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  // One `/auth/me` on load to find out whether the httpOnly session cookie is
  // still valid. Until it settles the router shows a splash rather than
  // briefly rendering the signed-out marketing site to a signed-in user.
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
