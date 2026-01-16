/**
 * Emotion Overview Component for OMEGA UI
 * @module components/dashboard/EmotionOverview
 * @description Aggregated emotion statistics widget
 */

import { useMemo } from 'react';
import type { TextAnalysisResult, EmotionVector } from '../../core/types';
import { getEmotionColor } from '../charts/EmotionBar';

/**
 * Emotion overview props
 */
interface EmotionOverviewProps {
  results: TextAnalysisResult[];
  maxEmotions?: number;
}

/**
 * Calculate aggregated emotions from results
 */
function aggregateEmotions(results: TextAnalysisResult[]): EmotionVector {
  if (results.length === 0) return {};

  const totals: Record<string, number> = {};
  const counts: Record<string, number> = {};

  results.forEach((result) => {
    Object.entries(result.emotions).forEach(([emotion, value]) => {
      if (value > 0) {
        totals[emotion] = (totals[emotion] || 0) + value;
        counts[emotion] = (counts[emotion] || 0) + 1;
      }
    });
  });

  const averages: EmotionVector = {};
  Object.keys(totals).forEach((emotion) => {
    averages[emotion] = totals[emotion] / counts[emotion];
  });

  return averages;
}

/**
 * Emotion overview component
 * @param props - Component properties
 * @returns Aggregated emotion stats widget
 */
export function EmotionOverview({
  results,
  maxEmotions = 6,
}: EmotionOverviewProps): JSX.Element {
  const aggregated = useMemo(() => aggregateEmotions(results), [results]);

  const topEmotions = useMemo(() => {
    return Object.entries(aggregated)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxEmotions);
  }, [aggregated, maxEmotions]);

  if (results.length === 0 || topEmotions.length === 0) {
    return (
      <div className="bg-omega-surface rounded-lg p-4 border border-omega-border">
        <h3 className="text-sm font-medium text-omega-text mb-3">
          Emotion Overview
        </h3>
        <div className="flex items-center justify-center py-6 text-center">
          <p className="text-xs text-omega-muted">
            No emotion data available
          </p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...topEmotions.map(([, v]) => v));

  return (
    <div className="bg-omega-surface rounded-lg p-4 border border-omega-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-omega-text">
          Emotion Overview
        </h3>
        <span className="text-xs text-omega-muted">
          Avg. from {results.length} {results.length === 1 ? 'analysis' : 'analyses'}
        </span>
      </div>

      <div className="space-y-3">
        {topEmotions.map(([emotion, value]) => (
          <EmotionRow
            key={emotion}
            emotion={emotion}
            value={value}
            maxValue={maxValue}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Emotion row component
 */
function EmotionRow({
  emotion,
  value,
  maxValue,
}: {
  emotion: string;
  value: number;
  maxValue: number;
}): JSX.Element {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const color = getEmotionColor(emotion);

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-omega-muted capitalize truncate">
        {emotion}
      </span>
      <div className="flex-1 h-2 bg-omega-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="w-12 text-xs text-omega-text text-right">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}
