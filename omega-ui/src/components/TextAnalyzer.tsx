import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getEmotionLabel } from "../i18n/emotions";

interface EmotionStat {
  emotion: string;
  intensity: number;
  occurrences: number;
  keywords: string[];
}

interface SegmentResult {
  id: string;
  index: number;
  title: string;
  word_start: number;
  word_end: number;
  word_count: number;
  char_start: number;
  char_end: number;
  duration_ms: number;
  total_emotion_hits: number;
  emotions: EmotionStat[];
  dominant_emotion: string | null;
}

interface SegmentationInfo {
  mode: string;
  fixed_words: number;
  min_segment_words: number;
  segments_count: number;
}

interface AnalysisMeta {
  mode: string;
  provider: string | null;
  ai_calls: number;
  deterministic: boolean;
  fallback_used: boolean;
}

interface AnalyzeResult {
  timestamp: string;
  duration_ms: number;
  source: string;
  word_count: number;
  char_count: number;
  line_count: number;
  total_emotion_hits: number;
  emotions: EmotionStat[];
  dominant_emotion: string | null;
  version: string;
  segmentation?: SegmentationInfo;
  segments?: SegmentResult[];
  analysis_meta?: AnalysisMeta;
}

const EMOTION_COLORS: Record<string, string> = {
  joy: "#FFD700", sadness: "#4169E1", anger: "#DC143C", fear: "#800080",
  surprise: "#FF69B4", disgust: "#228B22", trust: "#20B2AA", anticipation: "#FF8C00",
  love: "#FF1493", pride: "#DAA520"
};

const MODE_LABELS: Record<string, string> = {
  deterministic: "Lexicon (Deterministe)",
  hybrid: "Hybride (Lexicon + IA)",
  boost: "Boost (IA Always-On)"
};

interface Props {
  onBack: () => void;
  preloadedResult?: AnalyzeResult | null;
}

