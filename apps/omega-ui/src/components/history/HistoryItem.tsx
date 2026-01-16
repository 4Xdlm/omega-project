/**
 * History Item Component for OMEGA UI
 * @module components/history/HistoryItem
 * @description Individual history entry display
 */

import type { TextAnalysisResult } from '../../core/types';
import { getEmotionColor } from '../charts/EmotionBar';

/**
 * History item props
 */
interface HistoryItemProps {
  result: TextAnalysisResult;
  onClick?: (result: TextAnalysisResult) => void;
  onDelete?: (id: string) => void;
  selected?: boolean;
  compact?: boolean;
}

/**
 * Get dominant emotion from result
 */
function getDominantEmotion(result: TextAnalysisResult): { name: string; value: number } {
  const entries = Object.entries(result.emotions);
  if (entries.length === 0) return { name: 'none', value: 0 };
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return { name: sorted[0][0], value: sorted[0][1] };
}

/**
 * Get preview text from result
 */
function getPreviewText(result: TextAnalysisResult, maxLength: number = 100): string {
  const text = result.metadata.textPreview || '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * History item component
 * @param props - Component properties
 * @returns History entry display
 */
export function HistoryItem({
  result,
  onClick,
  onDelete,
  selected = false,
  compact = false,
}: HistoryItemProps): JSX.Element {
  const dominant = getDominantEmotion(result);
  const preview = getPreviewText(result);
  const timestamp = formatTimestamp(result.metadata.timestamp);

  const handleClick = () => {
    if (onClick) onClick(result);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(result.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
        selected
          ? 'border-omega-primary bg-omega-primary/5'
          : 'border-omega-border hover:border-omega-muted bg-omega-surface/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Emotion indicator */}
        <div
          className="w-2 h-full min-h-[40px] rounded-full flex-shrink-0"
          style={{ backgroundColor: getEmotionColor(dominant.name) }}
          title={`${dominant.name}: ${(dominant.value * 100).toFixed(0)}%`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-omega-text capitalize">
              {dominant.name}
            </span>
            <span className="text-xs text-omega-muted">
              {timestamp}
            </span>
          </div>

          {/* Preview */}
          {!compact && (
            <p className="text-xs text-omega-muted line-clamp-2">
              {preview || 'No text preview'}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2">
            <StatBadge
              label="words"
              value={result.metadata.wordCount}
            />
            <StatBadge
              label="emotions"
              value={Object.values(result.emotions).filter(v => v > 0.01).length}
            />
          </div>
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-1 text-omega-muted hover:text-omega-error transition-all"
            aria-label="Delete entry"
          >
            <DeleteIcon />
          </button>
        )}
      </div>

      {/* Emotion mini-bar */}
      {!compact && (
        <div className="flex gap-0.5 mt-2 h-1 rounded overflow-hidden">
          {Object.entries(result.emotions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([emotion, value]) => (
              <div
                key={emotion}
                className="h-full"
                style={{
                  width: `${value * 100}%`,
                  backgroundColor: getEmotionColor(emotion),
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Stat badge component
 */
function StatBadge({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <span className="text-[10px] text-omega-muted">
      <span className="text-omega-text">{value}</span> {label}
    </span>
  );
}

/**
 * Delete icon
 */
function DeleteIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
