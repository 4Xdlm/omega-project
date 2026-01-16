/**
 * Analyze Page Component
 * @module pages/AnalyzePage
 * @description Main text analysis interface
 */

import { useAnalysisStore, useSettingsStore } from '../stores';

/**
 * Analyze page component
 * @returns Analysis interface page
 */
export function AnalyzePage(): JSX.Element {
  const {
    currentText,
    currentAnalysis,
    isAnalyzing,
    error,
    setText,
    analyze,
    clearCurrent,
    saveToHistory,
  } = useAnalysisStore();
  const { autoSaveHistory } = useSettingsStore();

  const handleAnalyze = () => {
    analyze();
    if (autoSaveHistory && currentAnalysis) {
      saveToHistory();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="omega-card">
        <h2 className="text-xl font-semibold text-omega-text mb-4">
          Text Analysis
        </h2>

        <textarea
          value={currentText}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to analyze..."
          className="omega-input h-48 resize-none font-mono text-sm"
          disabled={isAnalyzing}
        />

        {error && (
          <div className="mt-2 p-3 rounded bg-omega-error/10 border border-omega-error text-omega-error text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !currentText.trim()}
            className="omega-btn disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
          <button
            onClick={clearCurrent}
            disabled={isAnalyzing}
            className="omega-btn-secondary"
          >
            Clear
          </button>
          {currentAnalysis && (
            <button
              onClick={() => saveToHistory()}
              className="omega-btn-secondary"
            >
              Save to History
            </button>
          )}
        </div>
      </div>

      {currentAnalysis && (
        <div className="omega-card">
          <h3 className="text-lg font-semibold text-omega-text mb-4">
            Analysis Results
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded bg-omega-bg border border-omega-border">
              <p className="text-xs text-omega-muted">Dominant Emotion</p>
              <p className="text-lg font-semibold text-omega-primary capitalize">
                {currentAnalysis.dominantEmotion || 'Neutral'}
              </p>
            </div>
            <div className="p-3 rounded bg-omega-bg border border-omega-border">
              <p className="text-xs text-omega-muted">Overall Valence</p>
              <p className={`text-lg font-semibold ${
                currentAnalysis.overallValence > 0 ? 'text-omega-success' :
                currentAnalysis.overallValence < 0 ? 'text-omega-error' :
                'text-omega-muted'
              }`}>
                {currentAnalysis.overallValence.toFixed(3)}
              </p>
            </div>
            <div className="p-3 rounded bg-omega-bg border border-omega-border">
              <p className="text-xs text-omega-muted">Confidence</p>
              <p className="text-lg font-semibold text-omega-text">
                {(currentAnalysis.averageConfidence * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-3 rounded bg-omega-bg border border-omega-border">
              <p className="text-xs text-omega-muted">Segments</p>
              <p className="text-lg font-semibold text-omega-text">
                {currentAnalysis.segmentCount}
              </p>
            </div>
          </div>

          <div className="p-3 rounded bg-omega-bg border border-omega-border">
            <p className="text-xs text-omega-muted mb-2">Emotion Distribution</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(currentAnalysis.aggregateEmotions).map(([emotion, intensity]) => (
                <span
                  key={emotion}
                  className="px-2 py-1 rounded bg-omega-surface border border-omega-border text-xs"
                >
                  {emotion}: {((intensity ?? 0) * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
