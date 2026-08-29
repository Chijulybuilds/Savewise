import type { UserDto } from '@savewise/shared';
import { create } from 'zustand';

import { ApiError, setSessionExpiredHandler } from '@/services/api';
import { authService } from '@/services/authService';

/**
 * Authentication state.
 *
 * Deliberately small: who is signed in, and have we finished finding out. The
 * session itself lives in httpOnly cookies the client cannot read, so there is
 * no token to store, persist or accidentally log — this store only mirrors what
 * the server told us on the last `/auth/me`.
 *
 * Server *data* (goals, budgets, transactions) is not kept here. That belongs
 * to TanStack Query, which already solves caching, revalidation and staleness.
 * Mixing the two is how a codebase ends up with three copies of the same goal.
 */

interface AuthState {
  user: UserDto | null;
  /** `true` until the first `/auth/me` settles — distinct from "signed out". */
  initialising: boolean;
  status: 'idle' | 'authenticating';

  bootstrap: () => Promise<void>;
  setUser: (user: UserDto | null) => void;
  login: (email: string, password: string) => Promise<UserDto>;
  register: (input: Parameters<typeof authService.register>[0]) => Promise<UserDto>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialising: true,
  status: 'idle',

  /**
   * Runs once at startup. A 401 here is the normal signed-out case, not an
   * error worth surfacing — the router simply renders the marketing site.
   */
  async bootstrap() {
    try {
      const { user } = await authService.me();
      set({ user, initialising: false });
    } catch (error) {
      if (!(error instanceof ApiError) || !error.isAuthError) {
        // A network failure is worth knowing about while developing; it must
        // still resolve to "signed out" rather than hanging on a spinner.
        console.warn('Could not restore session', error);
      }
      set({ user: null, initialising: false });
    }
  },

  setUser(user) {
    set({ user });
  },

  async login(email, password) {
    set({ status: 'authenticating' });
    try {
      const { user } = await authService.login({ email, password });
      set({ user, status: 'idle' });
      return user;
    } catch (error) {
      set({ status: 'idle' });
      throw error;
    }
  },

  async register(input) {
    set({ status: 'authenticating' });
    try {
      const { user } = await authService.register(input);
      set({ user, status: 'idle' });
      return user;
    } catch (error) {
      set({ status: 'idle' });
      throw error;
    }
  },

  async logout() {
    try {
      await authService.logout();
    } finally {
      // Cleared even if the request fails — the user asked to sign out, and a
      // network error must not leave them looking at their own dashboard.
      set({ user: null });
    }
  },
}));

/**
 * When a refresh attempt fails, the API client calls this to drop the user.
 * Registered once, at module load, so it is impossible to forget in a component.
 */
setSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, initialising: false });
});

export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.user !== null;
