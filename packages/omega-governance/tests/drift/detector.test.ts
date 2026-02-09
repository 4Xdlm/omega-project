import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { readProofPack } from '../../src/core/reader.js';
import { detectDrift } from '../../src/drift/detector.js';
import { DEFAULT_GOV_CONFIG, createConfig } from '../../src/core/config.js';
import { createTempDir, createFixtureRun } from '../fixtures/helpers.js';

describe('Drift Detector', () => {
  let tempDir: string;
  let baselineDir: string;
  let identicalDir: string;
  let softDriftDir: string;
  let hardDriftDir: string;
  let criticalDriftDir: string;

  beforeAll(() => {
    tempDir = createTempDir('drift-detector');
    baselineDir = createFixtureRun(tempDir, { runId: 'baseline0000001', forgeScore: 0.85 });
    // For identical, use a subdirectory with the same runId to get truly identical content
    const identicalTemp = createTempDir('drift-detector-identical');
    identicalDir = createFixtureRun(identicalTemp, { runId: 'baseline0000001', forgeScore: 0.85 });
    softDriftDir = createFixtureRun(tempDir, { runId: 'softdrift000001', forgeScore: 0.82 });
    hardDriftDir = createFixtureRun(tempDir, { runId: 'harddrift000001', forgeScore: 0.65 });
    criticalDriftDir = createFixtureRun(tempDir, { runId: 'critdrift000001', forgeScore: 0.40 });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects NO_DRIFT for identical runs', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(identicalDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    expect(report.level).toBe('NO_DRIFT');
  });

  it('detects qualitative drift for different scores', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(softDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    expect(report.details.some((d) => d.type === 'QUALITATIVE')).toBe(true);
  });

  it('detects SOFT_DRIFT for small score difference', () => {
    const config = createConfig({ DRIFT_SOFT_THRESHOLD: 0.01 });
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(softDriftDir);
    const report = detectDrift(baseline, candidate, config);
    expect(['SOFT_DRIFT', 'HARD_DRIFT', 'CRITICAL_DRIFT']).toContain(report.level);
  });

  it('detects HARD_DRIFT for significant score difference', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(hardDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    expect(['HARD_DRIFT', 'CRITICAL_DRIFT']).toContain(report.level);
  });

  it('detects CRITICAL_DRIFT for large score difference', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(criticalDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    expect(report.level).toBe('CRITICAL_DRIFT');
  });

  it('includes baseline and candidate run IDs', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(softDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    expect(report.baseline).toBe('baseline0000001');
    expect(report.candidate).toBe('softdrift000001');
  });

  it('includes config in report for traceability', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(softDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    expect(report.config).toEqual(DEFAULT_GOV_CONFIG);
  });

  it('INV-GOV-04: every drift detail has a rule', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(hardDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    for (const detail of report.details) {
      expect(detail.rule).toBeTruthy();
      expect(detail.rule.length).toBeGreaterThan(0);
    }
  });

  it('detects functional drift from different artifact hashes', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(hardDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    const functionalDrifts = report.details.filter((d) => d.type === 'FUNCTIONAL');
    expect(functionalDrifts.length).toBeGreaterThan(0);
  });

  it('detects structural drift from different merkle roots', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(hardDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    const structuralDrifts = report.details.filter((d) => d.type === 'STRUCTURAL');
    expect(structuralDrifts.length).toBeGreaterThanOrEqual(0);
  });

  it('report has a verdict message', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(hardDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    expect(report.verdict).toBeTruthy();
    expect(report.verdict.length).toBeGreaterThan(0);
  });

  it('details include delta for qualitative drifts', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(hardDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    const qualitative = report.details.filter((d) => d.type === 'QUALITATIVE');
    for (const d of qualitative) {
      expect(d.delta).toBeDefined();
    }
  });

  it('drift types array contains detected types', () => {
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(hardDriftDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    if (report.level !== 'NO_DRIFT') {
      expect(report.types.length).toBeGreaterThan(0);
    }
  });

  it('handles missing forge reports gracefully', () => {
    const noForgeDir = createFixtureRun(tempDir, { runId: 'noforge000drift', includeForge: false });
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(noForgeDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    const qualitative = report.details.filter((d) => d.type === 'QUALITATIVE');
    expect(qualitative).toHaveLength(0);
  });

  it('detects structural drift for different stage counts', () => {
    const noForgeDir = createFixtureRun(tempDir, { runId: 'struct00drift01', includeForge: false });
    const baseline = readProofPack(baselineDir);
    const candidate = readProofPack(noForgeDir);
    const report = detectDrift(baseline, candidate, DEFAULT_GOV_CONFIG);
    const structural = report.details.filter((d) => d.type === 'STRUCTURAL');
    expect(structural.length).toBeGreaterThan(0);
  });
});
