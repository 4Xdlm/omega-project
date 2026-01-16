/**
 * Header Component for OMEGA UI
 * @module components/layout/Header
 * @description Top navigation bar with branding and controls
 */

import { useUIStore, useSettingsStore } from '../../stores';
import type { ViewType } from '../../stores';

/**
 * Navigation item definition
 */
interface NavItem {
  id: ViewType;
  label: string;
}

/**
 * Navigation items
 */
const navItems: NavItem[] = [
  { id: 'analyze', label: 'Analyze' },
  { id: 'history', label: 'History' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'settings', label: 'Settings' },
];

/**
 * Header component
 * @returns Header element with navigation
 */
export function Header(): JSX.Element {
  const { currentView, setView, toggleSidebar } = useUIStore();
  const { version } = useSettingsStore();

  return (
    <header className="omega-header flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded hover:bg-omega-border transition-colors"
          aria-label="Toggle sidebar"
        >
          <MenuIcon />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-omega-primary">
            OMEGA
          </h1>
          <p className="text-xs text-omega-muted">v{version}</p>
        </div>
      </div>

      <nav className="flex gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === item.id
                ? 'bg-omega-primary text-white'
                : 'text-omega-text hover:bg-omega-border'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <StatusIndicator />
      </div>
    </header>
  );
}

/**
 * Menu icon component
 */
function MenuIcon(): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

/**
 * Status indicator component
 */
function StatusIndicator(): JSX.Element {
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-omega-surface border border-omega-border">
      <span className="w-2 h-2 rounded-full bg-omega-success animate-pulse" />
      <span className="text-xs text-omega-muted">Ready</span>
    </div>
  );
}
