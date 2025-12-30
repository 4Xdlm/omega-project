import { useState } from 'react';
import Home from './components/Home';
import RunConsole from './components/RunConsole';
import Results from './components/Results';
import { RunResult } from './types';

type Screen = 'home' | 'run' | 'results';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const handleStartRun = () => {
    if (workspace) {
      setScreen('run');
    }
  };

  const handleRunComplete = (runResult: RunResult) => {
    setResult(runResult);
    setScreen('results');
  };

  const handleBackToHome = () => {
    setScreen('home');
    setResult(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>OMEGA UI Bootstrap</h1>
        <span className="version">v0.1.0</span>
      </header>

      <main className="app-main">
        {screen === 'home' && (
          <Home
            workspace={workspace}
            onWorkspaceSelect={setWorkspace}
            onStartRun={handleStartRun}
          />
        )}

        {screen === 'run' && workspace && (
          <RunConsole
            workspace={workspace}
            onComplete={handleRunComplete}
            onBack={handleBackToHome}
          />
        )}

        {screen === 'results' && result && (
          <Results
            result={result}
            onBack={handleBackToHome}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>OMEGA Project — Aerospace Grade</span>
      </footer>
    </div>
  );
}

export default App;
