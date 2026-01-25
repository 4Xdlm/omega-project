/**
 * OMEGA Emotion Gate — Drift Metrics
 *
 * Passive measurement of emotional drift (no modification).
 */

import type {
  EmotionStateV2,
  EmotionFrame,
  EmotionSequence,
  DriftVector,
  EmotionDelta,
  EMOTION_DIMENSIONS,
} from '../gate/types.js';

/**
 * Compute delta between two emotion values.
 */
export function computeEmotionDelta(
  dimension: keyof EmotionStateV2,
  from_value: number,
  to_value: number
): EmotionDelta {
  const delta = to_value - from_value;
  const relative_change = from_value === 0 ? (to_value === 0 ? 0 : 1) : Math.abs(delta / from_value);

  return {
    dimension,
    from_value,
    to_value,
    delta,
    relative_change,
  };
}

/**
 * Compute all deltas between two emotion states.
 */
export function computeAllDeltas(
  from_state: EmotionStateV2,
  to_state: EmotionStateV2
): readonly EmotionDelta[] {
  const dimensions: readonly (keyof EmotionStateV2)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  return dimensions.map(dim => computeEmotionDelta(dim, from_state[dim], to_state[dim]));
}

/**
 * Compute drift vector magnitude (Euclidean norm).
 */
export function computeMagnitude(deltas: readonly EmotionDelta[]): number {
  const sumSquares = deltas.reduce((sum, d) => sum + d.delta * d.delta, 0);
  return Math.sqrt(sumSquares);
}

/**
 * Compute direction vector (normalized).
 */
export function computeDirection(deltas: readonly EmotionDelta[]): readonly number[] {
  const magnitude = computeMagnitude(deltas);
  if (magnitude === 0) {
    return deltas.map(() => 0);
  }
  return deltas.map(d => d.delta / magnitude);
}

/**
 * Compute semantic delta (average absolute change).
 */
export function computeSemanticDelta(deltas: readonly EmotionDelta[]): number {
  if (deltas.length === 0) return 0;
  const sum = deltas.reduce((acc, d) => acc + Math.abs(d.delta), 0);
  return sum / deltas.length;
}

/**
 * Compute acceleration (change in drift magnitude).
 */
export function computeAcceleration(
  current_deltas: readonly EmotionDelta[],
  previous_deltas: readonly EmotionDelta[] | undefined
): number {
  if (!previous_deltas) return 0;

  const current_magnitude = computeMagnitude(current_deltas);
  const previous_magnitude = computeMagnitude(previous_deltas);

  return current_magnitude - previous_magnitude;
}

/**
 * Compute complete drift vector between two frames.
 */
export function computeDriftVector(
  from_frame: EmotionFrame | undefined,
  to_frame: EmotionFrame,
  previous_drift?: DriftVector
): DriftVector {
  if (!from_frame) {
    // First frame — no drift
    return createZeroDriftVector();
  }

  const deltas = computeAllDeltas(from_frame.emotion_state, to_frame.emotion_state);
  const magnitude = computeMagnitude(deltas);
  const direction = computeDirection(deltas);
  const semantic_delta = computeSemanticDelta(deltas);

  const acceleration = previous_drift
    ? magnitude - previous_drift.magnitude
    : 0;

  return {
    semantic_delta,
    emotional_deltas: deltas,
    direction,
    magnitude,
    acceleration,
  };
}

/**
 * Create a zero drift vector.
 */
export function createZeroDriftVector(): DriftVector {
  const zeroDimensions: readonly (keyof EmotionStateV2)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  return {
    semantic_delta: 0,
    emotional_deltas: zeroDimensions.map(dim => ({
      dimension: dim,
      from_value: 0,
      to_value: 0,
      delta: 0,
      relative_change: 0,
    })),
    direction: zeroDimensions.map(() => 0),
    magnitude: 0,
    acceleration: 0,
  };
}

/**
 * Compute average drift over a sequence.
 */
export function computeAverageDrift(sequence: EmotionSequence): number {
  if (sequence.frames.length < 2) return 0;

  let totalMagnitude = 0;
  for (let i = 1; i < sequence.frames.length; i++) {
    const drift = computeDriftVector(sequence.frames[i - 1], sequence.frames[i]);
    totalMagnitude += drift.magnitude;
  }

  return totalMagnitude / (sequence.frames.length - 1);
}

/**
 * Find maximum drift in a sequence.
 */
export function findMaxDrift(sequence: EmotionSequence): DriftVector {
  if (sequence.frames.length < 2) return createZeroDriftVector();

  let maxDrift = createZeroDriftVector();
  for (let i = 1; i < sequence.frames.length; i++) {
    const drift = computeDriftVector(sequence.frames[i - 1], sequence.frames[i]);
    if (drift.magnitude > maxDrift.magnitude) {
      maxDrift = drift;
    }
  }

  return maxDrift;
}
