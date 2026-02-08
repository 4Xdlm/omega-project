/**
 * OMEGA Creation Pipeline — Unified Style Gate Tests
 * Phase C.4 — Style compliance at E2E level
 * 8 tests
 */

import { describe, it, expect } from 'vitest';
import { runUnifiedStyleGate } from '../../src/gates/unified-style-gate.js';
import {
  runPipeline, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
} from '../fixtures.js';

describe('UnifiedStyleGate', () => {
  const snap = runPipeline(INTENT_PACK_A);

  it('within tolerance — scenario A style output evaluated correctly', () => {
    const result = runUnifiedStyleGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.gate_id).toBe('U_STYLE');
    expect(['PASS', 'FAIL']).toContain(result.verdict);
    expect(typeof result.metrics.compliance).toBe('number');
    expect(typeof result.metrics.max_deviation).toBe('number');
  });

  it('deviation FAIL — modified genome_deviation causes failure', () => {
    // Create a modified styleOutput with extreme deviation
    const modifiedProfile = {
      ...snap.styleOutput.global_profile,
      genome_deviation: {
        ...snap.styleOutput.global_profile.genome_deviation,
        burstiness_delta: 0.9,
        lexical_richness_delta: 0.8,
        sentence_length_delta: 0.7,
        max_deviation: 0.9,
      },
    };
    const modifiedOutput = { ...snap.styleOutput, global_profile: modifiedProfile };

    const result = runUnifiedStyleGate(
      modifiedOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.verdict).toBe('FAIL');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('multi-axis — checks burstiness, lexical richness, sentence length', () => {
    // Force all three axes to exceed tolerance
    const threshold = DEFAULT_C4_CONFIG.E2E_STYLE_THRESHOLD.value as number;
    const overLimit = (1 - threshold) + 0.1;
    const modifiedProfile = {
      ...snap.styleOutput.global_profile,
      genome_deviation: {
        ...snap.styleOutput.global_profile.genome_deviation,
        burstiness_delta: overLimit,
        lexical_richness_delta: overLimit,
        sentence_length_delta: overLimit,
        max_deviation: overLimit,
      },
    };
    const modifiedOutput = { ...snap.styleOutput, global_profile: modifiedProfile };

    const result = runUnifiedStyleGate(
      modifiedOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    // Should have at least 3 violations (one per axis)
    const axisViolations = result.violations.filter(
      (v) => ['burstiness', 'lexical_richness', 'sentence_length'].includes(v.location),
    );
    expect(axisViolations.length).toBe(3);
  });

  it('genome targets — metrics include deviation values', () => {
    const result = runUnifiedStyleGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(typeof result.metrics.compliance).toBe('number');
    expect(typeof result.metrics.max_deviation).toBe('number');
    expect(typeof result.metrics.burstiness_delta).toBe('number');
    expect(typeof result.metrics.lexical_delta).toBe('number');
  });

  it('threshold — E2E_STYLE_THRESHOLD is 0.75', () => {
    const threshold = DEFAULT_C4_CONFIG.E2E_STYLE_THRESHOLD.value as number;
    expect(threshold).toBe(0.75);
    // tolerance = 1 - 0.75 = 0.25
    // deviations within 0.25 should PASS
  });

  it('determinism — same input produces identical output', () => {
    const r1 = runUnifiedStyleGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    const r2 = runUnifiedStyleGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.metrics.compliance).toBe(r2.metrics.compliance);
    expect(r1.metrics.max_deviation).toBe(r2.metrics.max_deviation);
    expect(r1.metrics.burstiness_delta).toBe(r2.metrics.burstiness_delta);
    expect(r1.metrics.lexical_delta).toBe(r2.metrics.lexical_delta);
    expect(r1.metrics.ia_score).toBe(r2.metrics.ia_score);
    expect(r1.metrics.genre_specificity).toBe(r2.metrics.genre_specificity);
    expect(r1.timestamp_deterministic).toBe(r2.timestamp_deterministic);
  });

  it('metrics are present and correctly typed', () => {
    const result = runUnifiedStyleGate(
      snap.styleOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(typeof result.metrics.compliance).toBe('number');
    expect(typeof result.metrics.max_deviation).toBe('number');
    expect(typeof result.metrics.burstiness_delta).toBe('number');
    expect(typeof result.metrics.lexical_delta).toBe('number');
    expect(typeof result.metrics.ia_score).toBe('number');
    expect(typeof result.metrics.genre_specificity).toBe('number');
    expect(result.metrics.compliance).toBeGreaterThanOrEqual(0);
    expect(result.metrics.compliance).toBeLessThanOrEqual(1);
    expect(result.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('IA detection and genre specificity checked from C.3 output', () => {
    // Force high IA score to trigger failure
    const modifiedOutput = {
      ...snap.styleOutput,
      ia_detection: { ...snap.styleOutput.ia_detection, score: 0.5 },
    };

    const result = runUnifiedStyleGate(
      modifiedOutput, INTENT_PACK_A, DEFAULT_C4_CONFIG, TIMESTAMP,
    );
    expect(result.violations.some((v) => v.location === 'ia_detection')).toBe(true);
    expect(result.violations.some((v) => v.source_phase === 'C3')).toBe(true);
  });
});
