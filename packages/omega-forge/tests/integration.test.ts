/**
 * OMEGA Forge — Integration Tests
 * Phase C.5 — 12 full integration tests
 */

import { describe, it, expect } from 'vitest';
import { runForge } from '../src/engine.js';
import { verifyF5EvidenceChain, buildF5EvidenceChain, createEvidenceStep } from '../src/evidence.js';
import { forgeReportToMarkdown } from '../src/report.js';
import {
  CREATION_A, CREATION_B, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP,
} from './fixtures.js';
import type { ForgeResult, F5InvariantId, CreationResult } from '../src/types.js';

/** Force creation verdict to PASS so forge processes full pipeline */
function forcePass(creation: CreationResult): CreationResult {
  if (creation.verdict === 'PASS') return creation;
  return { ...creation, verdict: 'PASS' } as CreationResult;
}

describe('integration', () => {
  it('scenario A: full flow produces ForgeResult', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(result).toBeDefined();
    expect(typeof result.forge_id).toBe('string');
    expect(typeof result.input_hash).toBe('string');
    expect(typeof result.output_hash).toBe('string');
    expect(result.output_hash).toHaveLength(64);
    expect(result.trajectory).toBeDefined();
    expect(result.law_compliance).toBeDefined();
    expect(result.quality).toBeDefined();
    expect(result.benchmark).toBeDefined();
    expect(result.forge_report).toBeDefined();
  });

  it('scenario B: full flow produces ForgeResult', () => {
    const result = runForge(forcePass(CREATION_B()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(result).toBeDefined();
    expect(typeof result.forge_id).toBe('string');
    expect(typeof result.output_hash).toBe('string');
    expect(result.output_hash).toHaveLength(64);
  });

  it('V1-V5 flow: all stages produce hashes', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    // V1: trajectory
    expect(result.trajectory.trajectory_hash).toHaveLength(64);
    // V2: laws
    expect(result.law_compliance.compliance_hash).toHaveLength(64);
    // V3: quality
    expect(result.quality.quality_hash).toHaveLength(64);
    // V5: benchmark + report
    expect(result.benchmark.profile_hash).toHaveLength(64);
    expect(result.forge_report.report_hash).toHaveLength(64);
  });

  it('trajectory feeds prescriptions', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(Array.isArray(result.prescriptions)).toBe(true);
    for (const rx of result.prescriptions) {
      expect(rx.diagnostic.length).toBeGreaterThan(0);
      expect(rx.action.length).toBeGreaterThan(0);
      expect(Array.isArray(rx.paragraph_indices)).toBe(true);
    }
  });

  it('laws feed dead zones', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(Array.isArray(result.dead_zones)).toBe(true);
    for (const dz of result.dead_zones) {
      expect(typeof dz.start_index).toBe('number');
      expect(typeof dz.end_index).toBe('number');
      expect(typeof dz.length).toBe('number');
      expect(dz.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('quality feeds M12', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(typeof result.quality.metrics.M12_superiority_index).toBe('number');
    expect(typeof result.quality.quality_score).toBe('number');
    expect(result.quality.quality_score).toBeGreaterThanOrEqual(0);
    expect(result.quality.quality_score).toBeLessThanOrEqual(1);
  });

  it('evidence chain is valid (reconstruction)', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    const steps = [
      createEvidenceStep('V0_VALIDATE', result.input_hash, 'x'.repeat(64), 'F5-INV-01', 'PASS', TIMESTAMP),
    ];
    const chain = buildF5EvidenceChain(result.forge_id, steps);
    expect(verifyF5EvidenceChain(chain)).toBe(true);
  });

  it('report is complete', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    const report = result.forge_report;
    expect(report.forge_id).toBe(result.forge_id);
    expect(report.input_hash).toBe(result.input_hash);
    expect(report.verdict).toBe(result.verdict);
    expect(report.metrics).toBeDefined();
    expect(report.benchmark).toBeDefined();
    expect(report.config_hash).toHaveLength(64);
    expect(report.report_hash).toHaveLength(64);
    const md = forgeReportToMarkdown(report);
    expect(md).toContain('# OMEGA Forge Report');
    expect(md).toContain(report.forge_id);
  });

  it('60/40 weight verified end-to-end', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    const emo = result.benchmark.score.emotion_compliance;
    const qual = result.benchmark.score.quality_score;
    const expected = 0.6 * emo + 0.4 * qual;
    expect(result.benchmark.score.composite).toBeCloseTo(expected, 6);
  });

  it('determinism E2E: two runs identical', () => {
    const a = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    const b = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(a.output_hash).toBe(b.output_hash);
    expect(a.forge_id).toBe(b.forge_id);
    expect(a.verdict).toBe(b.verdict);
    expect(a.trajectory.trajectory_hash).toBe(b.trajectory.trajectory_hash);
    expect(a.law_compliance.compliance_hash).toBe(b.law_compliance.compliance_hash);
    expect(a.quality.quality_hash).toBe(b.quality.quality_hash);
    expect(a.forge_report.report_hash).toBe(b.forge_report.report_hash);
  });

  it('non-actuation E2E: forge does not modify creation', () => {
    const creation = forcePass(CREATION_A());
    const origHash = creation.output_hash;
    const origParaCount = creation.style_output.paragraphs.length;
    const origVerdict = creation.verdict;
    runForge(creation, DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    expect(creation.output_hash).toBe(origHash);
    expect(creation.style_output.paragraphs.length).toBe(origParaCount);
    expect(creation.verdict).toBe(origVerdict);
  });

  it('all invariants checked in result', () => {
    const result = runForge(forcePass(CREATION_A()), DEFAULT_F5_CONFIG, CANONICAL_TABLE, TIMESTAMP);
    const expectedIds: F5InvariantId[] = [
      'F5-INV-01', 'F5-INV-02', 'F5-INV-03', 'F5-INV-04',
      'F5-INV-05', 'F5-INV-06', 'F5-INV-07', 'F5-INV-08',
      'F5-INV-09', 'F5-INV-10', 'F5-INV-11', 'F5-INV-12',
      'F5-INV-13', 'F5-INV-14',
    ];
    for (const id of expectedIds) {
      expect(result.forge_report.invariants_checked).toContain(id);
    }
    expect(result.forge_report.invariants_checked).toHaveLength(14);
  });
});
