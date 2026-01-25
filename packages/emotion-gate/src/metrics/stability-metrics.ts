/**
 * OMEGA Emotion Gate — Stability Metrics
 *
 * Passive measurement of emotional stability (no modification).
 */

import type {
  EmotionStateV2,
  EmotionFrame,
  EmotionSequence,
  StabilityMetrics,
} from '../gate/types.js';

/**
 * Compute continuity score (how smooth are transitions).
 */
export function computeContinuityScore(sequence: EmotionSequence): number {
  if (sequence.frames.length < 2) return 1;

  const dimensions: readonly (keyof EmotionStateV2)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  let totalDelta = 0;
  let transitionCount = 0;

  for (let i = 1; i < sequence.frames.length; i++) {
    for (const dim of dimensions) {
      const delta = Math.abs(
        sequence.frames[i].emotion_state[dim] - sequence.frames[i - 1].emotion_state[dim]
      );
      totalDelta += delta;
      transitionCount++;
    }
  }

  const avgDelta = totalDelta / transitionCount;
  // Higher avg delta = lower continuity
  return Math.max(0, 1 - avgDelta * 2);
}

/**
 * Compute smoothness score (absence of sudden changes).
 */
export function computeSmoothnessScore(sequence: EmotionSequence): number {
  if (sequence.frames.length < 3) return 1;

  const dimensions: readonly (keyof EmotionStateV2)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  let roughnessSum = 0;
  let count = 0;

  for (const dim of dimensions) {
    const values = sequence.frames.map(f => f.emotion_state[dim]);

    // Compute second derivative (acceleration)
    for (let i = 1; i < values.length - 1; i++) {
      const acceleration = values[i + 1] - 2 * values[i] + values[i - 1];
      roughnessSum += Math.abs(acceleration);
      count++;
    }
  }

  if (count === 0) return 1;
  const avgRoughness = roughnessSum / count;
  return Math.max(0, 1 - avgRoughness * 4);
}

/**
 * Compute predictability score (how well can next state be predicted).
 */
export function computePredictabilityScore(sequence: EmotionSequence): number {
  if (sequence.frames.length < 3) return 1;

  const dimensions: readonly (keyof EmotionStateV2)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  let predictionErrorSum = 0;
  let count = 0;

  for (const dim of dimensions) {
    const values = sequence.frames.map(f => f.emotion_state[dim]);

    // Simple linear prediction
    for (let i = 2; i < values.length; i++) {
      const predicted = values[i - 1] + (values[i - 1] - values[i - 2]);
      const actual = values[i];
      const error = Math.abs(predicted - actual);
      predictionErrorSum += error;
      count++;
    }
  }

  if (count === 0) return 1;
  const avgError = predictionErrorSum / count;
  return Math.max(0, 1 - avgError * 2);
}

/**
 * Count outliers in a sequence.
 */
export function countOutliers(sequence: EmotionSequence): number {
  if (sequence.frames.length < 3) return 0;

  const dimensions: readonly (keyof EmotionStateV2)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  let outlierCount = 0;

  for (const dim of dimensions) {
    const values = sequence.frames.map(f => f.emotion_state[dim]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Count values more than 2 std deviations from mean
    for (const v of values) {
      if (Math.abs(v - mean) > 2 * stdDev && stdDev > 0.05) {
        outlierCount++;
      }
    }
  }

  return outlierCount;
}

/**
 * Compute complete stability metrics for a sequence.
 */
export function computeStabilityMetrics(sequence: EmotionSequence): StabilityMetrics {
  return {
    continuity_score: computeContinuityScore(sequence),
    smoothness_score: computeSmoothnessScore(sequence),
    predictability_score: computePredictabilityScore(sequence),
    outlier_count: countOutliers(sequence),
  };
}

/**
 * Create perfect stability metrics (for single frames).
 */
export function createPerfectStability(): StabilityMetrics {
  return {
    continuity_score: 1,
    smoothness_score: 1,
    predictability_score: 1,
    outlier_count: 0,
  };
}

/**
 * Check if stability is acceptable based on thresholds.
 */
export function isStabilityAcceptable(
  metrics: StabilityMetrics,
  minContinuity: number = 0.5,
  minSmoothness: number = 0.5,
  maxOutliers: number = 3
): boolean {
  return (
    metrics.continuity_score >= minContinuity &&
    metrics.smoothness_score >= minSmoothness &&
    metrics.outlier_count <= maxOutliers
  );
}
