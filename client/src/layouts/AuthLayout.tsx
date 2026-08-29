import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';
import { SlideUp } from '@/components/motion/Reveal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/**
 * Sign-in and registration shell.
 *
 * A split layout: the form on the left, a quiet piece of product context on the
 * right. The right panel is hidden below `lg` — on a phone, anything above the
 * form is something to scroll past before doing the one thing you came for.
 */

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  /** The reassurance shown on the right-hand panel. */
  aside: { quote: string; caption: string };
}

export function AuthLayout({ title, subtitle, children, footer, aside }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh bg-canvas">
      <div className="flex w-full flex-col lg:w-[52%]">
        <div className="flex h-header items-center justify-between px-6 lg:px-10">
          <Link
            to="/"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
          >
            <Logo />
          </Link>
          <ThemeToggle />
        </div>

        <main className="flex flex-1 items-center justify-center px-6 py-10 lg:px-10">
          <SlideUp className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>

            <div className="mt-8">{children}</div>

            <div className="mt-8 text-sm text-ink-muted">{footer}</div>
          </SlideUp>
        </main>
      </div>

      <aside className="relative hidden w-[48%] items-center overflow-hidden border-l border-border bg-surface-sunken/50 lg:flex">
        <div
          className="grid-texture pointer-events-none absolute inset-0 opacity-40"
          style={{ maskImage: 'radial-gradient(70% 60% at 50% 40%, black, transparent)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(55% 45% at 30% 25%, hsl(var(--primary) / 0.12), transparent 70%)',
          }}
        />

        <SlideUp className="relative px-14 xl:px-20" delay={0.1}>
          <p className="font-display text-3xl leading-snug text-ink xl:text-4xl">{aside.quote}</p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-muted">{aside.caption}</p>

          <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-ink-subtle">
            Savewise is a planning tool. It never holds, moves or has access to your money.
          </p>
        </SlideUp>
      </aside>
    </div>
  );
}
