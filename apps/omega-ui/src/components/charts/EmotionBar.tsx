/**
 * Emotion Bar Chart Component for OMEGA UI
 * @module components/charts/EmotionBar
 * @description Bar chart visualization for Emotion14 values
 */

import { useMemo } from 'react';
import type { EmotionVector } from '../../core/types';

/**
 * Emotion color palette matching Emotion14 canonical set
 */
const EMOTION_COLORS: Record<string, string> = {
  joy: '#FFD700',
  sadness: '#4169E1',
  anger: '#DC143C',
  fear: '#800080',
  surprise: '#FF8C00',
  disgust: '#228B22',
  trust: '#00CED1',
  anticipation: '#FF69B4',
  love: '#FF1493',
  guilt: '#8B4513',
  shame: '#A0522D',
  pride: '#FFD700',
  envy: '#32CD32',
  contempt: '#708090',
};

/**
 * Emotion bar props
 */
interface EmotionBarProps {
  emotions: EmotionVector;
  showLabels?: boolean;
  showValues?: boolean;
  sortBy?: 'value' | 'name' | 'none';
  maxBars?: number;
  height?: number;
  animated?: boolean;
}

/**
 * Single bar item component
 */
function BarItem({
  emotion,
  value,
  maxValue,
  showLabel,
  showValue,
  color,
  animated,
}: {
  emotion: string;
  value: number;
  maxValue: number;
  showLabel: boolean;
  showValue: boolean;
  color: string;
  animated: boolean;
}): JSX.Element {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="w-24 text-xs text-omega-muted truncate capitalize">
          {emotion}
        </span>
      )}
      <div className="flex-1 h-5 bg-omega-surface rounded overflow-hidden">
        <div
          className={`h-full rounded ${animated ? 'transition-all duration-500 ease-out' : ''}`}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showValue && (
        <span className="w-12 text-xs text-omega-muted text-right">
          {(value * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

/**
 * Emotion bar chart component
 * @param props - Component properties
 * @returns Bar chart visualization
 */
export function EmotionBar({
  emotions,
  showLabels = true,
  showValues = true,
  sortBy = 'value',
  maxBars = 14,
  height = 300,
  animated = true,
}: EmotionBarProps): JSX.Element {
  const sortedEmotions = useMemo(() => {
    const entries = Object.entries(emotions);

    if (sortBy === 'value') {
      entries.sort((a, b) => b[1] - a[1]);
    } else if (sortBy === 'name') {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }

    return entries.slice(0, maxBars);
  }, [emotions, sortBy, maxBars]);

  const maxValue = useMemo(() => {
    return Math.max(...sortedEmotions.map(([, v]) => v), 0.01);
  }, [sortedEmotions]);

  if (sortedEmotions.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-omega-muted text-sm"
        style={{ height }}
      >
        No emotion data
      </div>
    );
  }

  return (
    <div className="space-y-2" style={{ maxHeight: height, overflowY: 'auto' }}>
      {sortedEmotions.map(([emotion, value]) => (
        <BarItem
          key={emotion}
          emotion={emotion}
          value={value}
          maxValue={maxValue}
          showLabel={showLabels}
          showValue={showValues}
          color={EMOTION_COLORS[emotion] || '#888888'}
          animated={animated}
        />
      ))}
    </div>
  );
}

/**
 * Get emotion color by name
 * @param emotion - Emotion name
 * @returns Color hex code
 */
export function getEmotionColor(emotion: string): string {
  return EMOTION_COLORS[emotion] || '#888888';
}
