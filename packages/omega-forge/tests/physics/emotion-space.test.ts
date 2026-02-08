/**
 * OMEGA Forge — Emotion Space Tests
 * Phase C.5 — R14 vector operations, valence, arousal, dominance
 * 14 tests
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity14D,
  euclideanDistance14D,
  vadDistance,
  computeValence,
  computeArousal,
  dominantEmotion,
  isValidState,
  zeroState,
  singleEmotionState,
} from '../../src/physics/emotion-space.js';
import { makeState14D, makeOmega } from '../fixtures.js';

const EMOTION_14_KEYS = [
  'joy', 'trust', 'fear', 'surprise', 'sadness',
  'disgust', 'anger', 'anticipation', 'love', 'submission',
  'awe', 'disapproval', 'remorse', 'contempt',
] as const;

describe('emotion-space', () => {
  it('cosineSimilarity14D: identical vectors return 1', () => {
    const a = makeState14D('joy', 0.8);
    const result = cosineSimilarity14D(a, a);
    expect(result).toBeCloseTo(1, 10);
  });

  it('cosineSimilarity14D: orthogonal vectors return 0', () => {
    const a = makeState14D('joy', 1);
    const b = makeState14D('fear', 1);
    const result = cosineSimilarity14D(a, b);
    expect(result).toBeCloseTo(0, 10);
  });

  it('euclideanDistance14D: same vectors return 0', () => {
    const a = makeState14D('trust', 0.5);
    const result = euclideanDistance14D(a, a);
    expect(result).toBeCloseTo(0, 10);
  });

  it('euclideanDistance14D: computed distance is correct', () => {
    const a = makeState14D('joy', 1);
    const b = makeState14D('fear', 1);
    // a has joy=1 rest 0, b has fear=1 rest 0
    // distance = sqrt((1-0)^2 + (0-1)^2) = sqrt(2)
    const result = euclideanDistance14D(a, b);
    expect(result).toBeCloseTo(Math.sqrt(2), 10);
  });

  it('vadDistance: computes 3D distance', () => {
    const a = makeOmega(0, 0, 0);
    const b = makeOmega(3, 4, 0);
    const result = vadDistance(a, b);
    expect(result).toBeCloseTo(5, 10);
  });

  it('computeValence: positive for joy state', () => {
    const state = makeState14D('joy', 0.9);
    const valence = computeValence(state);
    expect(valence).toBeGreaterThan(0);
  });

  it('computeValence: negative for fear state', () => {
    const state = makeState14D('fear', 0.9);
    const valence = computeValence(state);
    expect(valence).toBeLessThan(0);
  });

  it('computeArousal: zero state returns 0', () => {
    const state = zeroState();
    const arousal = computeArousal(state);
    expect(arousal).toBeCloseTo(0, 10);
  });

  it('computeArousal: non-zero state returns positive', () => {
    const state = makeState14D('anger', 0.7);
    const arousal = computeArousal(state);
    expect(arousal).toBeGreaterThan(0);
  });

  it('dominantEmotion: returns the emotion with highest value', () => {
    const state = makeState14D('sadness', 0.9);
    const result = dominantEmotion(state);
    expect(result).toBe('sadness');
  });

  it('isValidState: valid state passes', () => {
    const state = makeState14D('joy', 0.5);
    expect(isValidState(state)).toBe(true);
  });

  it('isValidState: invalid state (>1) fails', () => {
    const raw: Record<string, number> = {};
    for (const key of EMOTION_14_KEYS) {
      raw[key] = key === 'joy' ? 1.5 : 0;
    }
    expect(isValidState(raw as any)).toBe(false);
  });

  it('zeroState: all values are 0', () => {
    const state = zeroState();
    for (const key of EMOTION_14_KEYS) {
      expect(state[key]).toBe(0);
    }
  });

  it('determinism: same inputs produce identical outputs', () => {
    const a = makeState14D('joy', 0.6);
    const b = makeState14D('fear', 0.4);
    const r1 = cosineSimilarity14D(a, b);
    const r2 = cosineSimilarity14D(a, b);
    expect(r1).toBe(r2);

    const d1 = euclideanDistance14D(a, b);
    const d2 = euclideanDistance14D(a, b);
    expect(d1).toBe(d2);

    const s1 = singleEmotionState('trust', 0.8);
    const s2 = singleEmotionState('trust', 0.8);
    for (const key of EMOTION_14_KEYS) {
      expect(s1[key]).toBe(s2[key]);
    }
  });
});
