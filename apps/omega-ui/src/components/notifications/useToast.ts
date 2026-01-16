/**
 * Toast Hook for OMEGA UI
 * @module components/notifications/useToast
 * @description Hook for managing toast notifications
 */

import { create } from 'zustand';
import type { ToastData, ToastType } from './Toast';

/**
 * Generate unique toast ID
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Toast store state
 */
interface ToastStore {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

/**
 * Toast store
 */
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

/**
 * Toast options
 */
interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
}

/**
 * useToast hook
 */
export function useToast() {
  const { toasts, addToast, removeToast, clearToasts } = useToastStore();

  /**
   * Show toast notification
   */
  const toast = (
    type: ToastType,
    title: string,
    message?: string,
    options?: ToastOptions
  ): string => {
    return addToast({
      type,
      title,
      message,
      duration: options?.duration ?? 5000,
      dismissible: options?.dismissible ?? true,
    });
  };

  /**
   * Show info toast
   */
  const info = (title: string, message?: string, options?: ToastOptions): string => {
    return toast('info', title, message, options);
  };

  /**
   * Show success toast
   */
  const success = (title: string, message?: string, options?: ToastOptions): string => {
    return toast('success', title, message, options);
  };

  /**
   * Show warning toast
   */
  const warning = (title: string, message?: string, options?: ToastOptions): string => {
    return toast('warning', title, message, options);
  };

  /**
   * Show error toast
   */
  const error = (title: string, message?: string, options?: ToastOptions): string => {
    return toast('error', title, message, options);
  };

  /**
   * Dismiss specific toast
   */
  const dismiss = (id: string): void => {
    removeToast(id);
  };

  /**
   * Dismiss all toasts
   */
  const dismissAll = (): void => {
    clearToasts();
  };

  return {
    toasts,
    toast,
    info,
    success,
    warning,
    error,
    dismiss,
    dismissAll,
  };
}

/**
 * Toast promise helper
 */
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> {
  const { addToast, removeToast } = useToastStore.getState();

  const loadingId = addToast({
    type: 'info',
    title: messages.loading,
    duration: 0,
    dismissible: false,
  });

  try {
    const result = await promise;
    removeToast(loadingId);
    addToast({
      type: 'success',
      title: messages.success,
    });
    return result;
  } catch (err) {
    removeToast(loadingId);
    addToast({
      type: 'error',
      title: messages.error,
      message: err instanceof Error ? err.message : undefined,
    });
    throw err;
  }
}
