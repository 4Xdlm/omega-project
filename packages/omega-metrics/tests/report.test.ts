/**
 * OMEGA Metrics — Report Generator Tests
 * Phase R-METRICS — Gate 6
 */

import { describe, it, expect } from 'vitest';
import { generateReport, DEFAULT_METRIC_CONFIG } from '../src/report/generator.js';
import { formatReportMarkdown } from '../src/report/formatter.js';
import { readRunArtifacts } from '../src/reader.js';
import { join } from 'node:path';

const GOLDEN_RUN_001 = join(process.cwd(), '../..', 'golden/h2/run_001');

describe('generateReport', () => {
  it('produces a valid MetricsReport from golden run', () => {
    const artifacts = readRunArtifacts(GOLDEN_RUN_001);
    const report = generateReport(artifacts, GOLDEN_RUN_001, '2026-02-10T23:00:00.000Z');

    expect(report.report_version).toBe('1.0.0');
    expect(report.run_id).toBeTruthy();
    expect(report.timestamp).toBe('2026-02-10T23:00:00.000Z');
    expect(report.score.status).toBeDefined();
    expect(report.score.global).toBeGreaterThanOrEqual(0);
    expect(report.score.global).toBeLessThanOrEqual(1);
    expect(report.report_hash).toBeTruthy();
  });

  it('includes all 17 metric fields', () => {
    const artifacts = readRunArtifacts(GOLDEN_RUN_001);
    const report = generateReport(artifacts, GOLDEN_RUN_001, '2026-02-10T23:00:00.000Z');

    // 8 structural
    expect(Object.keys(report.metrics.structural)).toHaveLength(8);
    // 6 semantic (including canon_violation_count)
    expect(Object.keys(report.metrics.semantic)).toHaveLength(6);
    // 4 dynamic
    expect(Object.keys(report.metrics.dynamic)).toHaveLength(4);
  });

  it('produces evidence entries', () => {
    const artifacts = readRunArtifacts(GOLDEN_RUN_001);
    const report = generateReport(artifacts, GOLDEN_RUN_001, '2026-02-10T23:00:00.000Z');

    expect(report.evidence.length).toBeGreaterThan(0);
    for (const e of report.evidence) {
      expect(e.metric).toBeTruthy();
      expect(typeof e.value).toBe('number');
    }
  });
});

describe('formatReportMarkdown', () => {
  it('produces valid markdown', () => {
    const artifacts = readRunArtifacts(GOLDEN_RUN_001);
    const report = generateReport(artifacts, GOLDEN_RUN_001, '2026-02-10T23:00:00.000Z');
    const md = formatReportMarkdown(report);

    expect(md).toContain('# OMEGA Metrics Report');
    expect(md).toContain(report.score.status);
    expect(md).toContain('Structural');
    expect(md).toContain('Semantic');
    expect(md).toContain('Dynamic');
  });
});
