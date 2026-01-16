/**
 * Analysis View for OMEGA UI
 * @module views/AnalysisView
 * @description Complete analysis page integrating TextInput + EmotionChart
 */

import { useState, useCallback } from 'react';
import { TextInput } from '../components/input/TextInput';
import { FileDropZone } from '../components/input/FileDropZone';
import { EmotionChart } from '../components/charts/EmotionChart';
import { analyzeText } from '../core/analyzer';
import { useAnalysisStore } from '../stores/analysisStore';
import type { TextAnalysisResult } from '../core/types';

/**
 * Analysis view state
 */
type AnalysisState = 'idle' | 'loading' | 'complete' | 'error';

/**
 * Analysis view component
 * @returns Complete analysis interface
 */
export function AnalysisView(): JSX.Element {
  const [text, setText] = useState('');
  const [state, setState] = useState<AnalysisState>('idle');
  const [result, setResult] = useState<TextAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { addResult } = useAnalysisStore();

  const handleAnalyze = useCallback(async () => {
    if (text.trim().length < 10) {
      setError('Please enter at least 10 characters to analyze');
      return;
    }

    setState('loading');
    setError(null);

    try {
      // Simulate async processing
      await new Promise((resolve) => setTimeout(resolve, 500));
      const analysisResult = analyzeText(text);
      setResult(analysisResult);
      addResult(analysisResult);
      setState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setState('error');
    }
  }, [text, addResult]);

  const handleFileLoad = useCallback((content: string, filename: string) => {
    setText(content);
    setState('idle');
    setResult(null);
  }, []);

  const handleClear = useCallback(() => {
    setText('');
    setResult(null);
    setState('idle');
    setError(null);
  }, []);

  const canAnalyze = text.trim().length >= 10 && state !== 'loading';

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-omega-text">
            Emotional Analysis
          </h1>
          <p className="text-sm text-omega-muted mt-1">
            Enter or paste text to analyze its emotional content
          </p>
        </div>
        {(text || result) && (
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm text-omega-muted hover:text-omega-text transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Input panel */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 flex flex-col">
            <TextInput
              value={text}
              onChange={setText}
              placeholder="Enter text to analyze emotional content..."
              showStats={true}
              autoFocus={true}
              minLength={10}
              maxLength={10000}
              onAnalyze={handleAnalyze}
            />
          </div>

          <FileDropZone
            onFileLoad={handleFileLoad}
            accept={['.txt', '.md']}
            maxSize={1024 * 1024}
          />

          {/* Analyze button */}
          <div className="flex items-center gap-4">
            <AnalyzeButton
              onClick={handleAnalyze}
              loading={state === 'loading'}
              disabled={!canAnalyze}
            />
            {error && (
              <p className="text-sm text-omega-error">{error}</p>
            )}
          </div>
        </div>

        {/* Results panel */}
        <div className="flex flex-col gap-4 min-h-0">
          <ResultsPanel result={result} state={state} />
        </div>
      </div>
    </div>
  );
}

/**
 * Analyze button component
 */
function AnalyzeButton({
  onClick,
  loading,
  disabled,
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
        disabled
          ? 'bg-omega-surface text-omega-muted cursor-not-allowed'
          : 'bg-omega-primary text-white hover:bg-omega-primary/90 active:scale-[0.98]'
      }`}
    >
      {loading ? (
        <>
          <LoadingSpinner />
          <span>Analyzing...</span>
        </>
      ) : (
        <>
          <AnalyzeIcon />
          <span>Analyze Text</span>
        </>
      )}
    </button>
  );
}

/**
 * Results panel component
 */
function ResultsPanel({
  result,
  state,
}: {
  result: TextAnalysisResult | null;
  state: AnalysisState;
}): JSX.Element {
  if (state === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-omega-muted">Analyzing emotional content...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center bg-omega-surface/50 rounded-lg border border-omega-border border-dashed">
        <div className="flex flex-col items-center gap-3 text-center p-6">
          <ChartIcon />
          <div>
            <p className="text-sm text-omega-muted">No analysis results yet</p>
            <p className="text-xs text-omega-muted mt-1">
              Enter text and click Analyze to see emotional breakdown
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-auto">
      {/* Emotion chart */}
      <div className="bg-omega-surface rounded-lg p-4">
        <EmotionChart
          emotions={result.emotions}
          title="Emotion Distribution"
          showViewToggle={true}
          defaultView="bar"
          height={280}
        />
      </div>

      {/* Metadata */}
      <div className="bg-omega-surface rounded-lg p-4">
        <h3 className="text-sm font-medium text-omega-text mb-3">
          Analysis Metadata
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <MetadataItem label="Text Length" value={`${result.metadata.textLength} chars`} />
          <MetadataItem label="Word Count" value={result.metadata.wordCount.toString()} />
          <MetadataItem label="Sentence Count" value={result.metadata.sentenceCount.toString()} />
          <MetadataItem label="Processed At" value={new Date(result.metadata.timestamp).toLocaleTimeString()} />
        </div>
      </div>

      {/* DNA Fingerprint preview */}
      {result.dnaFingerprint && (
        <div className="bg-omega-surface rounded-lg p-4">
          <h3 className="text-sm font-medium text-omega-text mb-3">
            DNA Fingerprint
          </h3>
          <div className="flex gap-0.5 h-8">
            {result.dnaFingerprint.components.slice(0, 64).map((val, idx) => (
              <div
                key={idx}
                className="flex-1 rounded-sm"
                style={{
                  backgroundColor: `hsl(${val * 360}, 70%, 50%)`,
                  opacity: 0.5 + val * 0.5,
                }}
              />
            ))}
          </div>
          <p className="text-xs text-omega-muted mt-2">
            128-component emotional signature (showing first 64)
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Metadata item component
 */
function MetadataItem({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex justify-between">
      <span className="text-omega-muted">{label}</span>
      <span className="text-omega-text font-medium">{value}</span>
    </div>
  );
}

/**
 * Loading spinner component
 */
function LoadingSpinner({ size = 'sm' }: { size?: 'sm' | 'lg' }): JSX.Element {
  const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-4 h-4';
  return (
    <svg
      className={`${sizeClass} animate-spin text-current`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Analyze icon
 */
function AnalyzeIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

/**
 * Chart icon
 */
function ChartIcon(): JSX.Element {
  return (
    <svg
      className="w-12 h-12 text-omega-muted"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
