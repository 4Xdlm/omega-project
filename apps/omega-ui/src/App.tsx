/**
 * OMEGA UI Main Application Component
 * @module App
 * @description Root component for the OMEGA Desktop Application
 */

import { Layout } from './components/layout';
import { AnalyzePage, HistoryPage, DashboardPage, SettingsPage } from './pages';
import { useUIStore } from './stores';

/**
 * Main application component
 * @returns {JSX.Element} The root application component
 */
function App(): JSX.Element {
  const { currentView } = useUIStore();

  return (
    <Layout>
      {currentView === 'analyze' && <AnalyzePage />}
      {currentView === 'history' && <HistoryPage />}
      {currentView === 'dashboard' && <DashboardPage />}
      {currentView === 'settings' && <SettingsPage />}
    </Layout>
  );
}

export default App;
