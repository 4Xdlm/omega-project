/**
 * OMEGA Emotion Gate — Types Tests
 *
 * Tests for core types and calibration.
 */

import { describe, it, expect } from 'vitest';
import {
  EMOTION_DIMENSIONS,
  DEFAULT_EMOTION_CALIBRATION,
  OMEGA_EMO_STABILITY_THRESHOLD,
  OMEGA_EMO_DELTA_MAX,
  OMEGA_EMO_AMPLIFICATION_CYCLES,
  OMEGA_EMO_TOXICITY_THRESHOLD,
  OMEGA_EMO_DRIFT_THRESHOLD,
  OMEGA_EMO_CAUSALITY_WINDOW,
  OMEGA_EMO_COHERENCE_RADIUS,
  OMEGA_EMO_NEGLIGIBLE_DELTA,
} from '../../src/gate/types.js';
import {
  NEUTRAL_EMOTION,
  HAPPY_EMOTION,
  SAD_EMOTION,
  ANGRY_EMOTION,
  ZERO_EMOTION,
  MAX_EMOTION,
} from '../helpers/test-fixtures.js';

describe('EMOTION_DIMENSIONS', () => {
  it('should have exactly 14 dimensions', () => {
    expect(EMOTION_DIMENSIONS).toHaveLength(14);
  });

  it('should contain all Plutchik base emotions', () => {
    const base = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'];
    for (const emotion of base) {
      expect(EMOTION_DIMENSIONS).toContain(emotion);
    }
  });

  it('should contain compound emotions', () => {
    const compounds = ['love', 'submission', 'awe', 'disapproval', 'remorse', 'contempt'];
    for (const emotion of compounds) {
      expect(EMOTION_DIMENSIONS).toContain(emotion);
    }
  });

  it('should be immutable (readonly)', () => {
    // TypeScript enforces readonly at compile time
    // Runtime check: Object.freeze prevents mutation
    const originalLength = EMOTION_DIMENSIONS.length;
    expect(Object.isFrozen(EMOTION_DIMENSIONS)).toBe(true);
    expect(EMOTION_DIMENSIONS.length).toBe(originalLength);
  });
});

describe('Calibration Symbols', () => {
  it('should have unique symbol for stability threshold', () => {
    expect(typeof OMEGA_EMO_STABILITY_THRESHOLD).toBe('symbol');
    expect(OMEGA_EMO_STABILITY_THRESHOLD.description).toBe('OMEGA_EMO_STABILITY_THRESHOLD');
  });

  it('should have unique symbol for delta max', () => {
    expect(typeof OMEGA_EMO_DELTA_MAX).toBe('symbol');
    expect(OMEGA_EMO_DELTA_MAX.description).toBe('OMEGA_EMO_DELTA_MAX');
  });

  it('should have unique symbol for amplification cycles', () => {
    expect(typeof OMEGA_EMO_AMPLIFICATION_CYCLES).toBe('symbol');
    expect(OMEGA_EMO_AMPLIFICATION_CYCLES.description).toBe('OMEGA_EMO_AMPLIFICATION_CYCLES');
  });

  it('should have unique symbol for toxicity threshold', () => {
    expect(typeof OMEGA_EMO_TOXICITY_THRESHOLD).toBe('symbol');
    expect(OMEGA_EMO_TOXICITY_THRESHOLD.description).toBe('OMEGA_EMO_TOXICITY_THRESHOLD');
  });

  it('should have unique symbol for drift threshold', () => {
    expect(typeof OMEGA_EMO_DRIFT_THRESHOLD).toBe('symbol');
    expect(OMEGA_EMO_DRIFT_THRESHOLD.description).toBe('OMEGA_EMO_DRIFT_THRESHOLD');
  });

  it('should have unique symbol for causality window', () => {
    expect(typeof OMEGA_EMO_CAUSALITY_WINDOW).toBe('symbol');
    expect(OMEGA_EMO_CAUSALITY_WINDOW.description).toBe('OMEGA_EMO_CAUSALITY_WINDOW');
  });

  it('should have unique symbol for coherence radius', () => {
    expect(typeof OMEGA_EMO_COHERENCE_RADIUS).toBe('symbol');
    expect(OMEGA_EMO_COHERENCE_RADIUS.description).toBe('OMEGA_EMO_COHERENCE_RADIUS');
  });

  it('should have unique symbol for negligible delta', () => {
    expect(typeof OMEGA_EMO_NEGLIGIBLE_DELTA).toBe('symbol');
    expect(OMEGA_EMO_NEGLIGIBLE_DELTA.description).toBe('OMEGA_EMO_NEGLIGIBLE_DELTA');
  });

  it('symbols should be globally retrievable', () => {
    expect(Symbol.for('OMEGA_EMO_STABILITY_THRESHOLD')).toBe(OMEGA_EMO_STABILITY_THRESHOLD);
    expect(Symbol.for('OMEGA_EMO_DELTA_MAX')).toBe(OMEGA_EMO_DELTA_MAX);
    expect(Symbol.for('OMEGA_EMO_AMPLIFICATION_CYCLES')).toBe(OMEGA_EMO_AMPLIFICATION_CYCLES);
  });
});

