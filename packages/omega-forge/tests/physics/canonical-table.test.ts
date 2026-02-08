/**
 * OMEGA Forge — Canonical Table Tests
 * Phase C.5 — Load, validate, get physics for 14 emotions
 * 8 tests
 */

import { describe, it, expect } from 'vitest';
import {
  loadCanonicalTable,
  getEmotionPhysics,
  validateTable,
  DEFAULT_CANONICAL_TABLE,
} from '../../src/physics/canonical-table.js';

const EMOTION_14_KEYS = [
  'joy', 'trust', 'fear', 'surprise', 'sadness',
  'disgust', 'anger', 'anticipation', 'love', 'submission',
  'awe', 'disapproval', 'remorse', 'contempt',
] as const;

describe('canonical-table', () => {
  it('loadCanonicalTable: loads a valid JSON array', () => {
    const json = JSON.parse(JSON.stringify(DEFAULT_CANONICAL_TABLE));
    const table = loadCanonicalTable(json);
    expect(table.length).toBe(14);
  });

  it('validateTable: DEFAULT_CANONICAL_TABLE passes validation', () => {
    const result = validateTable(DEFAULT_CANONICAL_TABLE);
    expect(result).toBe(true);
  });

  it('DEFAULT_CANONICAL_TABLE: all 14 emotions present', () => {
    for (const emotion of EMOTION_14_KEYS) {
      const found = DEFAULT_CANONICAL_TABLE.find((e) => e.emotion === emotion);
      expect(found).toBeDefined();
    }
  });

  it('getEmotionPhysics: retrieves correct physics for fear', () => {
    const physics = getEmotionPhysics(DEFAULT_CANONICAL_TABLE, 'fear');
    expect(physics.emotion).toBe('fear');
    expect(physics.M).toBe(7);
    expect(physics.lambda).toBe(0.20);
  });

  it('M > 0 for all emotions', () => {
    for (const entry of DEFAULT_CANONICAL_TABLE) {
      expect(entry.M).toBeGreaterThan(0);
    }
  });

  it('lambda > 0 for all emotions', () => {
    for (const entry of DEFAULT_CANONICAL_TABLE) {
      expect(entry.lambda).toBeGreaterThan(0);
    }
  });

  it('loadCanonicalTable: invalid (wrong length) throws', () => {
    const json = JSON.parse(JSON.stringify(DEFAULT_CANONICAL_TABLE)).slice(0, 5);
    expect(() => loadCanonicalTable(json)).toThrow();
  });

  it('determinism: same table loads identically twice', () => {
    const json = JSON.parse(JSON.stringify(DEFAULT_CANONICAL_TABLE));
    const t1 = loadCanonicalTable(json);
    const json2 = JSON.parse(JSON.stringify(DEFAULT_CANONICAL_TABLE));
    const t2 = loadCanonicalTable(json2);
    expect(t1.length).toBe(t2.length);
    for (let i = 0; i < t1.length; i++) {
      expect(t1[i].emotion).toBe(t2[i].emotion);
      expect(t1[i].M).toBe(t2[i].M);
      expect(t1[i].lambda).toBe(t2[i].lambda);
      expect(t1[i].kappa).toBe(t2[i].kappa);
      expect(t1[i].E0).toBe(t2[i].E0);
      expect(t1[i].zeta).toBe(t2[i].zeta);
      expect(t1[i].mu).toBe(t2[i].mu);
    }
  });
});