function TextAnalyzer({ onBack, preloadedResult }: Props) {
  const [text, setText] = useState("");
  const [filePath, setFilePath] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(preloadedResult || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enableSegmentation, setEnableSegmentation] = useState(false);
  const [segMode, setSegMode] = useState<"chapters" | "fixed_words">("chapters");
  const [fixedWords, setFixedWords] = useState(1000);
  const [selectedSegment, setSelectedSegment] = useState<SegmentResult | null>(null);
  
  const [analyzerMode, setAnalyzerMode] = useState<"deterministic" | "hybrid" | "boost">("deterministic");

  useEffect(() => {
    if (preloadedResult) {
      setResult(preloadedResult);
    }
  }, [preloadedResult]);

  const handleAnalyzeFile = async () => {
    if (!filePath) return;

    setIsAnalyzing(true);
    setError(null);
    setSelectedSegment(null);
    try {
      const segmentationMode = enableSegmentation ? segMode : null;
      const analysis = await invoke<AnalyzeResult>("analyze_file", {
        filePath,
        segmentationMode,
        fixedWords: segMode === "fixed_words" ? fixedWords : null,
        analyzerMode: analyzerMode
      });
      setResult(analysis);
    } catch (err) {
      setError(String(err));
    }
    setIsAnalyzing(false);
  };

  const handleOpenFile = async () => {
    try {
      setError(null);
      const selected = await open({
        multiple: false,
        directory: false,
        title: "Choisir un fichier texte",
        filters: [{ name: "Text", extensions: ["txt", "md", "text"] }]
      });

      if (selected && typeof selected === "string") {
        setFilePath(selected);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleClear = () => {
    setText("");
    setFilePath("");
    setResult(null);
    setError(null);
    setSelectedSegment(null);
  };

  const handleOpenOutput = async () => {
    await invoke("open_output_folder");
  };

  const getSourceName = (source: string) => {
    if (source === "direct_input") return "Texte colle";
    const parts = source.split(/[/\\]/);
    return parts[parts.length - 1] || source;
  };

  return (
    <div className="text-analyzer">
      <div className="analyzer-header">
        <button className="btn btn-secondary" onClick={onBack}>Retour</button>
        <h2>Analyseur OMEGA v0.8</h2>
        <button className="btn btn-secondary" onClick={handleOpenOutput}>Dossier Output</button>
      </div>

      {error && <div className="error-banner">Erreur: {error}</div>}

      <div className="analyzer-input">
        <div className="input-actions-top">
          <button className="btn btn-primary" onClick={handleOpenFile} disabled={isAnalyzing}>
            Charger fichier (.txt/.md)
          </button>
          {filePath && <span className="loaded-file">{getSourceName(filePath)}</span>}
        </div>

        <div className="mode-selector">
          <label className="mode-label">Mode d analyse:</label>
          <select 
            value={analyzerMode} 
            onChange={(e) => setAnalyzerMode(e.target.value as any)}
            className="mode-select"
          >
            <option value="deterministic">Lexicon (Deterministe)</option>
            <option value="hybrid">Hybride (Lexicon + IA si ambigu)</option>
            <option value="boost">Boost (IA Always-On)</option>
          </select>
        </div>

        <div className="segmentation-options">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={enableSegmentation}
              onChange={(e) => setEnableSegmentation(e.target.checked)}
            />
            Analyse segmentee
          </label>

          {enableSegmentation && (
            <div className="seg-controls">
              <select value={segMode} onChange={(e) => setSegMode(e.target.value as any)}>
                <option value="chapters">Chapitres</option>
                <option value="fixed_words">Blocs fixes</option>
              </select>

              {segMode === "fixed_words" && (
                <input
                  type="number"
                  value={fixedWords}
                  onChange={(e) => setFixedWords(parseInt(e.target.value) || 1000)}
                  min={100}
                  max={5000}
                  step={100}
                />
              )}
            </div>
          )}
        </div>

        <div className="analyzer-actions">
          <button
            className="btn btn-primary"
            onClick={handleAnalyzeFile}
            disabled={!filePath || isAnalyzing}
          >
            {isAnalyzing ? "Analyse..." : "Analyser"}
          </button>
          <button className="btn btn-secondary" onClick={handleClear}>Effacer</button>
        </div>
      </div>

      {result && (
        <div className="analyzer-results">
          <div className="result-meta">
            <span>Source: {getSourceName(result.source)}</span>
            <span>Version: {result.version}</span>
            <span>Duree: {result.duration_ms}ms</span>
          </div>

          {result.analysis_meta && (
            <div className="analysis-meta-box">
              <span className={`meta-mode ${result.analysis_meta.deterministic ? 'deterministic' : 'ai'}`}>
                {MODE_LABELS[result.analysis_meta.mode] || result.analysis_meta.mode}
              </span>
              {result.analysis_meta.provider && (
                <span className="meta-provider">Provider: {result.analysis_meta.provider}</span>
              )}
              {result.analysis_meta.ai_calls > 0 && (
                <span className="meta-ai-calls">Appels IA: {result.analysis_meta.ai_calls}</span>
              )}
              {result.analysis_meta.fallback_used && (
                <span className="meta-fallback">Fallback utilise</span>
              )}
              <span className={`meta-cert ${result.analysis_meta.deterministic ? 'certified' : ''}`}>
                {result.analysis_meta.deterministic ? "CERTIFIE" : "NON-DETERMINISTE"}
              </span>
            </div>
          )}

          <div className="result-stats">
            <div className="stat">
              <span className="stat-label">Mots</span>
              <span className="stat-value">{result.word_count.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Caracteres</span>
              <span className="stat-value">{result.char_count.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Marqueurs</span>
              <span className="stat-value">{result.total_emotion_hits.toLocaleString()}</span>
            </div>
            <div className="stat stat-dominant">
              <span className="stat-label">Dominante</span>
              <span
                className="stat-value"
                style={{ color: EMOTION_COLORS[result.dominant_emotion || ""] }}
              >
                {getEmotionLabel(result.dominant_emotion || "") || "Aucune"}
              </span>
            </div>
          </div>

          {result.emotions.length > 0 && (
            <div className="emotions-table">
              <div className="emotions-table-header">
                <span>Emotion</span>
                <span>%</span>
                <span>Occurrences</span>
                <span>Barre</span>
              </div>
              {result.emotions.map((e, i) => (
                <div key={i} className="emotions-table-row">
                  <span style={{ color: EMOTION_COLORS[e.emotion] }}>{getEmotionLabel(e.emotion)}</span>
                  <span>{(e.intensity * 100).toFixed(1)}%</span>
                  <span>{e.occurrences}</span>
                  <div className="emotion-bar-cell">
                    <div
                      className="emotion-bar-fill"
                      style={{
                        width: `${e.intensity * 100}%`,
                        backgroundColor: EMOTION_COLORS[e.emotion]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.segmentation && result.segments && (
            <div className="segments-section">
              <h3>Segments ({result.segmentation.mode} - {result.segmentation.segments_count})</h3>

              <div className="segments-list">
                {result.segments.map((seg) => (
                  <div
                    key={seg.id}
                    className={`segment-item ${selectedSegment?.id === seg.id ? "selected" : ""}`}
                    onClick={() => setSelectedSegment(seg)}
                  >
                    <span className="seg-index">#{seg.index}</span>
                    <span className="seg-title">{seg.title.substring(0, 30)}</span>
                    <span
                      className="seg-dominant"
                      style={{ color: EMOTION_COLORS[seg.dominant_emotion || ""] }}
                    >
                      {getEmotionLabel(seg.dominant_emotion || "") || "-"}
                    </span>
                    <span className="seg-words">{seg.word_count}w</span>
                    <span className="seg-hits">{seg.total_emotion_hits}h</span>
                  </div>
                ))}
              </div>

              {selectedSegment && (
                <div className="segment-detail">
                  <h4>{selectedSegment.title}</h4>
                  <p>{selectedSegment.word_count} mots | {selectedSegment.total_emotion_hits} marqueurs</p>
                  <div className="segment-emotions">
                    {selectedSegment.emotions.slice(0, 5).map((e, i) => (
                      <div key={i} className="seg-emotion-row">
                        <span style={{ color: EMOTION_COLORS[e.emotion] }}>{getEmotionLabel(e.emotion)}</span>
                        <span>{(e.intensity * 100).toFixed(1)}%</span>
                        <span>({e.occurrences})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TextAnalyzer;
