import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { DURATION, EASE_SWIFT } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';

/**
 * Marketing navigation.
 *
 * Starts transparent and sitting *in* the hero, then settles into a solid,
 * bordered bar once the page has scrolled. The transition is a change of
 * *state*, not a decoration: the bar becomes opaque precisely when content
 * would otherwise pass behind it and make the links unreadable.
 *
 * The mobile menu is a full-height sheet rather than a dropdown, so eight items
 * and two buttons have room to breathe at 320px.
 */

const LINKS = [
  { label: 'Product', href: '/#product' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Features', href: '/features' },
  { label: 'Insights', href: '/#insights' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
] as const;

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  // 24px rather than 0: the bar should not flicker between states when a
  // trackpad nudges the page by a pixel.
  useMotionValueEvent(scrollY, 'change', (latest) => setScrolled(latest > 24));

  // A route change while the sheet is open would otherwise leave it covering
  // the new page.
  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-swift',
          scrolled
            ? 'border-b border-border bg-canvas/85 shadow-xs backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <nav
          className="container-page flex h-16 items-center justify-between gap-6"
          aria-label="Main"
        >
          <Link
            to="/"
            className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
          >
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <li key={link.label}>
                <NavItem href={link.href}>{link.label}</NavItem>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <ButtonLink to="/dashboard" size="sm" className="hidden sm:inline-flex">
                Go to dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Log in
                </ButtonLink>
                <ButtonLink to="/register" size="sm" className="hidden sm:inline-flex">
                  Get started
                </ButtonLink>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="px-2 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden="true">
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-[60] flex flex-col bg-canvas lg:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DURATION.fast, ease: EASE_SWIFT }}
          >
            <div className="container-page flex h-16 shrink-0 items-center justify-between">
              <Logo />
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden="true">
                  <path
                    d="m5 5 10 10M15 5 5 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Button>
            </div>

            <nav className="container-page flex-1 overflow-y-auto py-6" aria-label="Mobile">
              <ul className="space-y-1">
                {LINKS.map((link, index) => (
                  <motion.li
                    key={link.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * index, ease: EASE_SWIFT }}
                  >
                    <MobileLink href={link.href}>{link.label}</MobileLink>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-8 space-y-3 border-t border-border pt-8">
                {user ? (
                  <ButtonLink to="/dashboard" size="lg" fullWidth>
                    Go to dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink to="/register" size="lg" fullWidth>
                      Get started
                    </ButtonLink>
                    <ButtonLink to="/login" variant="outline" size="lg" fullWidth>
                      Log in
                    </ButtonLink>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * A nav item is either an in-page anchor or a route.
 *
 * The distinction matters: React Router would treat `/#pricing` as a route
 * change and scroll to the top, so hash links use a real anchor and let the
 * browser do what it is good at.
 */
function NavItem({ href, children }: { href: string; children: string }) {
  const className =
    'relative rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  if (href.includes('#')) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

function MobileLink({ href, children }: { href: string; children: string }) {
  const className =
    'block rounded-xl px-4 py-3.5 text-lg font-medium text-ink transition-colors hover:bg-surface-sunken';

  if (href.includes('#')) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}
