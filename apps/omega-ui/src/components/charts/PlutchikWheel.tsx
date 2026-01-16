/**
 * Plutchik Wheel Component for OMEGA UI
 * @module components/charts/PlutchikWheel
 * @description Circular emotion wheel visualization based on Plutchik's model
 */

import { useMemo } from 'react';
import type { EmotionVector } from '../../core/types';

/**
 * Plutchik wheel segment configuration
 * Arranged in pairs of opposites around the wheel
 */
const WHEEL_SEGMENTS = [
  { emotion: 'joy', angle: 0, color: '#FFD700', opposite: 'sadness' },
  { emotion: 'trust', angle: 45, color: '#00CED1', opposite: 'disgust' },
  { emotion: 'fear', angle: 90, color: '#800080', opposite: 'anger' },
  { emotion: 'surprise', angle: 135, color: '#FF8C00', opposite: 'anticipation' },
  { emotion: 'sadness', angle: 180, color: '#4169E1', opposite: 'joy' },
  { emotion: 'disgust', angle: 225, color: '#228B22', opposite: 'trust' },
  { emotion: 'anger', angle: 270, color: '#DC143C', opposite: 'fear' },
  { emotion: 'anticipation', angle: 315, color: '#FF69B4', opposite: 'surprise' },
];

/**
 * Plutchik wheel props
 */
interface PlutchikWheelProps {
  emotions: EmotionVector;
  size?: number;
  showLabels?: boolean;
  showValues?: boolean;
  interactive?: boolean;
  onSegmentClick?: (emotion: string) => void;
}

/**
 * Calculate SVG path for a wheel segment
 */
function createSegmentPath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const startRad = (startAngle - 90) * (Math.PI / 180);
  const endRad = (endAngle - 90) * (Math.PI / 180);

  const x1 = centerX + innerRadius * Math.cos(startRad);
  const y1 = centerY + innerRadius * Math.sin(startRad);
  const x2 = centerX + outerRadius * Math.cos(startRad);
  const y2 = centerY + outerRadius * Math.sin(startRad);
  const x3 = centerX + outerRadius * Math.cos(endRad);
  const y3 = centerY + outerRadius * Math.sin(endRad);
  const x4 = centerX + innerRadius * Math.cos(endRad);
  const y4 = centerY + innerRadius * Math.sin(endRad);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1} Z`;
}

/**
 * Calculate label position
 */
function getLabelPosition(
  centerX: number,
  centerY: number,
  radius: number,
  angle: number
): { x: number; y: number } {
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(rad),
    y: centerY + radius * Math.sin(rad),
  };
}

/**
 * Plutchik emotion wheel component
 * @param props - Component properties
 * @returns SVG wheel visualization
 */
export function PlutchikWheel({
  emotions,
  size = 300,
  showLabels = true,
  showValues = false,
  interactive = true,
  onSegmentClick,
}: PlutchikWheelProps): JSX.Element {
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - 20;
  const minRadius = maxRadius * 0.3;

  const segments = useMemo(() => {
    return WHEEL_SEGMENTS.map((segment, index) => {
      const value = emotions[segment.emotion] || 0;
      const startAngle = segment.angle - 22.5;
      const endAngle = segment.angle + 22.5;
      const intensity = Math.min(value, 1);
      const outerRadius = minRadius + (maxRadius - minRadius) * intensity;

      return {
        ...segment,
        value,
        startAngle,
        endAngle,
        outerRadius,
        path: createSegmentPath(
          centerX,
          centerY,
          minRadius,
          outerRadius,
          startAngle,
          endAngle
        ),
        labelPos: getLabelPosition(
          centerX,
          centerY,
          maxRadius + 15,
          segment.angle
        ),
      };
    });
  }, [emotions, centerX, centerY, maxRadius, minRadius]);

  const handleSegmentClick = (emotion: string) => {
    if (interactive && onSegmentClick) {
      onSegmentClick(emotion);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={maxRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-omega-border"
        />

        {/* Emotion segments */}
        {segments.map((segment) => (
          <g key={segment.emotion}>
            <path
              d={segment.path}
              fill={segment.color}
              fillOpacity={0.7 + segment.value * 0.3}
              stroke="currentColor"
              strokeWidth="1"
              className={`text-omega-bg ${interactive ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              onClick={() => handleSegmentClick(segment.emotion)}
            />
            {showLabels && (
              <text
                x={segment.labelPos.x}
                y={segment.labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] fill-omega-text capitalize"
              >
                {segment.emotion}
                {showValues && ` (${(segment.value * 100).toFixed(0)}%)`}
              </text>
            )}
          </g>
        ))}

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={minRadius}
          fill="currentColor"
          className="text-omega-bg"
        />
      </svg>

      {/* Legend for secondary emotions */}
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        {['love', 'guilt', 'shame', 'pride', 'envy', 'contempt'].map((emotion) => {
          const value = emotions[emotion] || 0;
          if (value < 0.01) return null;
          return (
            <span
              key={emotion}
              className="px-2 py-1 bg-omega-surface rounded text-omega-muted"
            >
              {emotion}: {(value * 100).toFixed(0)}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Get wheel segment configuration
 */
export function getWheelSegments() {
  return WHEEL_SEGMENTS;
}
