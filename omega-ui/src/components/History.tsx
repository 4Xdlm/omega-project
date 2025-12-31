import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface HistoryItem {
  id: string;
  timestamp: string;
  source: string;
  dominant_emotion: string | null;
  duration_ms: number;
  word_count: number;
  total_emotion_hits: number;
  path: string;
  segments_count?: number;
  segmentation_mode?: string;
}

interface HistoryIndex {
  schema: string;
  items: HistoryItem[];
}

const EMOTION_COLORS: Record<string, string> = {
  joy: "#FFD700", sadness: "#4169E1", anger: "#DC143C", fear: "#800080",
  surprise: "#FF69B4", disgust: "#228B22", trust: "#20B2AA", anticipation: "#FF8C00",
  love: "#FF1493", pride: "#DAA520"
};

interface Props {
  onBack: () => void;
  onLoadRun: (runId: string) => void;
  onCompareTwoRuns: (runIdA: string, runIdB: string) => void;
}

function History({ onBack, onLoadRun, onCompareTwoRuns }: Props) {
  const [history, setHistory] = useState<HistoryIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForDiff, setSelectedForDiff] = useState<string[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await invoke<HistoryIndex>("get_history");
      setHistory(data);
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  };

  const handleOpenOutputFolder = async () => {
    await invoke("open_output_folder");
  };

  const handleOpenRunFolder = async (runId: string) => {
    await invoke("open_run_folder", { runId });
  };

  const toggleDiffSelection = (runId: string) => {
    setSelectedForDiff(prev => {
      if (prev.includes(runId)) {
        return prev.filter(id => id !== runId);
      }
      if (prev.length >= 2) {
        return [prev[1], runId];
      }
      return [...prev, runId];
    });
  };

  const handleCompare = () => {
    if (selectedForDiff.length === 2) {
      onCompareTwoRuns(selectedForDiff[0], selectedForDiff[1]);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };


  const getSourceName = (source: string) => {
    if (source === "direct_input") return "Texte colle";
    const parts = source.split(/[/\\]/);
    return parts[parts.length - 1] || source;
  };

  return (
    <div className="history-page">
      <div className="history-header">
        <button className="btn btn-secondary" onClick={onBack}>Retour</button>
        <h2>Historique des analyses</h2>
        <div className="history-actions-top">
          <button 
            className={`btn ${selectedForDiff.length === 2 ? "btn-primary" : "btn-disabled"}`}
            onClick={handleCompare}
            disabled={selectedForDiff.length !== 2}
          >
            Comparer ({selectedForDiff.length}/2)
          </button>
          <button className="btn btn-secondary" onClick={handleOpenOutputFolder}>
            Dossier output
          </button>
        </div>
      </div>

      {selectedForDiff.length > 0 && (
        <div className="diff-selection-banner">
          <span>Selection pour diff: </span>
          {selectedForDiff.map((id, i) => (
            <span key={id} className="diff-selected-item">
              {i === 0 ? "A: " : "B: "}{id}
            </span>
          ))}
          <button className="btn-small" onClick={() => setSelectedForDiff([])}>
            Annuler
          </button>
        </div>
      )}

      {loading && <p className="loading">Chargement...</p>}
      
      {error && <div className="error-banner">Erreur: {error}</div>}

      {history && (
        <div className="history-content">
          <p className="history-count">{history.items.length} analyses enregistrees</p>
          
          {history.items.length === 0 ? (
            <p className="no-history">Aucune analyse dans l historique</p>
          ) : (
            <div className="history-table">
              <div className="history-table-header">
                <span>Diff</span>
                <span>Date</span>
                <span>Source</span>
                <span>Dominante</span>
                <span>Mots</span>
                <span>Segments</span>
                <span>Actions</span>
              </div>
              
              {history.items.slice(0, 30).map((item) => (
                <div 
                  key={item.id} 
                  className={`history-row ${selectedForDiff.includes(item.id) ? "selected-for-diff" : ""}`}
                >
                  <span className="history-diff-checkbox">
                    <input 
                      type="checkbox"
                      checked={selectedForDiff.includes(item.id)}
                      onChange={() => toggleDiffSelection(item.id)}
                      disabled={!item.segments_count}
                      title={!item.segments_count ? "Run non segmente" : "Selectionner pour diff"}
                    />
                  </span>
                  <span className="history-date">{formatDate(item.timestamp)}</span>
                  <span className="history-source" title={item.source}>
                    {getSourceName(item.source)}
                  </span>
                  <span 
                    className="history-emotion"
                    style={{ color: EMOTION_COLORS[item.dominant_emotion || ""] || "#666" }}
                  >
                    {item.dominant_emotion || "-"}
                  </span>
                  <span className="history-words">{item.word_count.toLocaleString()}</span>
                  <span className="history-segments">
                    {item.segments_count ? `${item.segments_count} (${item.segmentation_mode})` : "-"}
                  </span>
                  <span className="history-actions">
                    <button 
                      className="btn-small btn-primary-small"
                      onClick={() => onLoadRun(item.id)}
                    >
                      {item.segments_count ? "Timeline" : "Voir"}
                    </button>
                    <button 
                      className="btn-small"
                      onClick={() => handleOpenRunFolder(item.id)}
                    >
                      Dossier
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default History;

