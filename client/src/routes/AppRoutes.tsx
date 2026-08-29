import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/layouts/AppLayout';
import { MarketingLayout } from '@/layouts/MarketingLayout';
import { RouteFallback } from '@/routes/RouteFallback';
import { ScrollToTop } from '@/routes/ScrollToTop';
import { RedirectIfAuthenticated, RequireAuth, RequireOnboarded } from '@/routes/guards';

/**
 * Route table.
 *
 * Every page is lazily loaded. The landing page is the entry point for people
 * who have never signed up, and it should not have to download the charting
 * library, the dashboard or the settings forms before it can paint.
 *
 * The layouts themselves are eager — they are on every route, so deferring them
 * would only add a waterfall.
 */

const LandingPage = lazy(() => import('@/pages/marketing/LandingPage'));
const FeaturesPage = lazy(() => import('@/pages/marketing/FeaturesPage'));
const PricingPage = lazy(() => import('@/pages/marketing/PricingPage'));
const FaqPage = lazy(() => import('@/pages/marketing/FaqPage'));

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));

const DashboardPage = lazy(() => import('@/pages/app/DashboardPage'));
const GoalsPage = lazy(() => import('@/pages/app/GoalsPage'));
const BudgetPage = lazy(() => import('@/pages/app/BudgetPage'));
const TransactionsPage = lazy(() => import('@/pages/app/TransactionsPage'));
const PlansPage = lazy(() => import('@/pages/app/PlansPage'));
const AnalyticsPage = lazy(() => import('@/pages/app/AnalyticsPage'));
const InsightsPage = lazy(() => import('@/pages/app/InsightsPage'));
const SettingsPage = lazy(() => import('@/pages/app/SettingsPage'));

const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public marketing site */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/faq" element={<FaqPage />} />
          </Route>

          {/* Authentication — inaccessible once signed in */}
          <Route
            path="/login"
            element={
              <RedirectIfAuthenticated>
                <LoginPage />
              </RedirectIfAuthenticated>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthenticated>
                <RegisterPage />
              </RedirectIfAuthenticated>
            }
          />

          {/* Onboarding sits outside the app shell: no sidebar, no distractions */}
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />

          {/* The application */}
          <Route
            element={
              <RequireOnboarded>
                <AppLayout />
              </RequireOnboarded>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
