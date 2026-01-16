/**
 * History Page Component
 * @module pages/HistoryPage
 * @description Analysis history viewer
 */

import { useAnalysisStore, useUIStore } from '../stores';

/**
 * History page component
 * @returns History list page
 */
export function HistoryPage(): JSX.Element {
  const { history, loadFromHistory, removeFromHistory, clearHistory } = useAnalysisStore();
  const { setView } = useUIStore();

  const handleLoad = (id: string) => {
    loadFromHistory(id);
    setView('analyze');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-omega-text">
          Analysis History
        </h2>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-sm text-omega-error hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="omega-card text-center">
          <p className="text-omega-muted">No analyses saved yet.</p>
          <button
            onClick={() => setView('analyze')}
            className="omega-btn mt-4"
          >
            Start Analyzing
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="omega-card hover:border-omega-primary transition-colors cursor-pointer"
              onClick={() => handleLoad(entry.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-omega-text">
                    {entry.name || 'Untitled Analysis'}
                  </h3>
                  <p className="text-sm text-omega-muted mt-1 line-clamp-2">
                    {entry.text.slice(0, 150)}...
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm text-omega-primary capitalize">
                    {entry.result.dominantEmotion || 'Neutral'}
                  </p>
                  <p className="text-xs text-omega-muted mt-1">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-omega-muted">
                <span>Confidence: {(entry.result.averageConfidence * 100).toFixed(1)}%</span>
                <span>Segments: {entry.result.segmentCount}</span>
                <span>Words: {entry.result.wordCount}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(entry.id);
                  }}
                  className="text-omega-error hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
