import { Outlet } from 'react-router-dom';

import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * Authenticated application shell.
 *
 * Two navigation surfaces, not one responsive compromise: a persistent sidebar
 * from `lg` up, and a thumb-reachable bottom bar below it. Each is built for
 * the input method it serves.
 *
 * The bottom padding on the main region reserves space for the mobile bar so
 * the last row of a list is never hidden behind it — the classic bottom-nav bug.
 */
export function AppLayout() {
  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only-focusable absolute left-4 top-4 z-[70] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast"
      >
        Skip to content
      </a>

      <div className="flex">
        <Sidebar className="sticky top-0 hidden lg:flex" />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />

          <main id="main" className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
            <div className="mx-auto w-full max-w-content">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
