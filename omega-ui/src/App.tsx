import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Home from "./components/Home";
import RunConsole from "./components/RunConsole";
import Results from "./components/Results";
import TextAnalyzer from "./components/TextAnalyzer";
import History from "./components/History";
import RunViewer from "./components/RunViewer";
import DiffViewer from "./components/DiffViewer";
import "./App.css";

type View = "home" | "run" | "results" | "analyzer" | "history" | "viewer" | "diff";

interface RunResult {
  timestamp: string;
  workspace: string;
  status: string;
  duration_ms: number;
  summary: {
    tests: number | null;
    invariants: number | null;
    notes: string[];
  };
}

function App() {
  const [view, setView] = useState<View>("home");
  const [result, setResult] = useState<RunResult | null>(null);
  const [loadedAnalysis, setLoadedAnalysis] = useState<any | null>(null);
  const [diffRunA, setDiffRunA] = useState<any | null>(null);
  const [diffRunB, setDiffRunB] = useState<any | null>(null);
  const [diffRunIdA, setDiffRunIdA] = useState<string>("");
  const [diffRunIdB, setDiffRunIdB] = useState<string>("");

  const handleRunComplete = (runResult: RunResult) => {
    setResult(runResult);
    setView("results");
  };

  const handleLoadRun = async (runId: string) => {
    try {
      const analysis = await invoke("load_run", { runId });
      setLoadedAnalysis(analysis);
      setView("viewer");
    } catch (err) {
      console.error("Failed to load run:", err);
    }
  };

  const handleCompareTwoRuns = async (runIdA: string, runIdB: string) => {
    try {
      const [analysisA, analysisB] = await Promise.all([
        invoke("load_run", { runId: runIdA }),
        invoke("load_run", { runId: runIdB })
      ]);
      setDiffRunA(analysisA);
      setDiffRunB(analysisB);
      setDiffRunIdA(runIdA);
      setDiffRunIdB(runIdB);
      setView("diff");
    } catch (err) {
      console.error("Failed to load runs for diff:", err);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>OMEGA UI</h1>
        <nav className="app-nav">
          <button 
            className={view === "home" ? "active" : ""}
            onClick={() => setView("home")}
          >
            Cycle
          </button>
          <button 
            className={view === "analyzer" ? "active" : ""}
            onClick={() => { setLoadedAnalysis(null); setView("analyzer"); }}
          >
            Analyseur
          </button>
          <button 
            className={view === "history" ? "active" : ""}
            onClick={() => setView("history")}
          >
            Historique
          </button>
        </nav>
        <span className="version">v0.8.0</span>
      </header>

      <main className="app-main">
        {view === "home" && (
          <Home onStartRun={() => setView("run")} />
        )}
        {view === "run" && (
          <RunConsole 
            onComplete={handleRunComplete}
            onCancel={() => setView("home")}
          />
        )}
        {view === "results" && result && (
          <Results 
            result={result}
            onBack={() => setView("home")}
          />
        )}
        {view === "analyzer" && (
          <TextAnalyzer 
            onBack={() => setView("home")} 
            preloadedResult={null}
          />
        )}
        {view === "history" && (
          <History 
            onBack={() => setView("home")}
            onLoadRun={handleLoadRun}
            onCompareTwoRuns={handleCompareTwoRuns}
          />
        )}
        {view === "viewer" && loadedAnalysis && (
          <RunViewer
            result={loadedAnalysis}
            onBack={() => setView("history")}
          />
        )}
        {view === "diff" && diffRunA && diffRunB && (
          <DiffViewer
            runA={diffRunA}
            runB={diffRunB}
            runIdA={diffRunIdA}
            runIdB={diffRunIdB}
            onBack={() => setView("history")}
          />
        )}
      </main>
    </div>
  );
}

export default App;