describe('DEFAULT_EMOTION_CALIBRATION', () => {
  it('should have all calibration values', () => {
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_STABILITY_THRESHOLD]).toBeDefined();
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_DELTA_MAX]).toBeDefined();
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_AMPLIFICATION_CYCLES]).toBeDefined();
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_TOXICITY_THRESHOLD]).toBeDefined();
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_DRIFT_THRESHOLD]).toBeDefined();
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_CAUSALITY_WINDOW]).toBeDefined();
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_COHERENCE_RADIUS]).toBeDefined();
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_NEGLIGIBLE_DELTA]).toBeDefined();
  });

  it('should have reasonable default values', () => {
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_STABILITY_THRESHOLD]).toBe(0.2);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_DELTA_MAX]).toBe(0.4);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_AMPLIFICATION_CYCLES]).toBe(3);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_TOXICITY_THRESHOLD]).toBe(0.6);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_DRIFT_THRESHOLD]).toBe(0.3);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_CAUSALITY_WINDOW]).toBe(5);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_COHERENCE_RADIUS]).toBe(2);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_NEGLIGIBLE_DELTA]).toBe(0.05);
  });

  it('should have thresholds in valid ranges', () => {
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_STABILITY_THRESHOLD]).toBeGreaterThan(0);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_STABILITY_THRESHOLD]).toBeLessThanOrEqual(1);

    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_DELTA_MAX]).toBeGreaterThan(0);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_DELTA_MAX]).toBeLessThanOrEqual(1);

    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_AMPLIFICATION_CYCLES]).toBeGreaterThan(0);
    expect(DEFAULT_EMOTION_CALIBRATION[OMEGA_EMO_AMPLIFICATION_CYCLES]).toBeLessThanOrEqual(10);
  });
});

describe('EmotionStateV2 fixtures', () => {
  it('NEUTRAL_EMOTION should have all dimensions at 0.5', () => {
    for (const dim of EMOTION_DIMENSIONS) {
      expect(NEUTRAL_EMOTION[dim]).toBe(0.5);
    }
  });

  it('ZERO_EMOTION should have all dimensions at 0', () => {
    for (const dim of EMOTION_DIMENSIONS) {
      expect(ZERO_EMOTION[dim]).toBe(0);
    }
  });

  it('MAX_EMOTION should have all dimensions at 1', () => {
    for (const dim of EMOTION_DIMENSIONS) {
      expect(MAX_EMOTION[dim]).toBe(1);
    }
  });

  it('HAPPY_EMOTION should have high joy', () => {
    expect(HAPPY_EMOTION.joy).toBeGreaterThan(0.7);
    expect(HAPPY_EMOTION.sadness).toBeLessThan(0.3);
    expect(HAPPY_EMOTION.anger).toBeLessThan(0.3);
  });

  it('SAD_EMOTION should have high sadness', () => {
    expect(SAD_EMOTION.sadness).toBeGreaterThan(0.7);
    expect(SAD_EMOTION.joy).toBeLessThan(0.3);
  });

  it('ANGRY_EMOTION should have high anger', () => {
    expect(ANGRY_EMOTION.anger).toBeGreaterThan(0.7);
    expect(ANGRY_EMOTION.joy).toBeLessThan(0.3);
    expect(ANGRY_EMOTION.trust).toBeLessThan(0.3);
  });

  it('all fixture states should have 14 dimensions', () => {
    const fixtures = [NEUTRAL_EMOTION, HAPPY_EMOTION, SAD_EMOTION, ANGRY_EMOTION, ZERO_EMOTION, MAX_EMOTION];
    for (const state of fixtures) {
      expect(Object.keys(state)).toHaveLength(14);
    }
  });

  it('all fixture values should be in [0, 1]', () => {
    const fixtures = [NEUTRAL_EMOTION, HAPPY_EMOTION, SAD_EMOTION, ANGRY_EMOTION, ZERO_EMOTION, MAX_EMOTION];
    for (const state of fixtures) {
      for (const dim of EMOTION_DIMENSIONS) {
        expect(state[dim]).toBeGreaterThanOrEqual(0);
        expect(state[dim]).toBeLessThanOrEqual(1);
      }
    }
  });
});
