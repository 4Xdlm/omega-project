/**
 * Recent Analyses Component for OMEGA UI
 * @module components/dashboard/RecentAnalyses
 * @description Widget showing recent analysis history
 */

import { useMemo } from 'react';
import type { TextAnalysisResult } from '../../core/types';
import { getEmotionColor } from '../charts/EmotionBar';

/**
 * Recent analyses props
 */
interface RecentAnalysesProps {
  results: TextAnalysisResult[];
  maxItems?: number;
  onSelect?: (result: TextAnalysisResult) => void;
}

/**
 * Get dominant emotion from result
 */
function getDominantEmotion(result: TextAnalysisResult): string {
  const entries = Object.entries(result.emotions);
  if (entries.length === 0) return 'none';
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Recent analyses component
 * @param props - Component properties
 * @returns Recent analyses widget
 */
export function RecentAnalyses({
  results,
  maxItems = 5,
  onSelect,
}: RecentAnalysesProps): JSX.Element {
  const recentResults = useMemo(() => {
    return [...results]
      .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
      .slice(0, maxItems);
  }, [results, maxItems]);

  if (results.length === 0) {
    return (
      <div className="bg-omega-surface rounded-lg p-4 border border-omega-border">
        <h3 className="text-sm font-medium text-omega-text mb-3">
          Recent Analyses
        </h3>
        <div className="flex items-center justify-center py-6 text-center">
          <p className="text-xs text-omega-muted">
            No analyses yet. Start analyzing text!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-omega-surface rounded-lg p-4 border border-omega-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-omega-text">
          Recent Analyses
        </h3>
        <span className="text-xs text-omega-muted">
          {results.length} total
        </span>
      </div>

      <div className="space-y-2">
        {recentResults.map((result) => {
          const dominant = getDominantEmotion(result);
          const color = getEmotionColor(dominant);

          return (
            <button
              key={result.id}
              onClick={() => onSelect?.(result)}
              className="w-full flex items-center gap-3 p-2 rounded hover:bg-omega-bg transition-colors text-left"
            >
              {/* Emotion indicator */}
              <div
                className="w-2 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-omega-text capitalize">
                    {dominant}
                  </span>
                  <span className="text-[10px] text-omega-muted">
                    {formatRelativeTime(result.metadata.timestamp)}
                  </span>
                </div>
                <p className="text-[10px] text-omega-muted truncate mt-0.5">
                  {result.metadata.wordCount} words
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
