/**
 * Settings Store for OMEGA UI
 * @module stores/settingsStore
 * @description Zustand store for application settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'pdf' | 'csv' | 'txt';

/**
 * Analysis precision level
 */
export type PrecisionLevel = 'fast' | 'balanced' | 'precise';

/**
 * Settings store state
 */
interface SettingsState {
  autoSaveHistory: boolean;
  maxHistoryItems: number;
  defaultExportFormat: ExportFormat;
  precisionLevel: PrecisionLevel;
  showSegments: boolean;
  showDNA: boolean;
  showFingerprint: boolean;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  developerMode: boolean;
  version: string;
  lastUpdated: string;
}

/**
 * Settings store actions
 */
interface SettingsActions {
  setAutoSaveHistory: (enabled: boolean) => void;
  setMaxHistoryItems: (count: number) => void;
  setDefaultExportFormat: (format: ExportFormat) => void;
  setPrecisionLevel: (level: PrecisionLevel) => void;
  setShowSegments: (show: boolean) => void;
  setShowDNA: (show: boolean) => void;
  setShowFingerprint: (show: boolean) => void;
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
  autoSaveHistory: true,
  maxHistoryItems: 50,
  defaultExportFormat: 'json',
  precisionLevel: 'balanced',
  showSegments: true,
  showDNA: true,
  showFingerprint: false,
  animationsEnabled: true,
  soundEnabled: false,
  developerMode: false,
  version: '3.129.0',
  lastUpdated: new Date().toISOString(),
};

/**
 * Settings store with persistence
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setAutoSaveHistory: (enabled: boolean) => {
        set({ autoSaveHistory: enabled, lastUpdated: new Date().toISOString() });
      },

      setMaxHistoryItems: (count: number) => {
        const validCount = Math.max(10, Math.min(count, 500));
        set({ maxHistoryItems: validCount, lastUpdated: new Date().toISOString() });
      },

      setDefaultExportFormat: (format: ExportFormat) => {
        set({ defaultExportFormat: format, lastUpdated: new Date().toISOString() });
      },

      setPrecisionLevel: (level: PrecisionLevel) => {
        set({ precisionLevel: level, lastUpdated: new Date().toISOString() });
      },

      setShowSegments: (show: boolean) => {
        set({ showSegments: show, lastUpdated: new Date().toISOString() });
      },

      setShowDNA: (show: boolean) => {
        set({ showDNA: show, lastUpdated: new Date().toISOString() });
      },

      setShowFingerprint: (show: boolean) => {
        set({ showFingerprint: show, lastUpdated: new Date().toISOString() });
      },

      setAnimationsEnabled: (enabled: boolean) => {
        set({ animationsEnabled: enabled, lastUpdated: new Date().toISOString() });
      },

      setSoundEnabled: (enabled: boolean) => {
        set({ soundEnabled: enabled, lastUpdated: new Date().toISOString() });
      },

      setDeveloperMode: (enabled: boolean) => {
        set({ developerMode: enabled, lastUpdated: new Date().toISOString() });
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
