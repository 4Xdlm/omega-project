/**
 * Settings View for OMEGA UI
 * @module views/SettingsView
 * @description Full settings page with all configuration options
 */

import { useCallback } from 'react';
import { SettingsSection } from '../components/settings/SettingsSection';
import {
  ToggleSetting,
  SelectSetting,
  SliderSetting,
} from '../components/settings/SettingControls';
import { useSettingsStore } from '../stores/settingsStore';
import { useAnalysisStore } from '../stores/analysisStore';

/**
 * Settings view component
 * @returns Full settings interface
 */
export function SettingsView(): JSX.Element {
  const settings = useSettingsStore();
  const { clearResults } = useAnalysisStore();

  const handleClearHistory = useCallback(() => {
    if (confirm('Are you sure you want to clear all analysis history? This cannot be undone.')) {
      clearResults();
    }
  }, [clearResults]);

  const handleResetSettings = useCallback(() => {
    if (confirm('Reset all settings to defaults?')) {
      settings.setTheme('system');
      settings.setLanguage('en');
      settings.setAutoSave(true);
      settings.setAnalysisDepth('standard');
    }
  }, [settings]);

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-omega-text">Settings</h1>
        <p className="text-sm text-omega-muted mt-1">
          Configure OMEGA to match your preferences
        </p>
      </div>

      {/* Settings sections */}
      <div className="space-y-6 max-w-2xl">
        {/* Appearance */}
        <SettingsSection
          title="Appearance"
          description="Customize how OMEGA looks"
          icon={<AppearanceIcon />}
        >
          <SelectSetting
            label="Theme"
            description="Choose your preferred color scheme"
            value={settings.theme}
            onChange={settings.setTheme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
          <SelectSetting
            label="Language"
            description="Select display language"
            value={settings.language}
            onChange={settings.setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'Français' },
              { value: 'es', label: 'Español' },
              { value: 'de', label: 'Deutsch' },
            ]}
          />
        </SettingsSection>

        {/* Analysis */}
        <SettingsSection
          title="Analysis"
          description="Configure analysis behavior"
          icon={<AnalysisIcon />}
        >
          <SelectSetting
            label="Analysis Depth"
            description="Balance between speed and detail"
            value={settings.analysisDepth}
            onChange={settings.setAnalysisDepth}
            options={[
              { value: 'quick', label: 'Quick' },
              { value: 'standard', label: 'Standard' },
              { value: 'deep', label: 'Deep' },
            ]}
          />
          <SliderSetting
            label="Minimum Text Length"
            description="Minimum characters required for analysis"
            value={settings.minTextLength}
            onChange={settings.setMinTextLength}
            min={5}
            max={100}
            step={5}
          />
          <ToggleSetting
            label="Show DNA Fingerprint"
            description="Display 128-component emotional signature"
            checked={settings.showDNAFingerprint}
            onChange={settings.setShowDNAFingerprint}
          />
        </SettingsSection>

        {/* Data */}
        <SettingsSection
          title="Data & Storage"
          description="Manage your data"
          icon={<DataIcon />}
        >
          <ToggleSetting
            label="Auto-save Results"
            description="Automatically save analysis results to history"
            checked={settings.autoSave}
            onChange={settings.setAutoSave}
          />
          <ToggleSetting
            label="Persist Settings"
            description="Remember settings between sessions"
            checked={settings.persistSettings}
            onChange={settings.setPersistSettings}
          />
        </SettingsSection>

        {/* About */}
        <SettingsSection
          title="About OMEGA"
          description="Application information"
          icon={<AboutIcon />}
        >
          <div className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-omega-muted">Version</span>
              <span className="text-sm text-omega-text font-mono">3.135.0</span>
            </div>
          </div>
          <div className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-omega-muted">Standard</span>
              <span className="text-sm text-omega-text">NASA-Grade L4</span>
            </div>
          </div>
          <div className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-omega-muted">Emotion Model</span>
              <span className="text-sm text-omega-text">Emotion14</span>
            </div>
          </div>
        </SettingsSection>

        {/* Danger zone */}
        <SettingsSection
          title="Danger Zone"
          description="Irreversible actions"
          icon={<DangerIcon />}
        >
          <div className="py-4 space-y-3">
            <button
              onClick={handleClearHistory}
              className="w-full px-4 py-2 text-sm text-omega-error border border-omega-error/30 rounded hover:bg-omega-error/10 transition-colors"
            >
              Clear All History
            </button>
            <button
              onClick={handleResetSettings}
              className="w-full px-4 py-2 text-sm text-omega-muted border border-omega-border rounded hover:bg-omega-surface transition-colors"
            >
              Reset Settings to Defaults
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

/**
 * Icon components
 */
function AppearanceIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

function AnalysisIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function DataIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

function AboutIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DangerIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5 text-omega-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
