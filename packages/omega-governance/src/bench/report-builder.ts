/**
 * OMEGA Governance — Bench Report Builder
 * Phase D.2 — Generate benchmark reports
 */

import type { BenchReport } from './types.js';

/** Build markdown benchmark report */
export function buildBenchMarkdown(report: BenchReport): string {
  const lines: string[] = [
    '# OMEGA Governance — Benchmark Report',
    '',
    `**Suite**: ${report.suite_name}`,
    `**Total Runs**: ${report.total_runs}`,
    `**Overall**: ${report.overall_pass ? 'PASS' : 'FAIL'}`,
    '',
    '## Aggregations',
    '',
    '| Intent | Runs | Avg Score | Min | Max | Variance | Avg Duration |',
    '|--------|------|-----------|-----|-----|----------|-------------|',
  ];

  for (const agg of report.aggregations) {
    lines.push(
      `| ${agg.intent_name} | ${agg.run_count} | ${agg.avg_forge_score.toFixed(4)} | ${agg.min_forge_score.toFixed(4)} | ${agg.max_forge_score.toFixed(4)} | ${agg.variance.toFixed(6)} | ${agg.avg_duration_ms.toFixed(0)}ms |`,
    );
  }

  lines.push('');
  lines.push('## Threshold Checks');
  lines.push('');
  lines.push('| Check | Status | Value | Threshold | Message |');
  lines.push('|-------|--------|-------|-----------|---------|');

  for (const check of report.threshold_checks) {
    lines.push(
      `| ${check.check} | ${check.status} | ${check.value.toFixed(4)} | ${check.threshold} | ${check.message} |`,
    );
  }

  return lines.join('\n');
}
