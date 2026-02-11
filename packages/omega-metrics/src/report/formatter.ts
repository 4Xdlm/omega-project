/**
 * OMEGA Metrics — Report Formatter (Markdown)
 * Phase R-METRICS — Human-readable report
 */

import type { MetricsReport } from '../types.js';

export function formatReportMarkdown(report: MetricsReport): string {
  const lines: string[] = [];

  lines.push('# OMEGA Metrics Report');
  lines.push('');
  lines.push(`| Attribute | Value |`);
  lines.push(`|-----------|-------|`);
  lines.push(`| Run ID | ${report.run_id} |`);
  lines.push(`| Source | ${report.source_dir} |`);
  lines.push(`| Artifacts Hash | \`${report.artifacts_hash.substring(0, 16)}...\` |`);
  lines.push(`| Timestamp | ${report.timestamp} |`);
  lines.push(`| **Status** | **${report.score.status}** |`);
  lines.push(`| **Global Score** | **${report.score.global}** |`);
  lines.push('');

  // Category scores
  lines.push('## Category Scores');
  lines.push('');
  lines.push(`| Category | Score | Weight |`);
  lines.push(`|----------|-------|--------|`);
  lines.push(`| Structural | ${report.score.structural} | 0.40 |`);
  lines.push(`| Semantic | ${report.score.semantic} | 0.35 |`);
  lines.push(`| Dynamic | ${report.score.dynamic} | 0.25 |`);
  lines.push('');

  // Structural
  lines.push('## Structural Metrics (S1-S8)');
  lines.push('');
  lines.push(`| Metric | Score |`);
  lines.push(`|--------|-------|`);
  for (const [key, value] of Object.entries(report.metrics.structural)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');

  // Semantic
  lines.push('## Semantic Metrics (M1-M5)');
  lines.push('');
  lines.push(`| Metric | Score |`);
  lines.push(`|--------|-------|`);
  for (const [key, value] of Object.entries(report.metrics.semantic)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');

  // Dynamic
  lines.push('## Dynamic Metrics (D1-D4)');
  lines.push('');
  lines.push(`| Metric | Score |`);
  lines.push(`|--------|-------|`);
  for (const [key, value] of Object.entries(report.metrics.dynamic)) {
    lines.push(`| ${key} | ${value === null ? 'SKIP' : value} |`);
  }
  lines.push('');

  // Hard fails
  if (report.score.hard_fails.length > 0) {
    lines.push('## Hard Fails');
    lines.push('');
    for (const fail of report.score.hard_fails) {
      lines.push(`- ${fail}`);
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`Report Hash: \`${report.report_hash}\``);

  return lines.join('\n');
}
