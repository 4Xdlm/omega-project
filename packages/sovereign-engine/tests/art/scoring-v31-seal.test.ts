/**
 * ART-12 — Scoring V3.1 Seal/Verdict Invariant Tests
 * SEAL-01 to SEAL-05
 *
 * Complements SCORE-V31-01..05 in tests/oracle/scoring-v31.test.ts.
 * Tests SEAL/PITCH/REJECT verdict logic and threshold enforcement.
 */
import { describe, it, expect } from 'vitest';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import { computeMacroSScore } from '../../src/oracle/s-score.js';
import type { MacroAxesScores, MacroAxisScore } from '../../src/oracle/macro-axes.js';

function createMockMacro(name: string, score: number, weight: number): MacroAxisScore {
  return {
    name,
    score,
    weight,
    method: 'CALC',
    sub_scores: [],
    bonuses: [],
    reasons: { top_contributors: [], top_penalties: [] },
  };
}

describe('ART-12: Scoring V3.1 SEAL Verdicts', () => {

  it('SEAL-01: composite ≥ 93 + all floors OK → SEAL', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacro('ecc', 96, 0.33),
      rci: createMockMacro('rci', 93, 0.17),
      sii: createMockMacro('sii', 91, 0.15),
      ifi: createMockMacro('ifi', 89, 0.10),
      aai: createMockMacro('aai', 95, 0.25),
    };

    const result = computeMacroSScore(macroAxes, 'test_seal', 'seed_01');

    // composite = 0.33×96 + 0.17×93 + 0.15×91 + 0.10×89 + 0.25×95 = 93.79
    expect(result.composite).toBeGreaterThanOrEqual(93);
    expect(result.verdict).toBe('SEAL');
  });

  it('SEAL-02: composite < 93 + all floors OK → NOT SEAL', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacro('ecc', 90, 0.33),
      rci: createMockMacro('rci', 88, 0.17),
      sii: createMockMacro('sii', 87, 0.15),
      ifi: createMockMacro('ifi', 86, 0.10),
      aai: createMockMacro('aai', 89, 0.25),
    };

    const result = computeMacroSScore(macroAxes, 'test_pitch', 'seed_02');

    // composite ≈ 88.56 < 93
    expect(result.composite).toBeLessThan(93);
    expect(result.verdict).not.toBe('SEAL');
  });

  it('SEAL-03: macro below floor → NOT SEAL even if composite high', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacro('ecc', 87, 0.33), // Below ECC floor (88)
      rci: createMockMacro('rci', 98, 0.17),
      sii: createMockMacro('sii', 98, 0.15),
      ifi: createMockMacro('ifi', 98, 0.10),
      aai: createMockMacro('aai', 100, 0.25),
    };

    const result = computeMacroSScore(macroAxes, 'test_floor', 'seed_03');

    // Composite > 93 but ECC < 88 floor
    expect(result.composite).toBeGreaterThan(93);
    expect(result.verdict).not.toBe('SEAL');
  });

  it('SEAL-04: SOVEREIGN_THRESHOLD = 93 [ART-SCORE-02]', () => {
    expect(SOVEREIGN_CONFIG.SOVEREIGN_THRESHOLD).toBe(93);
    expect(SOVEREIGN_CONFIG.ZONES.GREEN.min_composite).toBe(93);
  });

  it('SEAL-05: PITCH zone (composite 85-92, min_axis ≥ 75)', () => {
    const macroAxes: MacroAxesScores = {
      ecc: createMockMacro('ecc', 88, 0.33),
      rci: createMockMacro('rci', 86, 0.17),
      sii: createMockMacro('sii', 85, 0.15),
      ifi: createMockMacro('ifi', 85, 0.10),
      aai: createMockMacro('aai', 87, 0.25),
    };

    const result = computeMacroSScore(macroAxes, 'test_pitch_zone', 'seed_05');

    // composite ≈ 86.87 (in PITCH zone: 85-92)
    expect(result.composite).toBeGreaterThanOrEqual(85);
    expect(result.composite).toBeLessThan(93);
    expect(result.verdict).toBe('PITCH');
  });
});
