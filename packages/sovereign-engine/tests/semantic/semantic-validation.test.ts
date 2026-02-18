/**
 * ART-09 — Semantic Validation Tests
 * VAL14D-01 to VAL14D-06 + PLUTCHIK-01 to PLUTCHIK-03
 *
 * Tests for validate14D() combined validation+clamping function
 * and PLUTCHIK_DIMENSIONS canonical const array.
 */
import { describe, it, expect } from 'vitest';
import { validate14D, validateEmotionKeys, clampEmotionValues } from '../../src/semantic/semantic-validation.js';
import { PLUTCHIK_DIMENSIONS } from '../../src/semantic/types.js';
import type { SemanticEmotionResult } from '../../src/semantic/types.js';

describe('PLUTCHIK_DIMENSIONS (ART-SEM-01)', () => {

  it('PLUTCHIK-01: contains exactly 14 dimensions', () => {
    expect(PLUTCHIK_DIMENSIONS).toHaveLength(14);
  });

  it('PLUTCHIK-02: contains all expected Plutchik emotion names', () => {
    const expected = [
      'joy', 'trust', 'fear', 'surprise', 'sadness',
      'disgust', 'anger', 'anticipation', 'love', 'submission',
      'awe', 'disapproval', 'remorse', 'contempt',
    ];
    for (const dim of expected) {
      expect(PLUTCHIK_DIMENSIONS).toContain(dim);
    }
  });

  it('PLUTCHIK-03: no duplicates', () => {
    const unique = new Set(PLUTCHIK_DIMENSIONS);
    expect(unique.size).toBe(PLUTCHIK_DIMENSIONS.length);
  });
});

describe('validate14D (ART-SEM-01)', () => {

  it('VAL14D-01: valid input returns SemanticEmotionResult', () => {
    const input = {
      joy: 0.5, trust: 0.4, fear: 0.3, surprise: 0.2,
      sadness: 0.1, disgust: 0.05, anger: 0.15, anticipation: 0.25,
      love: 0.35, submission: 0.45, awe: 0.55, disapproval: 0.65,
      remorse: 0.75, contempt: 0.85,
    };

    const result = validate14D(input);
    expect(result).not.toBeNull();
    expect(result!.joy).toBe(0.5);
    expect(result!.contempt).toBe(0.85);
  });

  it('VAL14D-02: missing keys returns null', () => {
    const input = { joy: 0.5, trust: 0.4 }; // missing 12 keys
    const result = validate14D(input);
    expect(result).toBeNull();
  });

  it('VAL14D-03: non-object returns null', () => {
    expect(validate14D(null)).toBeNull();
    expect(validate14D(undefined)).toBeNull();
    expect(validate14D('string')).toBeNull();
    expect(validate14D(42)).toBeNull();
  });

  it('VAL14D-04: NaN value returns null', () => {
    const input = {
      joy: NaN, trust: 0.4, fear: 0.3, surprise: 0.2,
      sadness: 0.1, disgust: 0.05, anger: 0.15, anticipation: 0.25,
      love: 0.35, submission: 0.45, awe: 0.55, disapproval: 0.65,
      remorse: 0.75, contempt: 0.85,
    };
    expect(validate14D(input)).toBeNull();
  });

  it('VAL14D-05: Infinity value returns null', () => {
    const input = {
      joy: Infinity, trust: 0.4, fear: 0.3, surprise: 0.2,
      sadness: 0.1, disgust: 0.05, anger: 0.15, anticipation: 0.25,
      love: 0.35, submission: 0.45, awe: 0.55, disapproval: 0.65,
      remorse: 0.75, contempt: 0.85,
    };
    expect(validate14D(input)).toBeNull();
  });

  it('VAL14D-06: clamps out-of-range values to [0, 1]', () => {
    const input = {
      joy: 1.5, trust: -0.3, fear: 0.3, surprise: 0.2,
      sadness: 0.1, disgust: 0.05, anger: 0.15, anticipation: 0.25,
      love: 0.35, submission: 0.45, awe: 0.55, disapproval: 0.65,
      remorse: 0.75, contempt: 2.0,
    };

    const result = validate14D(input);
    expect(result).not.toBeNull();
    expect(result!.joy).toBe(1.0);      // clamped from 1.5
    expect(result!.trust).toBe(0.0);    // clamped from -0.3
    expect(result!.contempt).toBe(1.0); // clamped from 2.0
    expect(result!.fear).toBe(0.3);     // unchanged
  });

  it('VAL14D-07: non-number value returns null', () => {
    const input = {
      joy: 'high', trust: 0.4, fear: 0.3, surprise: 0.2,
      sadness: 0.1, disgust: 0.05, anger: 0.15, anticipation: 0.25,
      love: 0.35, submission: 0.45, awe: 0.55, disapproval: 0.65,
      remorse: 0.75, contempt: 0.85,
    };
    expect(validate14D(input)).toBeNull();
  });

  it('VAL14D-08: validate14D matches validateEmotionKeys + clampEmotionValues on valid input', () => {
    const input = {
      joy: 0.5, trust: 0.4, fear: 0.3, surprise: 0.2,
      sadness: 0.1, disgust: 0.05, anger: 0.15, anticipation: 0.25,
      love: 0.35, submission: 0.45, awe: 0.55, disapproval: 0.65,
      remorse: 0.75, contempt: 0.85,
    };

    const combined = validate14D(input);
    validateEmotionKeys(input);
    const manual = clampEmotionValues(input as Record<string, unknown>);

    expect(combined).toEqual(manual);
  });
});
