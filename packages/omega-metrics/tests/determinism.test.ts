/**
 * OMEGA Metrics — Determinism Tests
 * Phase R-METRICS — Same input → same score → same hash
 * INV-RM-02 proof
 */

import { describe, it, expect } from 'vitest';
import { generateReport } from '../src/report/generator.js';
import { readRunArtifacts } from '../src/reader.js';
import { join } from 'node:path';

const GOLDEN_RUN_001 = join(process.cwd(), '../..', 'golden/h2/run_001');
const TIMESTAMP = '2026-02-10T23:00:00.000Z';

describe('Determinism (INV-RM-02)', () => {
  it('same input produces same report_hash on two runs', () => {
    const artifacts = readRunArtifacts(GOLDEN_RUN_001);

    const report1 = generateReport(artifacts, GOLDEN_RUN_001, TIMESTAMP);
    const report2 = generateReport(artifacts, GOLDEN_RUN_001, TIMESTAMP);

    expect(report1.report_hash).toBe(report2.report_hash);
  });

  it('same input produces identical scores', () => {
    const artifacts = readRunArtifacts(GOLDEN_RUN_001);

    const report1 = generateReport(artifacts, GOLDEN_RUN_001, TIMESTAMP);
    const report2 = generateReport(artifacts, GOLDEN_RUN_001, TIMESTAMP);

    expect(report1.score.global).toBe(report2.score.global);
    expect(report1.score.structural).toBe(report2.score.structural);
    expect(report1.score.semantic).toBe(report2.score.semantic);
    expect(report1.score.dynamic).toBe(report2.score.dynamic);
    expect(report1.score.status).toBe(report2.score.status);
  });

  it('same input produces identical structural metrics', () => {
    const artifacts = readRunArtifacts(GOLDEN_RUN_001);

    const report1 = generateReport(artifacts, GOLDEN_RUN_001, TIMESTAMP);
    const report2 = generateReport(artifacts, GOLDEN_RUN_001, TIMESTAMP);

    for (const key of Object.keys(report1.metrics.structural)) {
      const k = key as keyof typeof report1.metrics.structural;
      expect(report1.metrics.structural[k], `structural.${k}`).toBe(report2.metrics.structural[k]);
    }
  });

  it('same input produces identical semantic metrics', () => {
    const artifacts = readRunArtifacts(GOLDEN_RUN_001);

    const report1 = generateReport(artifacts, GOLDEN_RUN_001, TIMESTAMP);
    const report2 = generateReport(artifacts, GOLDEN_RUN_001, TIMESTAMP);

    for (const key of Object.keys(report1.metrics.semantic)) {
      const k = key as keyof typeof report1.metrics.semantic;
      expect(report1.metrics.semantic[k], `semantic.${k}`).toBe(report2.metrics.semantic[k]);
    }
  });

  it('different timestamp produces different report_hash but same scores', () => {
    const artifacts = readRunArtifacts(GOLDEN_RUN_001);

    const report1 = generateReport(artifacts, GOLDEN_RUN_001, '2026-02-10T00:00:00.000Z');
    const report2 = generateReport(artifacts, GOLDEN_RUN_001, '2026-02-11T00:00:00.000Z');

    // Scores must be identical (timestamp doesn't affect computation)
    expect(report1.score.global).toBe(report2.score.global);
    expect(report1.score.structural).toBe(report2.score.structural);

    // Hashes differ because timestamp is in the report
    expect(report1.report_hash).not.toBe(report2.report_hash);
  });
});
