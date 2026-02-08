/**
 * OMEGA Forge — Invariants Tests
 * Phase C.5 — 20 tests for all 14 invariants F5-INV-01 through F5-INV-14 plus edge cases
 */

import { describe, it, expect } from 'vitest';
import { runForge } from '../src/engine.js';
import {
  CREATION_A, DEFAULT_F5_CONFIG, CANONICAL_TABLE,
  TIMESTAMP, makeFailedCreation,
} from './fixtures.js';
import type { ForgeResult, F5InvariantId, CreationResult } from '../src/types.js';

/** Force creation verdict to PASS so forge processes full pipeline */
function forcePass(creation: CreationResult): CreationResult {
  if (creation.verdict === 'PASS') return creation;
  return { ...creation, verdict: 'PASS' } as CreationResult;
}

describe('invariants', () => {
  let resultA: ForgeResult;

  function getResultA(): ForgeResult {
    if (!resultA) {
      resultA = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    }
    return resultA;
  }

  // -- F5-INV-01: Certified input --
  it('F5-INV-01 PASS: certified input accepted', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-01');
    expect(r.forge_report.invariants_passed).toContain('F5-INV-01');
  });

  it('F5-INV-01 FAIL: uncertified input rejected', () => {
    const failed = makeFailedCreation();
    const r = runForge(failed, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(r.verdict).toBe('FAIL');
    expect(r.forge_report.invariants_failed).toContain('F5-INV-01');
  });

  // -- F5-INV-02: Read-only --
  it('F5-INV-02 always passes', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_passed).toContain('F5-INV-02');
  });

  // -- F5-INV-03: Emotion coverage 100% --
  it('F5-INV-03: coverage = paragraph_states.length === paragraphs.length', () => {
    const creation = forcePass(CREATION_A());
    const r = runForge(creation, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(r.trajectory.paragraph_states.length).toBe(creation.style_output.paragraphs.length);
    expect(r.forge_report.invariants_checked).toContain('F5-INV-03');
  });

  // -- F5-INV-04: Trajectory bounded --
  it('F5-INV-04: trajectory deviation bounded', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-04');
    expect(typeof r.trajectory.avg_cosine_distance).toBe('number');
  });

  // -- F5-INV-05: L1 --
  it('F5-INV-05: L1 forced_transitions checked', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-05');
    expect(typeof r.law_compliance.forced_transitions).toBe('number');
  });

  // -- F5-INV-06: L3 --
  it('F5-INV-06: L3 feasibility_failures checked', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-06');
    expect(typeof r.law_compliance.feasibility_failures).toBe('number');
  });

  // -- F5-INV-07: L4 --
  it('F5-INV-07: L4 law4_violations checked', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-07');
    expect(typeof r.law_compliance.law4_violations).toBe('number');
  });

  // -- F5-INV-08: L5 --
  it('F5-INV-08: L5 law5_compliant checked', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-08');
    expect(typeof r.law_compliance.law5_compliant).toBe('boolean');
  });

  // -- F5-INV-09: Canon --
  it('F5-INV-09: M1 and M2 checked', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-09');
    expect(typeof r.quality.metrics.M1_contradiction_rate).toBe('number');
    expect(typeof r.quality.metrics.M2_canon_compliance).toBe('number');
  });

  // -- F5-INV-10: Necessity --
  it('F5-INV-10: M8 necessity checked', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-10');
    expect(typeof r.quality.metrics.M8_sentence_necessity).toBe('number');
  });

  // -- F5-INV-11: Style --
  it('F5-INV-11: M6 style emergence checked', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-11');
    expect(typeof r.quality.metrics.M6_style_emergence).toBe('number');
  });

  // -- F5-INV-12: Prescriptions --
  it('F5-INV-12: all prescriptions have diagnostic and action', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-12');
    for (const rx of r.prescriptions) {
      expect(rx.diagnostic.length).toBeGreaterThan(0);
      expect(rx.action.length).toBeGreaterThan(0);
    }
  });

  // -- F5-INV-13: Determinism --
  it('F5-INV-13: determinism (two runs same output_hash)', () => {
    const a = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    const b = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(a.output_hash).toBe(b.output_hash);
    expect(a.forge_report.invariants_checked).toContain('F5-INV-13');
  });

  // -- F5-INV-14: Weights 60/40 --
  it('F5-INV-14: composite = 0.6*emo + 0.4*qual', () => {
    const r = getResultA();
    expect(r.forge_report.invariants_checked).toContain('F5-INV-14');
    const emo = r.benchmark.score.emotion_compliance;
    const qual = r.benchmark.score.quality_score;
    const expected = 0.6 * emo + 0.4 * qual;
    expect(r.benchmark.score.composite).toBeCloseTo(expected, 6);
  });

  // -- EDGE CASES --

  it('edge: all 14 invariants are checked', () => {
    const r = getResultA();
    const expectedIds: F5InvariantId[] = [
      'F5-INV-01', 'F5-INV-02', 'F5-INV-03', 'F5-INV-04',
      'F5-INV-05', 'F5-INV-06', 'F5-INV-07', 'F5-INV-08',
      'F5-INV-09', 'F5-INV-10', 'F5-INV-11', 'F5-INV-12',
      'F5-INV-13', 'F5-INV-14',
    ];
    for (const id of expectedIds) {
      expect(r.forge_report.invariants_checked).toContain(id);
    }
  });

  it('edge: checked = passed + failed (no gaps)', () => {
    const r = getResultA();
    const checked = r.forge_report.invariants_checked.length;
    const passed = r.forge_report.invariants_passed.length;
    const failed = r.forge_report.invariants_failed.length;
    expect(passed + failed).toBe(checked);
  });

  it('edge: failed creation has F5-INV-01 in failed list', () => {
    const failed = makeFailedCreation();
    const r = runForge(failed, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(r.forge_report.invariants_failed).toContain('F5-INV-01');
    expect(r.forge_report.invariants_passed).not.toContain('F5-INV-01');
  });

  it('edge: FAIL verdict when input is uncertified', () => {
    const failed = makeFailedCreation();
    const r = runForge(failed, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(r.verdict).toBe('FAIL');
    expect(r.trajectory.paragraph_states).toHaveLength(0);
  });

  it('edge: invariants_passed is subset of invariants_checked', () => {
    const r = getResultA();
    for (const id of r.forge_report.invariants_passed) {
      expect(r.forge_report.invariants_checked).toContain(id);
    }
  });

  it('edge: invariants_failed is subset of invariants_checked', () => {
    const r = getResultA();
    for (const id of r.forge_report.invariants_failed) {
      expect(r.forge_report.invariants_checked).toContain(id);
    }
  });
});
