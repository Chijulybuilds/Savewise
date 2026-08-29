import { Outlet } from 'react-router-dom';

import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingNav } from '@/components/marketing/MarketingNav';

/**
 * Public site shell.
 *
 * The skip link is the first focusable element on the page — a keyboard user
 * should not have to tab through eight navigation items on every route to reach
 * the content.
 */
export function MarketingLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only-focusable absolute left-4 top-4 z-[70] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast"
      >
        Skip to content
      </a>

      <MarketingNav />

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <MarketingFooter />
    </div>
  );
}
