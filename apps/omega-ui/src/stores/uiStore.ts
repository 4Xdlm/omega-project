/**
 * UI Store for OMEGA UI
 * @module stores/uiStore
 * @description Zustand store for UI state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Available view types
 */
export type ViewType = 'analyze' | 'history' | 'dashboard' | 'settings';

/**
 * Theme type
 */
export type Theme = 'dark' | 'light' | 'system';

/**
 * Sidebar panel type
 */
export type SidebarPanel = 'none' | 'history' | 'help' | 'export';

/**
 * UI store state
 */
interface UIState {
  currentView: ViewType;
  theme: Theme;
  sidebarOpen: boolean;
  sidebarPanel: SidebarPanel;
  modalOpen: string | null;
  isLoading: boolean;
  notifications: Notification[];
}

/**
 * Notification type
 */
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

/**
 * UI store actions
 */
interface UIActions {
  setView: (view: ViewType) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

/**
 * Full UI store type
 */
export type UIStore = UIState & UIActions;

/**
 * Default UI state
 */
const defaultState: UIState = {
  currentView: 'analyze',
  theme: 'dark',
  sidebarOpen: true,
  sidebarPanel: 'none',
  modalOpen: null,
  isLoading: false,
  notifications: [],
};

/**
 * Generate notification ID
 */
function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * UI store with persistence
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setView: (view: ViewType) => {
        set({ currentView: view });
      },

      setTheme: (theme: Theme) => {
        set({ theme });
      },

      toggleSidebar: () => {
        const { sidebarOpen } = get();
        set({ sidebarOpen: !sidebarOpen });
      },

      setSidebarPanel: (panel: SidebarPanel) => {
        set({ sidebarPanel: panel, sidebarOpen: panel !== 'none' });
      },

      openModal: (modalId: string) => {
        set({ modalOpen: modalId });
      },

      closeModal: () => {
        set({ modalOpen: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      addNotification: (type: Notification['type'], message: string) => {
        const { notifications } = get();
        const notification: Notification = {
          id: generateNotificationId(),
          type,
          message,
          timestamp: new Date().toISOString(),
        };
        set({ notifications: [...notifications, notification].slice(-10) });
      },

      removeNotification: (id: string) => {
        const { notifications } = get();
        set({ notifications: notifications.filter(n => n.id !== id) });
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },
    }),
    {
      name: 'omega-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
