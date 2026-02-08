/**
 * OMEGA Phase Q — Deterministic Report Generation
 *
 * Produces JSON and Markdown reports from evaluation results.
 * Reports are deterministically reproducible: same input = same hash.
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type { QCaseResult, QConfig, QReport } from './types.js';
import { aggregateScores } from './evaluator.js';
import { hashConfig } from './config.js';

/**
 * Generate the complete QReport from evaluation results.
 *
 * The report_hash is computed from all fields except report_hash itself,
 * using canonical serialization for determinism.
 */
export function generateReport(
  caseResults: readonly QCaseResult[],
  config: QConfig,
  testsetHash: string,
  deterministicTimestamp: string
): QReport {
  const scores = aggregateScores(caseResults);
  const configHash = hashConfig(config);

  const reportWithoutHash = {
    version: '1.0.0',
    phase: 'Q',
    timestamp_deterministic: deterministicTimestamp,
    config_hash: configHash,
    testset_hash: testsetHash,
    scores,
    case_results: caseResults,
  };

  const reportHash = sha256(canonicalize(reportWithoutHash));

  return {
    ...reportWithoutHash,
    report_hash: reportHash,
  };
}

/**
 * Render QReport as deterministic JSON string.
 * Uses canonical serialization (sorted keys, no whitespace).
 */
export function renderReportJSON(report: QReport): string {
  return canonicalize(report);
}

/**
 * Render QReport as human-readable Markdown.
 */
export function renderReportMarkdown(report: QReport): string {
  const lines: string[] = [];

  lines.push('# OMEGA Phase Q — Evaluation Report');
  lines.push('');
  lines.push(`**Version**: ${report.version}`);
  lines.push(`**Phase**: ${report.phase}`);
  lines.push(`**Timestamp**: ${report.timestamp_deterministic}`);
  lines.push(`**Config Hash**: ${report.config_hash}`);
  lines.push(`**Testset Hash**: ${report.testset_hash}`);
  lines.push(`**Report Hash**: ${report.report_hash}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Cases | ${report.scores.total_cases} |`);
  lines.push(`| Passed | ${report.scores.passed} |`);
  lines.push(`| Failed | ${report.scores.failed} |`);
  lines.push(`| Pass Rate | ${(report.scores.pass_rate * 100).toFixed(1)}% |`);
  lines.push('');

  lines.push('## By Category');
  lines.push('');
  lines.push('| Category | Passed | Failed | Total |');
  lines.push('|----------|--------|--------|-------|');
  for (const [cat, score] of Object.entries(report.scores.by_category).sort(([a], [b]) => a.localeCompare(b))) {
    const s = score as { passed: number; failed: number; total: number };
    lines.push(`| ${cat} | ${s.passed} | ${s.failed} | ${s.total} |`);
  }
  lines.push('');

  lines.push('## By Invariant');
  lines.push('');
  lines.push('| Invariant | Violations |');
  lines.push('|-----------|------------|');
  for (const [inv, score] of Object.entries(report.scores.by_invariant).sort(([a], [b]) => a.localeCompare(b))) {
    const s = score as { violations: number };
    lines.push(`| ${inv} | ${s.violations} |`);
  }
  lines.push('');

  lines.push('## Case Results');
  lines.push('');
  lines.push('| Case ID | Category | Oracle-A | Oracle-B | Oracle-C | Final |');
  lines.push('|---------|----------|----------|----------|----------|-------|');
  for (const cr of report.case_results) {
    lines.push(`| ${cr.case_id} | ${cr.category} | ${cr.oracle_a.verdict} | ${cr.oracle_b.verdict} | ${cr.oracle_c.verdict} | ${cr.final_verdict} |`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Verify report hash integrity.
 * Recomputes the hash from all fields except report_hash and compares.
 */
export function verifyReportHash(report: QReport): boolean {
  const { report_hash: _, ...rest } = report;
  const expectedHash = sha256(canonicalize(rest));
  return report.report_hash === expectedHash;
}
