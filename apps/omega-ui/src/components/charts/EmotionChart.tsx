/**
 * Emotion Chart Component for OMEGA UI
 * @module components/charts/EmotionChart
 * @description Main chart component with switchable visualizations
 */

import { useState } from 'react';
import { EmotionBar } from './EmotionBar';
import { PlutchikWheel } from './PlutchikWheel';
import type { EmotionVector } from '../../core/types';

/**
 * Chart view type
 */
type ChartView = 'bar' | 'wheel';

/**
 * Emotion chart props
 */
interface EmotionChartProps {
  emotions: EmotionVector;
  defaultView?: ChartView;
  showViewToggle?: boolean;
  title?: string;
  height?: number;
}

/**
 * Main emotion chart component with view switching
 * @param props - Component properties
 * @returns Chart with view toggle
 */
export function EmotionChart({
  emotions,
  defaultView = 'bar',
  showViewToggle = true,
  title = 'Emotion Analysis',
  height = 320,
}: EmotionChartProps): JSX.Element {
  const [view, setView] = useState<ChartView>(defaultView);

  const hasData = Object.values(emotions).some((v) => v > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-omega-text">{title}</h3>
        {showViewToggle && (
          <div className="flex gap-1 bg-omega-surface rounded p-1">
            <ViewToggleButton
              active={view === 'bar'}
              onClick={() => setView('bar')}
              label="Bar"
              icon={<BarIcon />}
            />
            <ViewToggleButton
              active={view === 'wheel'}
              onClick={() => setView('wheel')}
              label="Wheel"
              icon={<WheelIcon />}
            />
          </div>
        )}
      </div>

      {/* Chart content */}
      <div
        className="flex items-center justify-center"
        style={{ minHeight: height }}
      >
        {!hasData ? (
          <EmptyState />
        ) : view === 'bar' ? (
          <div className="w-full">
            <EmotionBar
              emotions={emotions}
              height={height}
              showLabels={true}
              showValues={true}
              sortBy="value"
            />
          </div>
        ) : (
          <PlutchikWheel
            emotions={emotions}
            size={Math.min(height, 300)}
            showLabels={true}
            showValues={true}
          />
        )}
      </div>

      {/* Summary stats */}
      {hasData && <EmotionSummary emotions={emotions} />}
    </div>
  );
}

/**
 * View toggle button
 */
function ViewToggleButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: JSX.Element;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
        active
          ? 'bg-omega-primary text-white'
          : 'text-omega-muted hover:text-omega-text'
      }`}
      aria-label={`Switch to ${label} view`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * Empty state component
 */
function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-omega-muted">
      <svg
        className="w-12 h-12"
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
      <p className="text-sm">No emotion data to display</p>
      <p className="text-xs">Analyze text to see results</p>
    </div>
  );
}

/**
 * Emotion summary component
 */
function EmotionSummary({
  emotions,
}: {
  emotions: EmotionVector;
}): JSX.Element {
  const entries = Object.entries(emotions).filter(([, v]) => v > 0);
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const dominant = top3[0];

  return (
    <div className="flex items-center justify-between px-2 py-2 bg-omega-surface rounded text-xs">
      <div className="flex items-center gap-4">
        <span className="text-omega-muted">
          Dominant:{' '}
          <span className="text-omega-text capitalize font-medium">
            {dominant?.[0] || 'none'}
          </span>
        </span>
        <span className="text-omega-muted">
          Active emotions: <span className="text-omega-text">{entries.length}</span>
        </span>
      </div>
      <div className="flex gap-2">
        {top3.map(([emotion, value]) => (
          <span
            key={emotion}
            className="px-2 py-0.5 bg-omega-bg rounded capitalize"
          >
            {emotion}: {(value * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Bar chart icon
 */
function BarIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  );
}

/**
 * Wheel/pie icon
 */
function WheelIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-6a6 6 0 00-6 6h6V4z" />
    </svg>
  );
}
