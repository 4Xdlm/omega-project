/**
 * Settings Page Component
 * @module pages/SettingsPage
 * @description Application settings and preferences
 */

import { useSettingsStore, useUIStore } from '../stores';
import type { ExportFormat, PrecisionLevel } from '../stores';

/**
 * Settings page component
 * @returns Settings configuration page
 */
export function SettingsPage(): JSX.Element {
  const settings = useSettingsStore();
  const { theme, setTheme } = useUIStore();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-omega-text">Settings</h2>

      <div className="omega-card">
        <h3 className="text-lg font-semibold text-omega-text mb-4">
          Appearance
        </h3>
        <div className="space-y-4">
          <SettingRow label="Theme">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
              className="omega-input w-40"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </SettingRow>
          <SettingRow label="Animations">
            <Toggle
              checked={settings.animationsEnabled}
              onChange={settings.setAnimationsEnabled}
            />
          </SettingRow>
        </div>
      </div>

      <div className="omega-card">
        <h3 className="text-lg font-semibold text-omega-text mb-4">
          Analysis
        </h3>
        <div className="space-y-4">
          <SettingRow label="Precision Level">
            <select
              value={settings.precisionLevel}
              onChange={(e) => settings.setPrecisionLevel(e.target.value as PrecisionLevel)}
              className="omega-input w-40"
            >
              <option value="fast">Fast</option>
              <option value="balanced">Balanced</option>
              <option value="precise">Precise</option>
            </select>
          </SettingRow>
          <SettingRow label="Show Segments">
            <Toggle
              checked={settings.showSegments}
              onChange={settings.setShowSegments}
            />
          </SettingRow>
          <SettingRow label="Show DNA">
            <Toggle
              checked={settings.showDNA}
              onChange={settings.setShowDNA}
            />
          </SettingRow>
        </div>
      </div>

      <div className="omega-card">
        <h3 className="text-lg font-semibold text-omega-text mb-4">
          History
        </h3>
        <div className="space-y-4">
          <SettingRow label="Auto-save to History">
            <Toggle
              checked={settings.autoSaveHistory}
              onChange={settings.setAutoSaveHistory}
            />
          </SettingRow>
          <SettingRow label="Max History Items">
            <input
              type="number"
              value={settings.maxHistoryItems}
              onChange={(e) => settings.setMaxHistoryItems(parseInt(e.target.value) || 50)}
              className="omega-input w-24"
              min={10}
              max={500}
            />
          </SettingRow>
        </div>
      </div>

      <div className="omega-card">
        <h3 className="text-lg font-semibold text-omega-text mb-4">
          Export
        </h3>
        <div className="space-y-4">
          <SettingRow label="Default Format">
            <select
              value={settings.defaultExportFormat}
              onChange={(e) => settings.setDefaultExportFormat(e.target.value as ExportFormat)}
              className="omega-input w-40"
            >
              <option value="json">JSON</option>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="txt">Text</option>
            </select>
          </SettingRow>
        </div>
      </div>

      <div className="omega-card">
        <h3 className="text-lg font-semibold text-omega-text mb-4">
          Developer
        </h3>
        <div className="space-y-4">
          <SettingRow label="Developer Mode">
            <Toggle
              checked={settings.developerMode}
              onChange={settings.setDeveloperMode}
            />
          </SettingRow>
        </div>
        <div className="mt-6 pt-4 border-t border-omega-border">
          <button
            onClick={settings.resetToDefaults}
            className="text-sm text-omega-warning hover:underline"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-omega-muted">
        <p>Version: v{settings.version}</p>
        <p>Last Updated: {new Date(settings.lastUpdated).toLocaleString()}</p>
      </div>
    </div>
  );
}

/**
 * Setting row component
 */
function SettingRow({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-omega-text">{label}</span>
      {children}
    </div>
  );
}

/**
 * Toggle switch component
 */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }): JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-omega-primary' : 'bg-omega-border'
      }`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
