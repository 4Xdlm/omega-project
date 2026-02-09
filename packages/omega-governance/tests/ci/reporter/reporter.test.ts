/**
 * OMEGA Governance — Reporter Tests
 * Phase F — INV-F-07: Report is a pure function of gate results
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { generateJSONReport } from '../../../src/ci/reporter/json-reporter.js';
import { generateMarkdownReport } from '../../../src/ci/reporter/markdown-reporter.js';
import { buildSummary, buildRecommendations } from '../../../src/ci/reporter/summary.js';
import { DEFAULT_CI_CONFIG } from '../../../src/ci/config.js';
import type { CIResult } from '../../../src/ci/types.js';
import type { GateResult } from '../../../src/ci/gates/types.js';

function createPassingResult(): CIResult {
  const gates: GateResult[] = [
    { gate: 'G0', name: 'Pre-check', verdict: 'PASS', duration_ms: 10, details: [], checks: [{ id: 'G0-1', status: 'PASS', message: 'ok' }] },
    { gate: 'G1', name: 'Replay', verdict: 'PASS', duration_ms: 20, details: [], checks: [{ id: 'G1-1', status: 'PASS', message: 'ok' }] },
    { gate: 'G2', name: 'Compare', verdict: 'PASS', duration_ms: 15, details: [], checks: [{ id: 'G2-1', status: 'PASS', message: 'ok' }] },
    { gate: 'G3', name: 'Drift', verdict: 'PASS', duration_ms: 12, details: [], checks: [{ id: 'G3-1', status: 'PASS', message: 'ok' }] },
    { gate: 'G4', name: 'Bench', verdict: 'PASS', duration_ms: 18, details: [], checks: [{ id: 'G4-1', status: 'PASS', message: 'ok' }] },
    { gate: 'G5', name: 'Certify', verdict: 'PASS', duration_ms: 25, details: [], checks: [{ id: 'G5-1', status: 'PASS', message: 'ok' }] },
  ];

  return {
    run_id: 'test-ci-001',
    baseline_version: 'v1.0.0',
    started_at: '2026-01-15T10:00:00.000Z',
    completed_at: '2026-01-15T10:00:01.000Z',
    duration_ms: 100,
    verdict: 'PASS',
    gates,
    config: DEFAULT_CI_CONFIG,
  };
}

function createFailingResult(): CIResult {
  const gates: GateResult[] = [
    { gate: 'G0', name: 'Pre-check', verdict: 'PASS', duration_ms: 10, details: [], checks: [] },
    { gate: 'G1', name: 'Replay', verdict: 'FAIL', duration_ms: 20, details: ['Mismatch'], checks: [{ id: 'G1-1', status: 'FAIL', message: 'fail' }] },
    { gate: 'G2', name: 'Compare', verdict: 'SKIPPED', duration_ms: 0, details: [], checks: [] },
    { gate: 'G3', name: 'Drift', verdict: 'SKIPPED', duration_ms: 0, details: [], checks: [] },
    { gate: 'G4', name: 'Bench', verdict: 'SKIPPED', duration_ms: 0, details: [], checks: [] },
    { gate: 'G5', name: 'Certify', verdict: 'SKIPPED', duration_ms: 0, details: [], checks: [] },
  ];

  return {
    run_id: 'test-ci-002',
    baseline_version: 'v1.0.0',
    started_at: '2026-01-15T10:00:00.000Z',
    completed_at: '2026-01-15T10:00:01.000Z',
    duration_ms: 30,
    verdict: 'FAIL',
    gates,
    failed_gate: 'G1',
    config: DEFAULT_CI_CONFIG,
  };
}

describe('JSON Reporter', () => {
  it('generates valid JSON report', () => {
    const result = createPassingResult();
    const report = generateJSONReport(result);
    expect(report.format).toBe('json');
    const parsed = JSON.parse(report.content);
    expect(parsed.result.verdict).toBe('PASS');
    expect(parsed.summary.total_gates).toBe(6);
  });

  it('includes filename with run_id', () => {
    const result = createPassingResult();
    const report = generateJSONReport(result);
    expect(report.filename).toContain('test-ci-001');
  });

  it('INV-F-07: same input produces same output (pure function)', () => {
    const result = createPassingResult();
    const report1 = generateJSONReport(result);
    const report2 = generateJSONReport(result);
    expect(report1.content).toBe(report2.content);
  });

  it('includes recommendations', () => {
    const result = createPassingResult();
    const report = generateJSONReport(result);
    const parsed = JSON.parse(report.content);
    expect(parsed.recommendations.length).toBeGreaterThan(0);
  });
});

describe('Markdown Reporter', () => {
  it('generates Markdown report', () => {
    const result = createPassingResult();
    const report = generateMarkdownReport(result);
    expect(report.format).toBe('markdown');
    expect(report.content).toContain('# OMEGA CI Report');
    expect(report.content).toContain('PASS');
  });

  it('includes gate results table', () => {
    const result = createPassingResult();
    const report = generateMarkdownReport(result);
    expect(report.content).toContain('G0');
    expect(report.content).toContain('G5');
  });

  it('includes failed gate details', () => {
    const result = createFailingResult();
    const report = generateMarkdownReport(result);
    expect(report.content).toContain('FAIL');
    expect(report.content).toContain('Recommendations');
  });

  it('INV-F-07: same input produces same Markdown output', () => {
    const result = createPassingResult();
    const md1 = generateMarkdownReport(result).content;
    const md2 = generateMarkdownReport(result).content;
    expect(md1).toBe(md2);
  });
});

describe('Summary Builder', () => {
  it('counts gates correctly for passing result', () => {
    const result = createPassingResult();
    const summary = buildSummary(result);
    expect(summary.total_gates).toBe(6);
    expect(summary.passed_gates).toBe(6);
    expect(summary.failed_gates).toBe(0);
    expect(summary.skipped_gates).toBe(0);
  });

  it('counts gates correctly for failing result', () => {
    const result = createFailingResult();
    const summary = buildSummary(result);
    expect(summary.passed_gates).toBe(1);
    expect(summary.failed_gates).toBe(1);
    expect(summary.skipped_gates).toBe(4);
  });
});

describe('Recommendations Builder', () => {
  it('recommends positive for all-pass', () => {
    const result = createPassingResult();
    const recs = buildRecommendations(result);
    expect(recs.some((r) => r.includes('All gates passed'))).toBe(true);
  });

  it('provides specific recommendation for G1 failure', () => {
    const result = createFailingResult();
    const recs = buildRecommendations(result);
    expect(recs.some((r) => r.includes('Replay'))).toBe(true);
  });
});
