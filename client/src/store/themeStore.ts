import { create } from 'zustand';

/**
 * Theme preference.
 *
 * Three states, not two: `system` is a real choice and the default, so a user
 * who has never touched the toggle follows their OS as it changes through the
 * day. An explicit `light` or `dark` pins the theme and persists.
 *
 * The *initial* class is applied by an inline script in `index.html` before
 * first paint; this store owns changes after that.
 */

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'savewise.theme';

interface ThemeState {
  preference: ThemePreference;
  /** What is actually on screen once `system` has been resolved. */
  resolved: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStored(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    // Private browsing with storage disabled — fall back to following the OS.
    return 'system';
  }
}

function resolve(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return preference;
}

function apply(resolved: 'light' | 'dark'): void {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  // Tells the browser which native form controls and scrollbars to render.
  root.style.colorScheme = resolved;
}

const initialPreference = readStored();

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  resolved: resolve(initialPreference),

  setPreference(preference) {
    const resolved = resolve(preference);
    apply(resolved);

    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Preference simply will not survive a reload. Not worth failing over.
    }

    set({ preference, resolved });
  },

  toggle() {
    get().setPreference(get().resolved === 'dark' ? 'light' : 'dark');
  },
}));

/**
 * Keeps a `system` preference live: if the OS flips to dark at sunset, so does
 * Savewise, without a reload. Ignored once the user has pinned a theme.
 */
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { preference } = useThemeStore.getState();
    if (preference !== 'system') return;
    const resolved = resolve('system');
    apply(resolved);
    useThemeStore.setState({ resolved });
  });
}
