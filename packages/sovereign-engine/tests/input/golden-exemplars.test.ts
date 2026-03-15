/**
 * golden-exemplars.test.ts — Tests for Golden Exemplar Corpus
 * Phase V4-2
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_EXEMPLARS, selectExemplarDeterministic } from '../../src/input/golden-exemplars.js';

describe('golden-exemplars', () => {
  it('GOLDEN_EXEMPLARS contains ≥ 2 entries', () => {
    expect(GOLDEN_EXEMPLARS.length).toBeGreaterThanOrEqual(2);
  });

  it('each exemplar has id, text (50-300 words), source, composite_score', () => {
    for (const ex of GOLDEN_EXEMPLARS) {
      expect(ex.id).toBeTruthy();
      expect(ex.text).toBeTruthy();
      expect(ex.source).toBeTruthy();
      expect(ex.composite_score).toBeGreaterThan(0);

      const wordCount = ex.text.split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(50);
      expect(wordCount).toBeLessThanOrEqual(300);
    }
  });

  it('selectExemplarDeterministic is deterministic (same id → same exemplar)', () => {
    const id = 'test-packet-determinism-check';
    const result1 = selectExemplarDeterministic(id);
    const result2 = selectExemplarDeterministic(id);
    expect(result1).not.toBeNull();
    expect(result1!.id).toBe(result2!.id);
    expect(result1!.text).toBe(result2!.text);
  });

  it('selectExemplarDeterministic returns different exemplars for different ids', () => {
    // Try multiple IDs to find at least one that differs
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const result = selectExemplarDeterministic(`packet-${i}`);
      if (result) results.add(result.id);
    }
    // With 3 exemplars and 20 different inputs, we should hit at least 2
    expect(results.size).toBeGreaterThanOrEqual(2);
  });
});
