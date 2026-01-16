/**
 * Footer Component for OMEGA UI
 * @module components/layout/Footer
 * @description Bottom status bar with system information
 */

import { useAnalysisStore, useSettingsStore } from '../../stores';

/**
 * Footer component
 * @returns Footer element with status information
 */
export function Footer(): JSX.Element {
  const { history, isAnalyzing } = useAnalysisStore();
  const { version } = useSettingsStore();

  return (
    <footer className="omega-footer flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span>OMEGA v{version}</span>
        <span className="text-omega-border">|</span>
        <span>Phase 130</span>
      </div>

      <div className="flex items-center gap-4">
        <span>History: {history.length} items</span>
        <span className="text-omega-border">|</span>
        <span className={isAnalyzing ? 'text-omega-warning' : 'text-omega-success'}>
          {isAnalyzing ? 'Analyzing...' : 'Ready'}
        </span>
      </div>

      <div>
        <span>NASA-Grade L4 / DO-178C Level A / MIL-STD-498</span>
      </div>
    </footer>
  );
}
