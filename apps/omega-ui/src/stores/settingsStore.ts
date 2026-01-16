/**
 * Settings Store for OMEGA UI
 * @module stores/settingsStore
 * @description Zustand store for application settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme options
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Language options
 */
export type Language = 'en' | 'fr' | 'es' | 'de';

/**
 * Analysis depth options
 */
export type AnalysisDepth = 'quick' | 'standard' | 'deep';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'pdf' | 'csv' | 'txt';

/**
 * Settings store state
 */
interface SettingsState {
  // Appearance
  theme: Theme;
  language: Language;

  // Analysis
  analysisDepth: AnalysisDepth;
  minTextLength: number;
  showDNAFingerprint: boolean;

  // Data & Storage
  autoSave: boolean;
  persistSettings: boolean;
  maxHistoryItems: number;
  defaultExportFormat: ExportFormat;

  // Advanced
  animationsEnabled: boolean;
  soundEnabled: boolean;
  developerMode: boolean;

  // Metadata
  version: string;
  lastUpdated: string;
}

/**
 * Settings store actions
 */
interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setAnalysisDepth: (depth: AnalysisDepth) => void;
  setMinTextLength: (length: number) => void;
  setShowDNAFingerprint: (show: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setPersistSettings: (enabled: boolean) => void;
  setMaxHistoryItems: (count: number) => void;
  setDefaultExportFormat: (format: ExportFormat) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setDeveloperMode: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

/**
 * Full settings store type
 */
export type SettingsStore = SettingsState & SettingsActions;

/**
 * Default settings
 */
const defaultSettings: SettingsState = {
  theme: 'system',
  language: 'en',
  analysisDepth: 'standard',
  minTextLength: 10,
  showDNAFingerprint: true,
  autoSave: true,
  persistSettings: true,
  maxHistoryItems: 50,
  defaultExportFormat: 'json',
  animationsEnabled: true,
  soundEnabled: false,
  developerMode: false,
  version: '3.136.0',
  lastUpdated: new Date().toISOString(),
};

/**
 * Settings store with persistence
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme: Theme) => {
        set({ theme, lastUpdated: new Date().toISOString() });
      },

      setLanguage: (language: Language) => {
        set({ language, lastUpdated: new Date().toISOString() });
      },

      setAnalysisDepth: (analysisDepth: AnalysisDepth) => {
        set({ analysisDepth, lastUpdated: new Date().toISOString() });
      },

      setMinTextLength: (length: number) => {
        const validLength = Math.max(5, Math.min(length, 100));
        set({ minTextLength: validLength, lastUpdated: new Date().toISOString() });
      },

      setShowDNAFingerprint: (showDNAFingerprint: boolean) => {
        set({ showDNAFingerprint, lastUpdated: new Date().toISOString() });
      },

      setAutoSave: (autoSave: boolean) => {
        set({ autoSave, lastUpdated: new Date().toISOString() });
      },

      setPersistSettings: (persistSettings: boolean) => {
        set({ persistSettings, lastUpdated: new Date().toISOString() });
      },

      setMaxHistoryItems: (count: number) => {
        const validCount = Math.max(10, Math.min(count, 500));
        set({ maxHistoryItems: validCount, lastUpdated: new Date().toISOString() });
      },

      setDefaultExportFormat: (defaultExportFormat: ExportFormat) => {
        set({ defaultExportFormat, lastUpdated: new Date().toISOString() });
      },

      setAnimationsEnabled: (animationsEnabled: boolean) => {
        set({ animationsEnabled, lastUpdated: new Date().toISOString() });
      },

      setSoundEnabled: (soundEnabled: boolean) => {
        set({ soundEnabled, lastUpdated: new Date().toISOString() });
      },

      setDeveloperMode: (developerMode: boolean) => {
        set({ developerMode, lastUpdated: new Date().toISOString() });
      },

      resetToDefaults: () => {
        set({ ...defaultSettings, lastUpdated: new Date().toISOString() });
      },
    }),
    {
      name: 'omega-settings',
    }
  )
);
