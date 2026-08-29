import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { formatRelative } from '@savewise/shared';

import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui/Dropdown';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/queryClient';
import { notificationService } from '@/services/analyticsService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

/**
 * Application top bar.
 *
 * Holds the three things that belong at the top of every screen regardless of
 * where you are: notifications, the theme control, and the account menu. On
 * mobile it also carries the wordmark, since there is no sidebar to hold it.
 */
export function Topbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => notificationService.list(),
    // Notifications are written as a side effect of the user's own actions, so
    // a minute of staleness is plenty — there is no external event to catch.
    staleTime: 60_000,
  });

  const unread = data?.unreadCount ?? 0;

  async function handleSignOut() {
    await logout();
    // The cache holds the previous user's goals and balances. Clearing it stops
    // any of that from flashing on screen if another account signs in next.
    queryClient.clear();
    toast.success('Signed out');
    navigate('/');
  }

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <header className="sticky top-0 z-30 flex h-header items-center gap-3 border-b border-border bg-canvas/85 px-4 backdrop-blur-lg sm:px-6 lg:px-8">
      <div className="lg:hidden">
        <Logo markOnly />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Dropdown
          label="Notifications"
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              className="relative inline-flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" aria-hidden="true">
                <path
                  d="M10 2.5a5 5 0 0 0-5 5v3l-1.2 2.4a.5.5 0 0 0 .45.72h11.5a.5.5 0 0 0 .45-.72L15 10.5v-3a5 5 0 0 0-5-5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 16a2 2 0 0 0 4 0"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>

              {unread > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent ring-2 ring-canvas"
                  aria-hidden="true"
                />
              )}
            </button>
          )}
        >
          {() => (
            <div className="w-80 max-w-[calc(100vw-2rem)]">
              <div className="flex items-center justify-between px-2.5 py-2">
                <DropdownLabel>Notifications</DropdownLabel>
                {unread > 0 && (
                  <button
                    type="button"
                    className="text-2xs font-medium text-primary hover:underline"
                    onClick={() => {
                      void notificationService
                        .markAllRead()
                        .then(() =>
                          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
                        );
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <DropdownSeparator />

              {data && data.items.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {data.items.map((notification) => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!notification.read) {
                            void notificationService
                              .markRead(notification.id)
                              .then(() =>
                                queryClient.invalidateQueries({
                                  queryKey: queryKeys.notifications.all,
                                }),
                              );
                          }
                          if (notification.href) navigate(notification.href);
                        }}
                        className={cn(
                          'w-full rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-surface-sunken',
                          !notification.read && 'bg-primary-soft/40',
                        )}
                      >
                        <span className="flex items-start gap-2">
                          {!notification.read && (
                            <span
                              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                              aria-hidden="true"
                            />
                          )}
                          <span className={cn('min-w-0 flex-1', notification.read && 'pl-3.5')}>
                            <span className="block text-xs font-medium text-ink">
                              {notification.title}
                            </span>
                            <span className="mt-0.5 block text-2xs leading-relaxed text-ink-muted">
                              {notification.body}
                            </span>
                            <span className="mt-1 block text-2xs text-ink-subtle">
                              {formatRelative(notification.createdAt)}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-8 text-center text-xs text-ink-subtle">
                  Nothing to catch up on.
                </p>
              )}
            </div>
          )}
        </Dropdown>

        <ThemeToggle />

        <Dropdown
          label="Account"
          trigger={({ toggle, ref, open }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className="ml-1 flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar name={fullName} src={user.avatarUrl} size="sm" />
              <span className="hidden text-sm font-medium text-ink sm:inline">
                {user.firstName}
              </span>
              <svg
                viewBox="0 0 16 16"
                className="hidden size-3.5 text-ink-subtle sm:block"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m4 6 4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        >
          {({ close }) => (
            <>
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium text-ink">{fullName}</p>
                <p className="truncate text-xs text-ink-subtle">{user.email}</p>
                <Badge tone="neutral" className="mt-2">
                  {user.currency}
                </Badge>
              </div>

              <DropdownSeparator />

              <DropdownItem
                onSelect={() => {
                  close();
                  navigate('/settings');
                }}
              >
                Settings
              </DropdownItem>
              <DropdownItem
                onSelect={() => {
                  close();
                  navigate('/insights');
                }}
              >
                Insights
              </DropdownItem>

              <DropdownSeparator />

              <DropdownItem
                destructive
                onSelect={() => {
                  close();
                  void handleSignOut();
                }}
              >
                Sign out
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
