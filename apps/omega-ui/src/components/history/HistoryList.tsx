/**
 * History List Component for OMEGA UI
 * @module components/history/HistoryList
 * @description List of analysis history entries
 */

import { useMemo, useState } from 'react';
import { HistoryItem } from './HistoryItem';
import type { TextAnalysisResult } from '../../core/types';

/**
 * Sort options for history
 */
type SortOption = 'date' | 'emotion' | 'length';

/**
 * History list props
 */
interface HistoryListProps {
  results: TextAnalysisResult[];
  onSelect?: (result: TextAnalysisResult) => void;
  onDelete?: (id: string) => void;
  selectedId?: string;
  maxItems?: number;
  showControls?: boolean;
}

/**
 * History list component
 * @param props - Component properties
 * @returns List of history entries
 */
export function HistoryList({
  results,
  onSelect,
  onDelete,
  selectedId,
  maxItems,
  showControls = true,
}: HistoryListProps): JSX.Element {
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterEmoji, setFilterEmoji] = useState<string | null>(null);

  const sortedResults = useMemo(() => {
    let sorted = [...results];

    // Apply filter
    if (filterEmoji) {
      sorted = sorted.filter((result) => {
        const dominant = Object.entries(result.emotions).sort((a, b) => b[1] - a[1])[0];
        return dominant && dominant[0] === filterEmoji;
      });
    }

    // Apply sort
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
        break;
      case 'emotion':
        sorted.sort((a, b) => {
          const aMax = Math.max(...Object.values(a.emotions));
          const bMax = Math.max(...Object.values(b.emotions));
          return bMax - aMax;
        });
        break;
      case 'length':
        sorted.sort((a, b) => b.metadata.wordCount - a.metadata.wordCount);
        break;
    }

    // Apply limit
    if (maxItems) {
      sorted = sorted.slice(0, maxItems);
    }

    return sorted;
  }, [results, sortBy, filterEmoji, maxItems]);

  // Get available emotions for filter
  const availableEmotions = useMemo(() => {
    const emotions = new Set<string>();
    results.forEach((result) => {
      Object.entries(result.emotions).forEach(([emotion, value]) => {
        if (value > 0.1) emotions.add(emotion);
      });
    });
    return Array.from(emotions).sort();
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HistoryIcon />
        <p className="text-sm text-omega-muted mt-3">No analysis history</p>
        <p className="text-xs text-omega-muted mt-1">
          Analyzed texts will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-3 pb-3 border-b border-omega-border mb-3">
          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs bg-omega-surface border border-omega-border rounded px-2 py-1 text-omega-text"
          >
            <option value="date">Most Recent</option>
            <option value="emotion">Highest Emotion</option>
            <option value="length">Longest Text</option>
          </select>

          {/* Filter dropdown */}
          <select
            value={filterEmoji || ''}
            onChange={(e) => setFilterEmoji(e.target.value || null)}
            className="text-xs bg-omega-surface border border-omega-border rounded px-2 py-1 text-omega-text"
          >
            <option value="">All Emotions</option>
            {availableEmotions.map((emotion) => (
              <option key={emotion} value={emotion}>
                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </option>
            ))}
          </select>

          {/* Count */}
          <span className="text-xs text-omega-muted ml-auto">
            {sortedResults.length} of {results.length}
          </span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-auto space-y-2">
        {sortedResults.map((result) => (
          <HistoryItem
            key={result.id}
            result={result}
            onClick={onSelect}
            onDelete={onDelete}
            selected={result.id === selectedId}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * History icon
 */
function HistoryIcon(): JSX.Element {
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
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
