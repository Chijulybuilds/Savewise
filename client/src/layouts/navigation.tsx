/* eslint-disable react-refresh/only-export-components -- data module: exports navigation items, not components */
import type { ReactNode } from 'react';

/**
 * The application's navigation model.
 *
 * One definition, consumed by the desktop sidebar, the mobile bottom bar and
 * the mobile drawer. Adding a screen means adding one entry — the three
 * surfaces cannot drift apart because they read from the same array.
 *
 * `primary` marks the items that earn a slot in the five-item mobile bar; the
 * rest live behind "More".
 */

export interface NavItem {
  to: string;
  label: string;
  /** Shortened for the mobile bar, where horizontal space is the constraint. */
  shortLabel?: string;
  icon: ReactNode;
  primary?: boolean;
}

const iconClass = 'size-[18px]';

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    primary: true,
    icon: (
      <svg viewBox="0 0 20 20" className={iconClass} fill="none" aria-hidden="true">
        <path
          d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1V8.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/goals',
    label: 'Goals',
    primary: true,
    icon: (
      <svg viewBox="0 0 20 20" className={iconClass} fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/budget',
    label: 'Budget',
    primary: true,
    icon: (
      <svg viewBox="0 0 20 20" className={iconClass} fill="none" aria-hidden="true">
        <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/transactions',
    label: 'Transactions',
    shortLabel: 'Activity',
    primary: true,
    icon: (
      <svg viewBox="0 0 20 20" className={iconClass} fill="none" aria-hidden="true">
        <path
          d="M4 7h9m0 0-2.5-2.5M13 7l-2.5 2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 13H7m0 0 2.5-2.5M7 13l2.5 2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/plans',
    label: 'Savings plans',
    shortLabel: 'Plans',
    icon: (
      <svg viewBox="0 0 20 20" className={iconClass} fill="none" aria-hidden="true">
        <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="11.5" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: (
      <svg viewBox="0 0 20 20" className={iconClass} fill="none" aria-hidden="true">
        <path
          d="M4 16V9M8.7 16V4M13.3 16v-5M18 16V7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: '/insights',
    label: 'Insights',
    icon: (
      <svg viewBox="0 0 20 20" className={iconClass} fill="none" aria-hidden="true">
        <path
          d="M10 2.5a5 5 0 0 0-2.9 9.07c.39.28.65.71.65 1.18V13h4.5v-.25c0-.47.26-.9.65-1.18A5 5 0 0 0 10 2.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8 15.5h4M8.75 17.5h2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export const SETTINGS_ITEM: NavItem = {
  to: '/settings',
  label: 'Settings',
  icon: (
    <svg viewBox="0 0 20 20" className={iconClass} fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.5v1.8M10 15.7v1.8M17.5 10h-1.8M4.3 10H2.5m12.06-5.3-1.27 1.27M6.71 13.29l-1.27 1.27m0-9.86 1.27 1.27m6.58 6.58 1.27 1.27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

/** The five items that fit a mobile bottom bar without crowding. */
export const PRIMARY_NAV_ITEMS = NAV_ITEMS.filter((item) => item.primary);
export const SECONDARY_NAV_ITEMS = NAV_ITEMS.filter((item) => !item.primary);
