/**
 * OMEGA Emotion Gate — Stability Metrics Tests
 *
 * Tests for stability measurement utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  computeContinuityScore,
  computeSmoothnessScore,
  computePredictabilityScore,
  countOutliers,
  computeStabilityMetrics,
  createPerfectStability,
  isStabilityAcceptable,
} from '../../src/metrics/stability-metrics.js';
import {
  NEUTRAL_EMOTION,
  HAPPY_EMOTION,
  ANGRY_EMOTION,
  createStableSequence,
  createOscillatingSequence,
  createTransitionSequence,
} from '../helpers/test-fixtures.js';

describe('computeContinuityScore', () => {
  it('should return 1 for single frame', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 1);
    expect(computeContinuityScore(sequence)).toBe(1);
  });

  it('should return high score for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.01);
    const score = computeContinuityScore(sequence);

    expect(score).toBeGreaterThan(0.9);
  });

  it('should return lower score for oscillating sequence', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 10);
    const score = computeContinuityScore(sequence);

    expect(score).toBeLessThan(0.5);
  });

  it('should return moderate score for smooth transition', () => {
    const sequence = createTransitionSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 10);
    const score = computeContinuityScore(sequence);

    expect(score).toBeGreaterThan(0.5);
  });
});

describe('computeSmoothnessScore', () => {
  it('should return 1 for short sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 2);
    expect(computeSmoothnessScore(sequence)).toBe(1);
  });

  it('should return high score for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.01);
    const score = computeSmoothnessScore(sequence);

    expect(score).toBeGreaterThan(0.8);
  });

  it('should return lower score for oscillating sequence', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, ANGRY_EMOTION, 10);
    const score = computeSmoothnessScore(sequence);

    expect(score).toBeLessThan(0.5);
  });

  it('should return high score for linear transition', () => {
    const sequence = createTransitionSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 20);
    const score = computeSmoothnessScore(sequence);

    // Linear transitions should be smooth
    expect(score).toBeGreaterThan(0.5);
  });
});

describe('computePredictabilityScore', () => {
  it('should return 1 for short sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 2);
    expect(computePredictabilityScore(sequence)).toBe(1);
  });

  it('should return high score for constant sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.001);
    const score = computePredictabilityScore(sequence);

    expect(score).toBeGreaterThan(0.9);
  });

  it('should return lower score for unpredictable sequence', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, ANGRY_EMOTION, 10);
    const score = computePredictabilityScore(sequence);

    expect(score).toBeLessThan(0.5);
  });

  it('should handle linear transitions well', () => {
    const sequence = createTransitionSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 10);
    const score = computePredictabilityScore(sequence);

    expect(score).toBeGreaterThan(0.5);
  });
});

describe('countOutliers', () => {
  it('should return 0 for short sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 2);
    expect(countOutliers(sequence)).toBe(0);
  });

  it('should return 0 for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.01);
    const count = countOutliers(sequence);

    expect(count).toBe(0);
  });

  it('should detect outliers in sequence with spikes', () => {
    // Create sequence with outlier
    const stable = createStableSequence(NEUTRAL_EMOTION, 9, 0.01);
    // Modify middle frame to be an outlier
    const frames = [...stable.frames];
    // This creates significant variance
    const sequence = {
      ...stable,
      frames: [
        ...frames.slice(0, 4),
        { ...frames[4], emotion_state: ANGRY_EMOTION },
        ...frames.slice(5),
      ],
    };

    const count = countOutliers(sequence);
    expect(count).toBeGreaterThan(0);
  });
});

describe('computeStabilityMetrics', () => {
  it('should compute all metrics', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10);
    const metrics = computeStabilityMetrics(sequence);

    expect(metrics.continuity_score).toBeDefined();
    expect(metrics.smoothness_score).toBeDefined();
    expect(metrics.predictability_score).toBeDefined();
    expect(metrics.outlier_count).toBeDefined();
  });

  it('should return high scores for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.01);
    const metrics = computeStabilityMetrics(sequence);

    expect(metrics.continuity_score).toBeGreaterThan(0.8);
    expect(metrics.smoothness_score).toBeGreaterThan(0.8);
    expect(metrics.outlier_count).toBe(0);
  });

  it('should return lower scores for unstable sequence', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, ANGRY_EMOTION, 10);
    const metrics = computeStabilityMetrics(sequence);

    expect(metrics.continuity_score).toBeLessThan(0.5);
    expect(metrics.smoothness_score).toBeLessThan(0.5);
  });
});

describe('createPerfectStability', () => {
  it('should return perfect metrics', () => {
    const metrics = createPerfectStability();

    expect(metrics.continuity_score).toBe(1);
    expect(metrics.smoothness_score).toBe(1);
    expect(metrics.predictability_score).toBe(1);
    expect(metrics.outlier_count).toBe(0);
  });
});

describe('isStabilityAcceptable', () => {
  it('should accept perfect stability', () => {
    const metrics = createPerfectStability();
    expect(isStabilityAcceptable(metrics)).toBe(true);
  });

  it('should accept high stability', () => {
    const metrics = {
      continuity_score: 0.8,
      smoothness_score: 0.8,
      predictability_score: 0.8,
      outlier_count: 1,
    };
    expect(isStabilityAcceptable(metrics)).toBe(true);
  });

  it('should reject low continuity', () => {
    const metrics = {
      continuity_score: 0.3,
      smoothness_score: 0.8,
      predictability_score: 0.8,
      outlier_count: 0,
    };
    expect(isStabilityAcceptable(metrics)).toBe(false);
  });

  it('should reject low smoothness', () => {
    const metrics = {
      continuity_score: 0.8,
      smoothness_score: 0.3,
      predictability_score: 0.8,
      outlier_count: 0,
    };
    expect(isStabilityAcceptable(metrics)).toBe(false);
  });

  it('should reject too many outliers', () => {
    const metrics = {
      continuity_score: 0.8,
      smoothness_score: 0.8,
      predictability_score: 0.8,
      outlier_count: 5,
    };
    expect(isStabilityAcceptable(metrics)).toBe(false);
  });

  it('should use custom thresholds', () => {
    const metrics = {
      continuity_score: 0.3,
      smoothness_score: 0.3,
      predictability_score: 0.3,
      outlier_count: 10,
    };

    // With lenient thresholds
    expect(isStabilityAcceptable(metrics, 0.2, 0.2, 20)).toBe(true);
  });
});
