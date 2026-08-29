import { create } from 'zustand';

/**
 * Transient feedback.
 *
 * A tiny store rather than a context provider, because toasts are fired from
 * mutation callbacks and service layers that are not inside a React tree.
 * `toast.success(...)` works from anywhere.
 */

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string | undefined;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

/** Errors linger; confirmations get out of the way. */
const DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  info: 5000,
  error: 7000,
};

const MAX_VISIBLE = 3;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push(toast) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    set((state) => ({
      // Oldest are dropped rather than newest rejected: the most recent
      // feedback is the one the user is waiting on.
      toasts: [...state.toasts, { ...toast, id }].slice(-MAX_VISIBLE),
    }));

    window.setTimeout(() => get().dismiss(id), DURATIONS[toast.variant]);
    return id;
  },

  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

/** Ergonomic wrapper so callers write `toast.success('Saved')`. */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ variant: 'success', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ variant: 'error', title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ variant: 'info', title, description }),
};
