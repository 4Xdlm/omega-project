/**
 * History View for OMEGA UI
 * @module views/HistoryView
 * @description Full history page with list and detail view
 */

import { useState, useCallback } from 'react';
import { HistoryList } from '../components/history/HistoryList';
import { EmotionChart } from '../components/charts/EmotionChart';
import { useAnalysisStore } from '../stores/analysisStore';
import type { TextAnalysisResult } from '../core/types';

/**
 * History view component
 * @returns Full history interface
 */
export function HistoryView(): JSX.Element {
  const { results, removeResult, clearResults } = useAnalysisStore();
  const [selectedResult, setSelectedResult] = useState<TextAnalysisResult | null>(null);

  const handleSelect = useCallback((result: TextAnalysisResult) => {
    setSelectedResult(result);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      removeResult(id);
      if (selectedResult?.id === id) {
        setSelectedResult(null);
      }
    },
    [removeResult, selectedResult]
  );

  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all history?')) {
      clearResults();
      setSelectedResult(null);
    }
  }, [clearResults]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(results, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omega-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-omega-text">
            Analysis History
          </h1>
          <p className="text-sm text-omega-muted mt-1">
            {results.length} {results.length === 1 ? 'analysis' : 'analyses'} saved
          </p>
        </div>
        {results.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm text-omega-muted hover:text-omega-text border border-omega-border rounded hover:bg-omega-surface transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-sm text-omega-error hover:bg-omega-error/10 border border-omega-error/30 rounded transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* History list */}
        <div className="lg:col-span-1 bg-omega-surface/50 rounded-lg p-4 overflow-hidden flex flex-col">
          <HistoryList
            results={results}
            onSelect={handleSelect}
            onDelete={handleDelete}
            selectedId={selectedResult?.id}
            showControls={true}
          />
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-auto">
          {selectedResult ? (
            <HistoryDetail result={selectedResult} />
          ) : (
            <EmptyDetail hasResults={results.length > 0} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * History detail panel
 */
function HistoryDetail({ result }: { result: TextAnalysisResult }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {/* Emotion chart */}
      <div className="bg-omega-surface rounded-lg p-4">
        <EmotionChart
          emotions={result.emotions}
          title="Emotion Distribution"
          showViewToggle={true}
          height={280}
        />
      </div>

      {/* Text preview */}
      <div className="bg-omega-surface rounded-lg p-4">
        <h3 className="text-sm font-medium text-omega-text mb-3">
          Analyzed Text
        </h3>
        <p className="text-sm text-omega-muted whitespace-pre-wrap max-h-48 overflow-auto">
          {result.metadata.textPreview || 'No text preview available'}
        </p>
      </div>

      {/* Metadata */}
      <div className="bg-omega-surface rounded-lg p-4">
        <h3 className="text-sm font-medium text-omega-text mb-3">
          Analysis Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <MetadataCard
            label="Characters"
            value={result.metadata.textLength.toString()}
          />
          <MetadataCard
            label="Words"
            value={result.metadata.wordCount.toString()}
          />
          <MetadataCard
            label="Sentences"
            value={result.metadata.sentenceCount.toString()}
          />
          <MetadataCard
            label="Analyzed"
            value={new Date(result.metadata.timestamp).toLocaleString()}
          />
        </div>
      </div>

      {/* DNA Fingerprint */}
      {result.dnaFingerprint && (
        <div className="bg-omega-surface rounded-lg p-4">
          <h3 className="text-sm font-medium text-omega-text mb-3">
            DNA Fingerprint
          </h3>
          <div className="flex gap-0.5 h-10">
            {result.dnaFingerprint.components.map((val, idx) => (
              <div
                key={idx}
                className="flex-1"
                style={{
                  backgroundColor: `hsl(${val * 360}, 70%, 50%)`,
                  opacity: 0.5 + val * 0.5,
                }}
              />
            ))}
          </div>
          <p className="text-xs text-omega-muted mt-2">
            {result.dnaFingerprint.components.length}-component emotional signature
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Metadata card component
 */
function MetadataCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="bg-omega-bg rounded p-3">
      <p className="text-omega-muted text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-omega-text font-medium mt-1">{value}</p>
    </div>
  );
}

/**
 * Empty detail state
 */
function EmptyDetail({ hasResults }: { hasResults: boolean }): JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center bg-omega-surface/50 rounded-lg border border-omega-border border-dashed">
      <div className="text-center p-6">
        <svg
          className="w-12 h-12 mx-auto text-omega-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm text-omega-muted mt-3">
          {hasResults
            ? 'Select an entry to view details'
            : 'No history entries yet'}
        </p>
        {!hasResults && (
          <p className="text-xs text-omega-muted mt-1">
            Analyze some text to get started
          </p>
        )}
      </div>
    </div>
  );
}
