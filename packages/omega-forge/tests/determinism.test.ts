/**
 * OMEGA Forge — Determinism Tests
 * Phase C.5 — 10 tests verifying runForge produces identical results on repeated runs
 */

import { describe, it, expect } from 'vitest';
import { runForge } from '../src/engine.js';
import { CREATION_A, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP } from './fixtures.js';
import type { ForgeResult, CreationResult } from '../src/types.js';

/** Force creation verdict to PASS so forge processes full pipeline */
function forcePass(creation: CreationResult): CreationResult {
  if (creation.verdict === 'PASS') return creation;
  return { ...creation, verdict: 'PASS' } as CreationResult;
}

describe('determinism', () => {
  let run1: ForgeResult;
  let run2: ForgeResult;

  function getRuns(): [ForgeResult, ForgeResult] {
    if (!run1) {
      run1 = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
      run2 = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    }
    return [run1, run2];
  }

  it('A: two runs produce same forge_id', () => {
    const [a, b] = getRuns();
    expect(a.forge_id).toBe(b.forge_id);
  });

  it('A: two runs produce same trajectory_hash', () => {
    const [a, b] = getRuns();
    expect(a.trajectory.trajectory_hash).toBe(b.trajectory.trajectory_hash);
  });

  it('A: two runs produce same compliance_hash', () => {
    const [a, b] = getRuns();
    expect(a.law_compliance.compliance_hash).toBe(b.law_compliance.compliance_hash);
  });

  it('A: two runs produce same quality_hash', () => {
    const [a, b] = getRuns();
    expect(a.quality.quality_hash).toBe(b.quality.quality_hash);
  });

  it('A: two runs produce same benchmark profile_hash', () => {
    const [a, b] = getRuns();
    expect(a.benchmark.profile_hash).toBe(b.benchmark.profile_hash);
  });

  it('A: two runs produce same report_hash', () => {
    const [a, b] = getRuns();
    expect(a.forge_report.report_hash).toBe(b.forge_report.report_hash);
  });

  it('A: two runs produce same evidence chain (implicit via output_hash)', () => {
    const [a, b] = getRuns();
    expect(a.output_hash).toBe(b.output_hash);
  });

  it('A: two runs produce same output_hash', () => {
    const [a, b] = getRuns();
    expect(a.output_hash).toBe(b.output_hash);
  });

  it('A: two runs produce same verdict', () => {
    const [a, b] = getRuns();
    expect(a.verdict).toBe(b.verdict);
  });

  it('A: two runs produce same composite score', () => {
    const [a, b] = getRuns();
    expect(a.benchmark.score.composite).toBe(b.benchmark.score.composite);
  });
});
