/**
 * OMEGA Emotion Gate — Drift Metrics Tests
 *
 * Tests for drift measurement utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  computeEmotionDelta,
  computeAllDeltas,
  computeMagnitude,
  computeDirection,
  computeSemanticDelta,
  computeDriftVector,
  createZeroDriftVector,
  computeAverageDrift,
  findMaxDrift,
} from '../../src/metrics/drift-metrics.js';
import {
  NEUTRAL_EMOTION,
  HAPPY_EMOTION,
  SAD_EMOTION,
  ZERO_EMOTION,
  MAX_EMOTION,
  createTestFrame,
  createStableSequence,
  createTransitionSequence,
} from '../helpers/test-fixtures.js';
import { EMOTION_DIMENSIONS } from '../../src/gate/types.js';

describe('computeEmotionDelta', () => {
  it('should compute correct delta for positive change', () => {
    const delta = computeEmotionDelta('joy', 0.3, 0.7);
    expect(delta.dimension).toBe('joy');
    expect(delta.from_value).toBe(0.3);
    expect(delta.to_value).toBe(0.7);
    expect(delta.delta).toBeCloseTo(0.4);
  });

  it('should compute correct delta for negative change', () => {
    const delta = computeEmotionDelta('sadness', 0.8, 0.2);
    expect(delta.delta).toBeCloseTo(-0.6);
  });

  it('should compute zero delta for no change', () => {
    const delta = computeEmotionDelta('trust', 0.5, 0.5);
    expect(delta.delta).toBe(0);
  });

  it('should compute relative change correctly', () => {
    const delta = computeEmotionDelta('fear', 0.5, 0.75);
    expect(delta.relative_change).toBeCloseTo(0.5); // 0.25 / 0.5 = 0.5
  });

  it('should handle zero from_value', () => {
    const delta = computeEmotionDelta('anger', 0, 0.5);
    expect(delta.relative_change).toBe(1);
  });

  it('should handle both zero values', () => {
    const delta = computeEmotionDelta('contempt', 0, 0);
    expect(delta.relative_change).toBe(0);
  });
});

describe('computeAllDeltas', () => {
  it('should compute deltas for all 14 dimensions', () => {
    const deltas = computeAllDeltas(NEUTRAL_EMOTION, HAPPY_EMOTION);
    expect(deltas).toHaveLength(14);
  });

  it('should compute zero deltas for identical states', () => {
    const deltas = computeAllDeltas(NEUTRAL_EMOTION, NEUTRAL_EMOTION);
    for (const delta of deltas) {
      expect(delta.delta).toBe(0);
    }
  });

  it('should have correct dimension names', () => {
    const deltas = computeAllDeltas(ZERO_EMOTION, MAX_EMOTION);
    const dimensions = deltas.map(d => d.dimension);
    for (const dim of EMOTION_DIMENSIONS) {
      expect(dimensions).toContain(dim);
    }
  });

  it('should compute max deltas between ZERO and MAX', () => {
    const deltas = computeAllDeltas(ZERO_EMOTION, MAX_EMOTION);
    for (const delta of deltas) {
      expect(delta.delta).toBe(1);
      expect(delta.from_value).toBe(0);
      expect(delta.to_value).toBe(1);
    }
  });
});

describe('computeMagnitude', () => {
  it('should compute zero magnitude for no change', () => {
    const deltas = computeAllDeltas(NEUTRAL_EMOTION, NEUTRAL_EMOTION);
    expect(computeMagnitude(deltas)).toBe(0);
  });

  it('should compute positive magnitude for changes', () => {
    const deltas = computeAllDeltas(NEUTRAL_EMOTION, HAPPY_EMOTION);
    expect(computeMagnitude(deltas)).toBeGreaterThan(0);
  });

  it('should compute correct Euclidean norm', () => {
    const simpleDeltas = [
      { dimension: 'joy' as const, from_value: 0, to_value: 3, delta: 3, relative_change: 1 },
      { dimension: 'trust' as const, from_value: 0, to_value: 4, delta: 4, relative_change: 1 },
    ];
    expect(computeMagnitude(simpleDeltas)).toBe(5); // sqrt(9 + 16) = 5
  });

  it('should compute max magnitude for ZERO to MAX', () => {
    const deltas = computeAllDeltas(ZERO_EMOTION, MAX_EMOTION);
    const magnitude = computeMagnitude(deltas);
    // sqrt(14 * 1^2) = sqrt(14) ≈ 3.74
    expect(magnitude).toBeCloseTo(Math.sqrt(14));
  });
});

describe('computeDirection', () => {
  it('should return zero vector for no change', () => {
    const deltas = computeAllDeltas(NEUTRAL_EMOTION, NEUTRAL_EMOTION);
    const direction = computeDirection(deltas);
    expect(direction.every(d => d === 0)).toBe(true);
  });

  it('should return normalized vector', () => {
    const deltas = computeAllDeltas(NEUTRAL_EMOTION, HAPPY_EMOTION);
    const direction = computeDirection(deltas);

    // Magnitude of direction vector should be 1 (normalized)
    const magnitudeSquared = direction.reduce((sum, d) => sum + d * d, 0);
    expect(magnitudeSquared).toBeCloseTo(1);
  });

  it('should have same length as dimensions', () => {
    const deltas = computeAllDeltas(ZERO_EMOTION, MAX_EMOTION);
    const direction = computeDirection(deltas);
    expect(direction).toHaveLength(14);
  });
});

describe('computeSemanticDelta', () => {
  it('should return zero for no change', () => {
    const deltas = computeAllDeltas(NEUTRAL_EMOTION, NEUTRAL_EMOTION);
    expect(computeSemanticDelta(deltas)).toBe(0);
  });

  it('should return positive value for changes', () => {
    const deltas = computeAllDeltas(NEUTRAL_EMOTION, HAPPY_EMOTION);
    expect(computeSemanticDelta(deltas)).toBeGreaterThan(0);
  });

  it('should return average absolute delta', () => {
    const simpleDeltas = [
      { dimension: 'joy' as const, from_value: 0, to_value: 0.2, delta: 0.2, relative_change: 1 },
      { dimension: 'trust' as const, from_value: 0, to_value: -0.2, delta: -0.2, relative_change: 1 },
    ];
    expect(computeSemanticDelta(simpleDeltas)).toBe(0.2);
  });
});

describe('computeDriftVector', () => {
  it('should return zero drift for first frame', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const drift = computeDriftVector(undefined, frame);

    expect(drift.magnitude).toBe(0);
    expect(drift.semantic_delta).toBe(0);
    expect(drift.acceleration).toBe(0);
  });

  it('should compute drift between frames', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(HAPPY_EMOTION);
    const drift = computeDriftVector(frame1, frame2);

    expect(drift.magnitude).toBeGreaterThan(0);
    expect(drift.emotional_deltas).toHaveLength(14);
    expect(drift.direction).toHaveLength(14);
  });

  it('should compute zero drift for identical frames', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(NEUTRAL_EMOTION);
    const drift = computeDriftVector(frame1, frame2);

    expect(drift.magnitude).toBe(0);
    expect(drift.semantic_delta).toBe(0);
  });

  it('should compute acceleration with previous drift', () => {
    const frame1 = createTestFrame(NEUTRAL_EMOTION);
    const frame2 = createTestFrame(HAPPY_EMOTION);
    const drift1 = computeDriftVector(frame1, frame2);

    const frame3 = createTestFrame(SAD_EMOTION);
    const drift2 = computeDriftVector(frame2, frame3, drift1);

    // Acceleration is difference in magnitudes
    expect(drift2.acceleration).toBe(drift2.magnitude - drift1.magnitude);
  });
});

describe('createZeroDriftVector', () => {
  it('should have zero magnitude', () => {
    const drift = createZeroDriftVector();
    expect(drift.magnitude).toBe(0);
  });

  it('should have zero semantic delta', () => {
    const drift = createZeroDriftVector();
    expect(drift.semantic_delta).toBe(0);
  });

  it('should have zero acceleration', () => {
    const drift = createZeroDriftVector();
    expect(drift.acceleration).toBe(0);
  });

  it('should have 14 emotional deltas', () => {
    const drift = createZeroDriftVector();
    expect(drift.emotional_deltas).toHaveLength(14);
  });

  it('should have all zero deltas', () => {
    const drift = createZeroDriftVector();
    for (const delta of drift.emotional_deltas) {
      expect(delta.delta).toBe(0);
    }
  });
});

describe('computeAverageDrift', () => {
  it('should return zero for single frame', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 1);
    expect(computeAverageDrift(sequence)).toBe(0);
  });

  it('should return small drift for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.001);
    const avg = computeAverageDrift(sequence);
    expect(avg).toBeLessThan(0.01);
  });

  it('should return larger drift for transition', () => {
    const sequence = createTransitionSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 5);
    const avg = computeAverageDrift(sequence);
    expect(avg).toBeGreaterThan(0);
  });
});

describe('findMaxDrift', () => {
  it('should return zero drift for single frame', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 1);
    const maxDrift = findMaxDrift(sequence);
    expect(maxDrift.magnitude).toBe(0);
  });

  it('should find maximum drift in sequence', () => {
    const sequence = createTransitionSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 5);
    const maxDrift = findMaxDrift(sequence);
    expect(maxDrift.magnitude).toBeGreaterThan(0);
  });

  it('should return positive magnitude', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10);
    const maxDrift = findMaxDrift(sequence);
    expect(maxDrift.magnitude).toBeGreaterThanOrEqual(0);
  });
});
