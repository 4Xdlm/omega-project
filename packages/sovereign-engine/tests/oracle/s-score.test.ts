/**
 * Tests for S-Score composite — THE SOVEREIGN JUDGE
 * Verifies 92 threshold, 63.3% emotion weight, axis floor
 */

import { describe, it, expect } from 'vitest';
import { computeSScore } from '../../src/oracle/s-score.js';
import type { AxesScores } from '../../src/types.js';
import { SOVEREIGN_CONFIG } from '../../src/config.js';

const mockAxesAll100: AxesScores = {
  interiority: { name: 'interiority', score: 100, weight: 2.0, method: 'LLM', details: '' },
  tension_14d: { name: 'tension_14d', score: 100, weight: 3.0, method: 'CALC', details: '' },
  sensory_density: { name: 'sensory_density', score: 100, weight: 1.5, method: 'HYBRID', details: '' },
  necessity: { name: 'necessity', score: 100, weight: 1.0, method: 'LLM', details: '' },
  anti_cliche: { name: 'anti_cliche', score: 100, weight: 1.0, method: 'CALC', details: '' },
  rhythm: { name: 'rhythm', score: 100, weight: 1.0, method: 'CALC', details: '' },
  signature: { name: 'signature', score: 100, weight: 1.0, method: 'CALC', details: '' },
  impact: { name: 'impact', score: 100, weight: 2.0, method: 'LLM', details: '' },
  emotion_coherence: { name: 'emotion_coherence', score: 100, weight: 2.5, method: 'CALC', details: '' },
};

const mockAxesAll0: AxesScores = {
  interiority: { name: 'interiority', score: 0, weight: 2.0, method: 'LLM', details: '' },
  tension_14d: { name: 'tension_14d', score: 0, weight: 3.0, method: 'CALC', details: '' },
  sensory_density: { name: 'sensory_density', score: 0, weight: 1.5, method: 'HYBRID', details: '' },
  necessity: { name: 'necessity', score: 0, weight: 1.0, method: 'LLM', details: '' },
  anti_cliche: { name: 'anti_cliche', score: 0, weight: 1.0, method: 'CALC', details: '' },
  rhythm: { name: 'rhythm', score: 0, weight: 1.0, method: 'CALC', details: '' },
  signature: { name: 'signature', score: 0, weight: 1.0, method: 'CALC', details: '' },
  impact: { name: 'impact', score: 0, weight: 2.0, method: 'LLM', details: '' },
  emotion_coherence: { name: 'emotion_coherence', score: 0, weight: 2.5, method: 'CALC', details: '' },
};

describe('computeSScore', () => {
  it('tous axes à 100 → composite = 100', () => {
    const result = computeSScore(mockAxesAll100, 'test_scene', 'test_seed');

    expect(result.composite).toBe(100);
    expect(result.verdict).toBe('SEAL');
  });

  it('tous axes à 0 → composite = 0', () => {
    const result = computeSScore(mockAxesAll0, 'test_scene', 'test_seed');

    expect(result.composite).toBe(0);
    expect(result.verdict).toBe('REJECT');
  });

  it('poids émotionnels = 63.3% du total', () => {
    const result = computeSScore(mockAxesAll100, 'test_scene', 'test_seed');

    expect(result.emotion_weight_pct).toBeCloseTo(63.3, 1);
  });

  it('axe à 49 (< AXIS_FLOOR) → verdict REJECT même si composite > 92', () => {
    const axesWithOneFloor = {
      ...mockAxesAll100,
      anti_cliche: { name: 'anti_cliche', score: 49, weight: 1.0, method: 'CALC', details: '' },
    };

    const result = computeSScore(axesWithOneFloor, 'test_scene', 'test_seed');

    expect(result.axes.anti_cliche.score).toBe(49);
    expect(result.verdict).toBe('REJECT');
  });

  it('composite 91.9 → verdict REJECT (seuil 92 absolu)', () => {
    const axesFor91_9 = {
      interiority: { name: 'interiority', score: 91, weight: 2.0, method: 'LLM', details: '' },
      tension_14d: { name: 'tension_14d', score: 92, weight: 3.0, method: 'CALC', details: '' },
      sensory_density: { name: 'sensory_density', score: 92, weight: 1.5, method: 'HYBRID', details: '' },
      necessity: { name: 'necessity', score: 92, weight: 1.0, method: 'LLM', details: '' },
      anti_cliche: { name: 'anti_cliche', score: 92, weight: 1.0, method: 'CALC', details: '' },
      rhythm: { name: 'rhythm', score: 92, weight: 1.0, method: 'CALC', details: '' },
      signature: { name: 'signature', score: 92, weight: 1.0, method: 'CALC', details: '' },
      impact: { name: 'impact', score: 92, weight: 2.0, method: 'LLM', details: '' },
      emotion_coherence: { name: 'emotion_coherence', score: 92, weight: 2.5, method: 'CALC', details: '' },
    };

    const result = computeSScore(axesFor91_9, 'test_scene', 'test_seed');

    expect(result.composite).toBeLessThan(SOVEREIGN_CONFIG.SOVEREIGN_THRESHOLD);
    expect(result.verdict).toBe('REJECT');
  });

  it('composite 92.0 exactement → verdict SEAL', () => {
    const axesFor92 = {
      interiority: { name: 'interiority', score: 92, weight: 2.0, method: 'LLM', details: '' },
      tension_14d: { name: 'tension_14d', score: 92, weight: 3.0, method: 'CALC', details: '' },
      sensory_density: { name: 'sensory_density', score: 92, weight: 1.5, method: 'HYBRID', details: '' },
      necessity: { name: 'necessity', score: 92, weight: 1.0, method: 'LLM', details: '' },
      anti_cliche: { name: 'anti_cliche', score: 92, weight: 1.0, method: 'CALC', details: '' },
      rhythm: { name: 'rhythm', score: 92, weight: 1.0, method: 'CALC', details: '' },
      signature: { name: 'signature', score: 92, weight: 1.0, method: 'CALC', details: '' },
      impact: { name: 'impact', score: 92, weight: 2.0, method: 'LLM', details: '' },
      emotion_coherence: { name: 'emotion_coherence', score: 92, weight: 2.5, method: 'CALC', details: '' },
    };

    const result = computeSScore(axesFor92, 'test_scene', 'test_seed');

    expect(result.composite).toBe(92);
    expect(result.verdict).toBe('SEAL');
  });

  it('DÉTERMINISME — mêmes axes = même score', () => {
    const score1 = computeSScore(mockAxesAll100, 'test_scene', 'seed1');
    const score2 = computeSScore(mockAxesAll100, 'test_scene', 'seed1');

    expect(score1.composite).toBe(score2.composite);
    expect(score1.verdict).toBe(score2.verdict);
  });
});
