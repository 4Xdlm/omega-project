/**
 * OMEGA Forge — Engine Tests
 * Phase C.5 — 18 tests for runForge (main integration)
 */

import { describe, it, expect } from 'vitest';
import { runForge } from '../src/engine.js';
import {
  CREATION_A, CREATION_B, DEFAULT_F5_CONFIG, CANONICAL_TABLE,
  TIMESTAMP, makeFailedCreation,
} from './fixtures.js';
import type { CreationResult } from '../src/types.js';

/** Force creation verdict to PASS so forge processes full pipeline */
function forcePass(creation: CreationResult): CreationResult {
  if (creation.verdict === 'PASS') return creation;
  return { ...creation, verdict: 'PASS' } as CreationResult;
}

describe('engine — runForge', () => {
  it('scenario A runs and returns ForgeResult', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(result).toBeDefined();
    expect(typeof result.forge_id).toBe('string');
    expect(result.forge_id).toContain('FORGE-');
    expect(typeof result.output_hash).toBe('string');
    expect(result.output_hash).toHaveLength(64);
  });

  it('scenario B runs', () => {
    const result = runForge(forcePass(CREATION_B()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(result).toBeDefined();
    expect(typeof result.forge_id).toBe('string');
    expect(typeof result.verdict).toBe('string');
  });

  it('F5-INV-01: FAIL creation rejected', () => {
    const failed = makeFailedCreation();
    const result = runForge(failed, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.forge_id).toContain('FORGE-FAIL');
  });

  it('F5-INV-02: read-only — output does not modify input', () => {
    const creation = forcePass(CREATION_A());
    const inputHash = creation.output_hash;
    const inputParagraphs = creation.style_output.paragraphs.length;
    runForge(creation, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(creation.output_hash).toBe(inputHash);
    expect(creation.style_output.paragraphs.length).toBe(inputParagraphs);
  });

  it('F5-INV-03: coverage 100% — paragraph_states.length === paragraphs.length', () => {
    const creation = forcePass(CREATION_A());
    const result = runForge(creation, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(result.trajectory.paragraph_states.length).toBe(creation.style_output.paragraphs.length);
  });

  it('F5-INV-04: trajectory bounded — avg_cosine_distance is a number', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(typeof result.trajectory.avg_cosine_distance).toBe('number');
    expect(result.trajectory.avg_cosine_distance).toBeGreaterThanOrEqual(0);
  });

  it('F5-INV-05: L1 check — forced_transitions is a number', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(typeof result.law_compliance.forced_transitions).toBe('number');
    expect(result.law_compliance.forced_transitions).toBeGreaterThanOrEqual(0);
  });

  it('F5-INV-06: L3 check — feasibility_failures is a number', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(typeof result.law_compliance.feasibility_failures).toBe('number');
    expect(result.law_compliance.feasibility_failures).toBeGreaterThanOrEqual(0);
  });

  it('F5-INV-07: L4 check — law4_violations is a number', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(typeof result.law_compliance.law4_violations).toBe('number');
    expect(result.law_compliance.law4_violations).toBeGreaterThanOrEqual(0);
  });

  it('F5-INV-08: L5 check — law5_compliant is boolean', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(typeof result.law_compliance.law5_compliant).toBe('boolean');
  });

  it('F5-INV-09: canon — M1 and M2 are numbers', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(typeof result.quality.metrics.M1_contradiction_rate).toBe('number');
    expect(typeof result.quality.metrics.M2_canon_compliance).toBe('number');
  });

  it('F5-INV-10: necessity — M8 is a number', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(typeof result.quality.metrics.M8_sentence_necessity).toBe('number');
  });

  it('F5-INV-11: style — M6 is a number', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(typeof result.quality.metrics.M6_style_emergence).toBe('number');
  });

  it('F5-INV-12: prescriptions — all have diagnostic and action', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    for (const rx of result.prescriptions) {
      expect(rx.diagnostic.length).toBeGreaterThan(0);
      expect(rx.action.length).toBeGreaterThan(0);
    }
  });

  it('F5-INV-13: determinism — two runs produce same hash', () => {
    const a = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    const b = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(a.output_hash).toBe(b.output_hash);
  });

  it('F5-INV-14: weight 60/40 — composite approximates 0.6*emo + 0.4*qual', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    const emo = result.benchmark.score.emotion_compliance;
    const qual = result.benchmark.score.quality_score;
    const expected = 0.6 * emo + 0.4 * qual;
    expect(result.benchmark.score.composite).toBeCloseTo(expected, 6);
  });

  it('dead_zones is an array', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(Array.isArray(result.dead_zones)).toBe(true);
  });

  it('forge_report has all required fields', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    const report = result.forge_report;
    expect(report.forge_id).toBe(result.forge_id);
    expect(report.input_hash).toBe(result.input_hash);
    expect(typeof report.verdict).toBe('string');
    expect(report.metrics).toBeDefined();
    expect(report.benchmark).toBeDefined();
    expect(Array.isArray(report.prescriptions_summary)).toBe(true);
    expect(Array.isArray(report.invariants_checked)).toBe(true);
    expect(Array.isArray(report.invariants_passed)).toBe(true);
    expect(Array.isArray(report.invariants_failed)).toBe(true);
    expect(typeof report.config_hash).toBe('string');
    expect(typeof report.report_hash).toBe('string');
    expect(typeof report.timestamp_deterministic).toBe('string');
  });
});
