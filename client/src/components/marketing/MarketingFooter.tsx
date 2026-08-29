import { Link } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';

/**
 * Site footer.
 *
 * Carries the disclaimer that matters most on a product like this: Savewise
 * tracks money, it does not hold it. Putting that on every page — rather than
 * burying it in a terms document — is the honest thing to do for anything that
 * looks like a fintech product.
 */

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', href: '/#product' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Insights', href: '/#insights' },
      { label: 'Savings goals', href: '/#goals' },
      { label: 'Budgeting', href: '/#budget' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Create an account', href: '/register' },
      { label: 'Log in', href: '/login' },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface-sunken/40">
      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              A planning companion for people who want their savings to be a system rather than a
              monthly act of willpower.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-2xs font-semibold uppercase tracking-wider text-ink-subtle">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-subtle">
            © {new Date().getFullYear()} Savewise. A portfolio project.
          </p>
          <p className="max-w-lg text-xs leading-relaxed text-ink-subtle">
            <strong className="font-medium text-ink-muted">
              Savewise does not hold or move money.
            </strong>{' '}
            It is a planning and tracking tool: balances, contributions and plans are records you
            keep, not deposits. Suggested plans are starting points, not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  const className = 'text-sm text-ink-muted transition-colors hover:text-ink';

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
