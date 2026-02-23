/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONSUMER TEST — Validates @omega/phonetic-stack compiled ESM output
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This test simulates what sovereign-engine will do:
 *   1. Import from compiled dist (NOT source TS)
 *   2. Call scoreGenius() on a fixture text
 *   3. Verify output shape matches GeniusAnalysis contract
 *   4. Verify determinism (2 runs = identical output)
 *   5. Verify VERSION and SCORER_SCHEMA_VERSION exports
 *
 * Invariant: ART-GENIUS-CONSUMER
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  scoreGenius,
  VERSION,
  SCORER_SCHEMA_VERSION,
  MODULE_COUNT,
  type GeniusAnalysis,
  type AxisScore,
} from '../dist/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURE
// ═══════════════════════════════════════════════════════════════════════════════

const FIXTURE_TEXT = `La nuit tombait sur les toits de Paris comme un voile de soie noire. 
Les lumières de la ville s'allumaient une à une, fragiles étoiles terrestres 
dans l'immensité du crépuscule. Marie marchait le long de la Seine, 
ses pas résonnant sur les pavés mouillés. Elle pensait à tout ce qui avait été, 
à tout ce qui ne serait plus jamais. Le fleuve coulait, indifférent, 
emportant avec lui les reflets dorés des réverbères et les souvenirs d'un été 
qui n'avait pas tenu ses promesses.`;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Consumer Test — @omega/phonetic-stack compiled ESM', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // T1: Module metadata exports
  // ─────────────────────────────────────────────────────────────────────────
  it('T1: exports VERSION, SCORER_SCHEMA_VERSION, MODULE_COUNT', () => {
    expect(VERSION).toBe('1.0.0');
    expect(SCORER_SCHEMA_VERSION).toBe('GENIUS_SCHEMA_V1');
    expect(MODULE_COUNT).toBe(10);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // T2: scoreGenius returns correct shape (GeniusAnalysis contract)
  // ─────────────────────────────────────────────────────────────────────────
  it('T2: scoreGenius returns GeniusAnalysis with all required fields', () => {
    const result: GeniusAnalysis = scoreGenius(FIXTURE_TEXT);

    // Top-level fields
    expect(typeof result.geniusScore).toBe('number');
    expect(result.geniusScore).toBeGreaterThanOrEqual(0);
    expect(result.geniusScore).toBeLessThanOrEqual(100);

    expect(typeof result.antiCorrelationPenalty).toBe('number');
    expect(typeof result.floorScore).toBe('number');
    expect(typeof result.ceilingScore).toBe('number');
    expect(typeof result.spread).toBe('number');

    // 5 axes present
    const axisNames = ['density', 'surprise', 'inevitability', 'resonance', 'voice'] as const;
    for (const name of axisNames) {
      const axis: AxisScore = result.axes[name];
      expect(axis).toBeDefined();
      expect(typeof axis.name).toBe('string');
      expect(typeof axis.score).toBe('number');
      expect(axis.score).toBeGreaterThanOrEqual(0);
      expect(axis.score).toBeLessThanOrEqual(100);
      expect(typeof axis.weight).toBe('number');
      expect(axis.weight).toBeGreaterThan(0);
      expect(axis.weight).toBeLessThanOrEqual(1);
      expect(typeof axis.contribution).toBe('number');
      expect(typeof axis.confidence).toBe('number');
    }

    // Weights sum = 1.0
    const weightSum = axisNames.reduce((sum, n) => sum + result.axes[n].weight, 0);
    expect(weightSum).toBeCloseTo(1.0, 10);

    // Raw sub-analyses present
    expect(result.raw).toBeDefined();
    expect(result.raw.density).toBeDefined();
    expect(result.raw.surprise).toBeDefined();
    expect(result.raw.inevitability).toBeDefined();
    expect(result.raw.rhythm).toBeDefined();
    expect(result.raw.euphony).toBeDefined();
    expect(result.raw.calques).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // T3: Determinism — same input = same output (bit-identical)
  // ─────────────────────────────────────────────────────────────────────────
  it('T3: determinism — 2 runs produce identical JSON', () => {
    const run1 = scoreGenius(FIXTURE_TEXT);
    const run2 = scoreGenius(FIXTURE_TEXT);

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // T4: Score ranges are sane
  // ─────────────────────────────────────────────────────────────────────────
  it('T4: composite score within literary prose expected range (40-100)', () => {
    const result = scoreGenius(FIXTURE_TEXT);
    expect(result.geniusScore).toBeGreaterThanOrEqual(40);
    expect(result.geniusScore).toBeLessThanOrEqual(100);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // T5: spread = ceiling - floor
  // ─────────────────────────────────────────────────────────────────────────
  it('T5: spread = ceilingScore - floorScore', () => {
    const result = scoreGenius(FIXTURE_TEXT);
    expect(result.spread).toBeCloseTo(result.ceilingScore - result.floorScore, 10);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // T6: Calibrated weights match expected values
  // ─────────────────────────────────────────────────────────────────────────
  it('T6: axis weights match calibrated values', () => {
    const result = scoreGenius(FIXTURE_TEXT);
    expect(result.axes.resonance.weight).toBe(0.35);
    expect(result.axes.density.weight).toBe(0.25);
    expect(result.axes.voice.weight).toBe(0.20);
    expect(result.axes.surprise.weight).toBe(0.15);
    expect(result.axes.inevitability.weight).toBe(0.05);
  });
});
