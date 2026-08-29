import { motion } from 'motion/react';
import { NavLink } from 'react-router-dom';

import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';
import { SPRING } from '@/lib/motion';
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from './navigation';

/**
 * Desktop sidebar.
 *
 * The active indicator is a single element shared across every link via
 * `layoutId`, so it *travels* from the old item to the new one on navigation.
 * That movement is the microinteraction: it shows where you came from, which a
 * background colour appearing in a new place does not.
 */

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'flex h-dvh w-sidebar shrink-0 flex-col border-r border-border bg-surface',
        className,
      )}
    >
      <div className="flex h-header shrink-0 items-center px-5">
        <NavLink
          to="/dashboard"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Logo />
        </NavLink>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border px-3 py-4">
        <SidebarLink item={SETTINGS_ITEM} />
      </div>
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          isActive ? 'text-primary' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              transition={SPRING}
              className="absolute inset-0 -z-10 rounded-lg bg-primary-soft"
            />
          )}
          <span className="shrink-0">{item.icon}</span>
          {item.label}
        </>
      )}
    </NavLink>
  );
}
