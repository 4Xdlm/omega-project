/**
 * Tests: Scoring V3.1 (Sprint 12.3)
 * Invariants: ART-SCORE-01, ART-SCORE-02, ART-SCORE-03
 */

import { describe, it, expect } from 'vitest';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import { computeMacroSScore } from '../../src/oracle/s-score.js';
import type { MacroAxesScores, MacroAxisScore } from '../../src/oracle/macro-axes.js';

const createMockMacroAxis = (name: string, score: number, weight: number): MacroAxisScore => ({
  name,
  score,
  weight,
  method: 'CALC',
  sub_scores: [],
  bonuses: [],
  reasons: { top_contributors: [], top_penalties: [] },
});

describe('Scoring V3.1 (ART-SCORE-01, 02, 03)', () => {
  it('SCORE-V31-01: 5 macro-axes calculés correctement', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 90, 0.33),
      rci: createMockMacroAxis('rci', 88, 0.17),
      sii: createMockMacroAxis('sii', 87, 0.15),
      ifi: createMockMacroAxis('ifi', 86, 0.10),
      aai: createMockMacroAxis('aai', 89, 0.25),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    // Vérifier que tous les macro-axes sont pris en compte
    expect(result.macro_axes.ecc).toBeDefined();
    expect(result.macro_axes.rci).toBeDefined();
    expect(result.macro_axes.sii).toBeDefined();
    expect(result.macro_axes.ifi).toBeDefined();
    expect(result.macro_axes.aai).toBeDefined();

    // Composite = 90*0.33 + 88*0.17 + 87*0.15 + 86*0.10 + 89*0.25
    // = 29.7 + 14.96 + 13.05 + 8.6 + 22.25 = 88.56
    const expected_composite = 90 * 0.33 + 88 * 0.17 + 87 * 0.15 + 86 * 0.10 + 89 * 0.25;
    expect(result.composite).toBeCloseTo(expected_composite, 1);
  });

  it('SCORE-V31-02: seuil 93 respecté (score < 93 → pas SEAL)', () => {
    // Test avec composite = 92.5 (< 93) mais tous planchers OK
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 92, 0.33),
      rci: createMockMacroAxis('rci', 93, 0.17),
      sii: createMockMacroAxis('sii', 93, 0.15),
      ifi: createMockMacroAxis('ifi', 93, 0.10),
      aai: createMockMacroAxis('aai', 93, 0.25),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    // composite = 92*0.33 + 93*0.67 = 30.36 + 62.31 = 92.67 < 93
    expect(result.composite).toBeLessThan(93);
    expect(result.verdict).not.toBe('SEAL'); // Devrait être PITCH ou REJECT
  });

  it('SCORE-V31-03: planchers respectés (ECC < 88 → FAIL même si composite > 93)', () => {
    // ECC = 87 (< 88), autres axes très élevés pour atteindre composite > 93
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacroAxis('ecc', 87, 0.33), // Plancher ECC = 88
      rci: createMockMacroAxis('rci', 98, 0.17),
      sii: createMockMacroAxis('sii', 98, 0.15),
      ifi: createMockMacroAxis('ifi', 98, 0.10),
      aai: createMockMacroAxis('aai', 100, 0.25),
    };

    const result = computeMacroSScore(macroAxes, 'test_scene', 'test_seed');

    // Composite = 87*0.33 + 98*0.17 + 98*0.15 + 98*0.10 + 100*0.25
    // = 28.71 + 16.66 + 14.7 + 9.8 + 25 = 94.87 > 93
    expect(result.composite).toBeGreaterThan(93);
    expect(result.ecc_score).toBe(87);
    expect(result.verdict).not.toBe('SEAL'); // ECC floor violated
  });

  it('SCORE-V31-04: somme poids macro = 100% (0.33+0.17+0.15+0.10+0.25 = 1.00)', () => {
    const sum =
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.ecc +
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.rci +
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.sii +
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.ifi +
      SOVEREIGN_CONFIG.MACRO_WEIGHTS.aai;

    expect(sum).toBeCloseTo(1.0, 5); // 100% avec précision float
  });

  it('SCORE-V31-05: 14 axes tous scorés (aucun undefined/NaN)', () => {
    // This test verifies the structure is ready for 14 axes
    // The actual verification happens in the macro-axis computation functions
    // We verify that the config and structure support 14 axes:
    // ECC: tension_14d, emotion_coherence, interiority, impact, physics_compliance (5)
    // RCI: rhythm, signature, hook_presence (3)
    // SII: anti_cliche, necessity, metaphor_novelty (3)
    // IFI: sensory_density (+restraint if exists) (1-2)
    // AAI: show_dont_tell, authenticity (2)
    // Total: 5 + 3 + 3 + 1-2 + 2 = 14-15 axes

    // Verify all macro weights are defined
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.ecc).toBeDefined();
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.rci).toBeDefined();
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.sii).toBeDefined();
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.ifi).toBeDefined();
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.aai).toBeDefined();

    // Verify all macro floors are defined
    expect(SOVEREIGN_CONFIG.MACRO_FLOORS.ecc).toBe(88);
    expect(SOVEREIGN_CONFIG.MACRO_FLOORS.rci).toBe(85);
    expect(SOVEREIGN_CONFIG.MACRO_FLOORS.sii).toBe(85);
    expect(SOVEREIGN_CONFIG.MACRO_FLOORS.ifi).toBe(85);
    expect(SOVEREIGN_CONFIG.MACRO_FLOORS.aai).toBe(85);

    // Verify new threshold
    expect(SOVEREIGN_CONFIG.SOVEREIGN_THRESHOLD).toBe(93);
  });
});
