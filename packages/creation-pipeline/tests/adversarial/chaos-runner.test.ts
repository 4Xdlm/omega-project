import { describe, it, expect } from 'vitest';
import { runChaos } from '../../src/adversarial/chaos-runner.js';
import { generateFuzzedPacks } from '../../src/adversarial/fuzz-generator.js';
import { INTENT_PACK_A, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP } from '../fixtures.js';
import type { FuzzCategory } from '../../src/types.js';

const CATEGORIES: FuzzCategory[] = ['contradiction', 'ambiguity', 'impossible_constraints', 'empty_fields', 'overflow', 'type_mismatch', 'circular_reference', 'hostile_content'];

describe('ChaosRunner', () => {
  const packs = generateFuzzedPacks(INTENT_PACK_A, 8, CATEGORIES);

  it('runs all packs', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(report.total_runs).toBe(8);
  });

  it('zero crashes', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(report.crash_count).toBe(0);
  });

  it('all handled gracefully', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(report.ungraceful_failures).toBe(0);
  });

  it('empty fields -> FAIL', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const empty = report.results.find(r => r.category === 'empty_fields');
    expect(empty?.verdict).toBe('FAIL');
    expect(empty?.handled_gracefully).toBe(true);
  });

  it('impossible constraints -> FAIL', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const imp = report.results.find(r => r.category === 'impossible_constraints');
    expect(imp?.verdict).toBe('FAIL');
    expect(imp?.handled_gracefully).toBe(true);
  });

  it('type mismatch -> FAIL', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const tm = report.results.find(r => r.category === 'type_mismatch');
    expect(tm?.verdict).toBe('FAIL');
    expect(tm?.handled_gracefully).toBe(true);
  });

  it('overflow -> handled', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const ov = report.results.find(r => r.category === 'overflow');
    expect(ov?.handled_gracefully).toBe(true);
  });

  it('hostile content -> handled', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const hc = report.results.find(r => r.category === 'hostile_content');
    expect(hc?.handled_gracefully).toBe(true);
  });

  it('contradiction -> handled', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const c = report.results.find(r => r.category === 'contradiction');
    expect(c?.handled_gracefully).toBe(true);
  });

  it('report hash computed', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(report.report_hash).toHaveLength(64);
  });

  it('deterministic', () => {
    const r1 = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const r2 = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    expect(r1.report_hash).toBe(r2.report_hash);
  });

  it('failure stage identified', () => {
    const report = runChaos(packs, DEFAULT_C4_CONFIG, DEFAULT_G_CONFIG, DEFAULT_S_CONFIG, DEFAULT_E_CONFIG, TIMESTAMP);
    const failedResults = report.results.filter(r => r.verdict === 'FAIL');
    for (const r of failedResults) {
      expect(r.failure_stage).toBeTruthy();
    }
  });
});
