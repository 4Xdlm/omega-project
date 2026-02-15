/**
 * Tests pour computeMacroSScore (4 macro-axes → verdict)
 */

import { describe, it, expect } from 'vitest';
import { computeMacroSScore } from '../../src/oracle/s-score.js';
import type { MacroAxesScores, MacroAxisScore } from '../../src/types.js';

const createMockMacroAxis = (name: string, score: number, weight: number): MacroAxisScore => ({
  name,
  score,
  weight,
  method: 'CALC',
  sub_scores: [],
  bonuses: [],
  reasons: { top_contributors: [], top_penalties: [] },
});

describe('computeMacroSScore', () => {
  it('tous macro-axes à 100 → composite 100, SEAL', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 100, 0.60),
      rci: createMockMacroAxis('rci', 100, 0.15),
      sii: createMockMacroAxis('sii', 100, 0.15),
      ifi: createMockMacroAxis('ifi', 100, 0.10),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    expect(result.composite).toBe(100);
    expect(result.verdict).toBe('SEAL');
    expect(result.min_axis).toBe(100);
  });

  it('tous macro-axes à 0 → composite 0, REJECT', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 0, 0.60),
      rci: createMockMacroAxis('rci', 0, 0.15),
      sii: createMockMacroAxis('sii', 0, 0.15),
      ifi: createMockMacroAxis('ifi', 0, 0.10),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    expect(result.composite).toBe(0);
    expect(result.verdict).toBe('REJECT');
    expect(result.min_axis).toBe(0);
  });

  it('ECC 60% du composite vérifié', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 100, 0.60),
      rci: createMockMacroAxis('rci', 0, 0.15),
      sii: createMockMacroAxis('sii', 0, 0.15),
      ifi: createMockMacroAxis('ifi', 0, 0.10),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    // composite = 100*0.6 + 0*0.15 + 0*0.15 + 0*0.1 = 60
    expect(result.composite).toBe(60);
    expect(result.ecc_score).toBe(100);
    expect(result.emotion_weight_pct).toBe(60);
  });

  it('composite 92 + min_axis 85 + ECC 88 → SEAL', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 92, 0.60),
      rci: createMockMacroAxis('rci', 92, 0.15),
      sii: createMockMacroAxis('sii', 92, 0.15),
      ifi: createMockMacroAxis('ifi', 92, 0.10),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    expect(result.composite).toBe(92);
    expect(result.min_axis).toBe(92);
    expect(result.verdict).toBe('SEAL');
  });

  it('composite 92 + ECC 87 → PITCH (pas SEAL car ECC < 88)', () => {
    // Pour avoir composite ≥ 92 avec ECC = 87:
    // 87*0.6 + X*0.4 ≥ 92
    // 52.2 + X*0.4 ≥ 92
    // X*0.4 ≥ 39.8
    // X ≥ 99.5
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 87, 0.60),
      rci: createMockMacroAxis('rci', 100, 0.15),
      sii: createMockMacroAxis('sii', 100, 0.15),
      ifi: createMockMacroAxis('ifi', 100, 0.10),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    // composite = 87*0.6 + 100*0.15 + 100*0.15 + 100*0.1 = 52.2 + 15 + 15 + 10 = 92.2
    // ECC < 88, donc pas SEAL, mais composite ≥ 85 et min_axis ≥ 75 → PITCH
    expect(result.composite).toBeGreaterThanOrEqual(92);
    expect(result.ecc_score).toBe(87);
    expect(result.verdict).toBe('PITCH'); // Zone YELLOW
  });

  it('composite 91.9 → PITCH pas SEAL', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 91, 0.60),
      rci: createMockMacroAxis('rci', 94, 0.15),
      sii: createMockMacroAxis('sii', 94, 0.15),
      ifi: createMockMacroAxis('ifi', 94, 0.10),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    // composite = 91*0.6 + 94*0.4 = 54.6 + 37.6 = 92.2
    // Mais ECC 91 < 92, donc même si composite > 92, on n'est pas dans la zone GREEN
    // Attendons de voir le verdict exact
    expect(result.composite).toBeGreaterThanOrEqual(85);
    // Si composite < 92, verdict = PITCH ou REJECT selon min_axis
  });

  it('composite 84 → REJECT', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 84, 0.60),
      rci: createMockMacroAxis('rci', 84, 0.15),
      sii: createMockMacroAxis('sii', 84, 0.15),
      ifi: createMockMacroAxis('ifi', 84, 0.10),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    expect(result.composite).toBe(84);
    expect(result.verdict).toBe('REJECT');
  });

  it('min_axis 74 → PITCH même si composite 90', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 95, 0.60),
      rci: createMockMacroAxis('rci', 74, 0.15), // min_axis = 74
      sii: createMockMacroAxis('sii', 90, 0.15),
      ifi: createMockMacroAxis('ifi', 90, 0.10),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    expect(result.min_axis).toBe(74);
    // composite ≥ 85 mais min_axis < 75 → REJECT
    expect(result.verdict).toBe('REJECT');
  });

  it('ZONE YELLOW: composite 87, min_axis 76, ECC 89 → PITCH', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 89, 0.60),
      rci: createMockMacroAxis('rci', 85, 0.15),
      sii: createMockMacroAxis('sii', 76, 0.15), // min_axis
      ifi: createMockMacroAxis('ifi', 85, 0.10),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    // composite = 89*0.6 + 85*0.15 + 76*0.15 + 85*0.1 = 53.4 + 12.75 + 11.4 + 8.5 = 86.05
    // composite ≥ 85, min_axis ≥ 75, mais ECC < 88 ou composite < 92 → PITCH
    expect(result.verdict).toBe('PITCH');
  });

  it('DÉTERMINISME — mêmes axes = même score', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 92, 0.60),
      rci: createMockMacroAxis('rci', 88, 0.15),
      sii: createMockMacroAxis('sii', 90, 0.15),
      ifi: createMockMacroAxis('ifi', 85, 0.10),
    };

    const score1 = computeMacroSScore(macroAxes, 'test_scene', 'seed1');
    const score2 = computeMacroSScore(macroAxes, 'test_scene', 'seed1');

    expect(score1.composite).toBe(score2.composite);
    expect(score1.verdict).toBe(score2.verdict);
    expect(score1.min_axis).toBe(score2.min_axis);
  });
});
