/**
 * Sidebar Component for OMEGA UI
 * @module components/layout/Sidebar
 * @description Collapsible sidebar with panels
 */

import { useUIStore, useAnalysisStore } from '../../stores';
import type { SidebarPanel } from '../../stores';

/**
 * Sidebar panel button definition
 */
interface PanelButton {
  id: SidebarPanel;
  label: string;
  icon: string;
}

/**
 * Panel buttons configuration
 */
const panelButtons: PanelButton[] = [
  { id: 'history', label: 'History', icon: 'H' },
  { id: 'help', label: 'Help', icon: '?' },
  { id: 'export', label: 'Export', icon: 'E' },
];

/**
 * Sidebar component
 * @returns Sidebar element with panel navigation
 */
export function Sidebar(): JSX.Element {
  const { sidebarOpen, sidebarPanel, setSidebarPanel } = useUIStore();

  if (!sidebarOpen) return <></>;

  return (
    <aside className="w-64 bg-omega-surface border-r border-omega-border flex flex-col">
      <div className="p-4 border-b border-omega-border">
        <div className="flex gap-1">
          {panelButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSidebarPanel(sidebarPanel === btn.id ? 'none' : btn.id)}
              className={`flex-1 p-2 rounded text-xs font-medium transition-colors ${
                sidebarPanel === btn.id
                  ? 'bg-omega-primary text-white'
                  : 'bg-omega-bg text-omega-muted hover:text-omega-text'
              }`}
              title={btn.label}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {sidebarPanel === 'history' && <HistoryPanel />}
        {sidebarPanel === 'help' && <HelpPanel />}
        {sidebarPanel === 'export' && <ExportPanel />}
        {sidebarPanel === 'none' && <EmptyPanel />}
      </div>
    </aside>
  );
}

/**
 * History panel component
 */
function HistoryPanel(): JSX.Element {
  const { history, loadFromHistory, removeFromHistory } = useAnalysisStore();

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-omega-text">Recent Analyses</h3>
      {history.length === 0 ? (
        <p className="text-xs text-omega-muted">No history yet</p>
      ) : (
        <ul className="space-y-2">
          {history.slice(0, 10).map((entry) => (
            <li
              key={entry.id}
              className="p-2 rounded bg-omega-bg border border-omega-border hover:border-omega-primary transition-colors cursor-pointer"
              onClick={() => loadFromHistory(entry.id)}
            >
              <p className="text-xs text-omega-text truncate">
                {entry.name || entry.text.slice(0, 30)}...
              </p>
              <p className="text-xs text-omega-muted mt-1">
                {new Date(entry.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Help panel component
 */
function HelpPanel(): JSX.Element {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-omega-text">Quick Help</h3>
      <div className="space-y-2 text-xs text-omega-muted">
        <p><strong>Analyze:</strong> Enter text and click Analyze</p>
        <p><strong>History:</strong> View past analyses</p>
        <p><strong>Dashboard:</strong> Overview and statistics</p>
        <p><strong>Settings:</strong> Configure preferences</p>
      </div>
      <div className="pt-4 border-t border-omega-border">
        <p className="text-xs text-omega-muted">
          NASA-Grade L4 / DO-178C Level A
        </p>
      </div>
    </div>
  );
}

/**
 * Export panel component
 */
function ExportPanel(): JSX.Element {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-omega-text">Export</h3>
      <div className="space-y-2">
        <button className="omega-btn-secondary w-full text-sm">
          Export as JSON
        </button>
        <button className="omega-btn-secondary w-full text-sm">
          Export as PDF
        </button>
        <button className="omega-btn-secondary w-full text-sm">
          Export as CSV
        </button>
      </div>
    </div>
  );
}

/**
 * Empty panel placeholder
 */
function EmptyPanel(): JSX.Element {
  return (
    <div className="text-center text-omega-muted">
      <p className="text-sm">Select a panel above</p>
    </div>
  );
}
