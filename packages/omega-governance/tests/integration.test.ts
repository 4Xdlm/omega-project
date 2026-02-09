import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readProofPack, collectFileStats } from '../src/core/reader.js';
import { validateProofPack } from '../src/core/validator.js';
import { compareRuns } from '../src/compare/run-differ.js';
import { detectDrift } from '../src/drift/detector.js';
import { certifyRun } from '../src/certify/certifier.js';
import { appendEvent, readEvents } from '../src/history/logger.js';
import { queryEvents } from '../src/history/query-engine.js';
import { analyzeTrends } from '../src/history/trend-analyzer.js';
import { DEFAULT_GOV_CONFIG } from '../src/core/config.js';
import { checkReadOnly, checkCompareSymmetric, checkDriftExplicit, checkCertStable, checkReportDerived } from '../src/invariants/index.js';
import { createTempDir, createFixtureRun, createRuntimeEvent } from './fixtures/helpers.js';

describe('Integration Tests', () => {
  let tempDir: string;
  let baselineDir: string;
  let candidateDir: string;

  beforeAll(() => {
    tempDir = createTempDir('integration');
    baselineDir = createFixtureRun(tempDir, { runId: 'intg_baseline01', forgeScore: 0.85 });
    candidateDir = createFixtureRun(tempDir, { runId: 'intg_candidat01', forgeScore: 0.70 });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('full pipeline: read -> validate -> compare -> drift -> certify', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(candidateDir);

    const bValidation = validateProofPack(baseline);
    const cValidation = validateProofPack(candidate);
    expect(bValidation.valid).toBe(true);
    expect(cValidation.valid).toBe(true);

    const comparison = compareRuns(baseline, candidate);
    expect(comparison.runs).toHaveLength(2);

    const drift = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    expect(drift.level).not.toBe('NO_DRIFT');

    const cert = certifyRun(baseline, DEFAULT_GOV_CONFIG);
    expect(cert.verdict).toBe('PASS');
  });

  it('INV-GOV-01: analysis does not modify source files', () => {
    const beforeStats = collectFileStats(baselineDir);
    const data = readProofPack(baselineDir);
    validateProofPack(data);
    certifyRun(data, DEFAULT_GOV_CONFIG);
    const afterStats = collectFileStats(baselineDir);
    const result = checkReadOnly(beforeStats, afterStats);
    expect(result.status).toBe('PASS');
  });

  it('INV-GOV-03: compare is symmetric', () => {
    const a = readProofPack(baselineDir);
    const b = readProofPack(candidateDir);
    const ab = compareRuns(a, b);
    const ba = compareRuns(b, a);
    const result = checkCompareSymmetric(ab, ba);
    expect(result.status).toBe('PASS');
  });

  it('INV-GOV-04: drift report has explicit rules', () => {
    const a = readProofPack(baselineDir);
    const b = readProofPack(candidateDir);
    const drift = detectDrift(a, b, DEFAULT_GOV_CONFIG);
    const result = checkDriftExplicit(drift);
    expect(result.status).toBe('PASS');
  });

  it('INV-GOV-06: certification is stable', () => {
    const data = readProofPack(baselineDir);
    const cert1 = certifyRun(data, DEFAULT_GOV_CONFIG);
    const cert2 = certifyRun(data, DEFAULT_GOV_CONFIG);
    const result = checkCertStable(cert1.signature, cert2.signature);
    expect(result.status).toBe('PASS');
  });

  it('INV-GOV-08: certificate score matches ProofPack', () => {
    const data = readProofPack(baselineDir);
    const cert = certifyRun(data, DEFAULT_GOV_CONFIG);
    const result = checkReportDerived(data, cert.scores.forge_score);
    expect(result.status).toBe('PASS');
  });

  it('history logging and querying works end-to-end', () => {
    const logPath = join(tempDir, 'integration-log.ndjson');
    const events = [
      createRuntimeEvent({ run_id: 'intg-run-1', status: 'SUCCESS', timestamp: '2026-01-10T00:00:00.000Z' }),
      createRuntimeEvent({ run_id: 'intg-run-2', status: 'FAIL', timestamp: '2026-01-15T00:00:00.000Z' }),
      createRuntimeEvent({ run_id: 'intg-run-3', status: 'SUCCESS', timestamp: '2026-01-20T00:00:00.000Z' }),
    ];
    for (const e of events) appendEvent(logPath, e);

    const all = readEvents(logPath);
    expect(all).toHaveLength(3);

    const filtered = queryEvents(all, { status: 'SUCCESS' }, DEFAULT_GOV_CONFIG);
    expect(filtered).toHaveLength(2);

    const trends = analyzeTrends(all, '2026-01');
    expect(trends.run_count).toBe(3);
    expect(trends.success_rate).toBeCloseTo(2 / 3, 4);
  });

  it('multiple runs can be compared and drifted in sequence', () => {
    const run3Dir = createFixtureRun(tempDir, { runId: 'intg_run3_0001', forgeScore: 0.60 });
    const baseline = readProofPack(baselineDir);
    const run2 = readProofPack(candidateDir);
    const run3 = readProofPack(run3Dir);

    const drift1 = detectDrift(baseline, run2, DEFAULT_GOV_CONFIG);
    const drift2 = detectDrift(baseline, run3, DEFAULT_GOV_CONFIG);

    expect(drift2.details.length).toBeGreaterThanOrEqual(drift1.details.length);
  });

  it('compare report builder works', async () => {
    const a = readProofPack(baselineDir);
    const b = readProofPack(candidateDir);
    const result = compareRuns(a, b);
    const { buildCompareReport } = await import('../src/compare/report-builder.js');
    const report = buildCompareReport([result]);
    const json = JSON.stringify(report);
    expect(json).toContain('comparison_count');
  });
});
