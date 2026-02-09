/**
 * OMEGA Governance — Compare Report Builder
 * Phase D.2 — Generate comparison reports
 */

import type { CompareResult } from './types.js';

/** Build a JSON-serializable comparison report */
export function buildCompareReport(results: readonly CompareResult[]): object {
  return {
    comparison_count: results.length,
    results: results.map((r) => ({
      runs: r.runs,
      identical: r.identical,
      summary: r.summary,
      diffs: r.diffs,
      score_comparison: r.score_comparison,
    })),
  };
}

/** Build a markdown comparison report */
export function buildCompareMarkdown(results: readonly CompareResult[]): string {
  const lines: string[] = [
    '# OMEGA Governance — Comparison Report',
    '',
  ];

  for (const result of results) {
    lines.push(`## Runs: ${result.runs.join(' vs ')}`);
    lines.push('');
    lines.push(`**Identical**: ${result.identical ? 'YES' : 'NO'}`);
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('|--------|-------|');
    lines.push(`| Total Artifacts | ${result.summary.total_artifacts} |`);
    lines.push(`| Identical | ${result.summary.identical} |`);
    lines.push(`| Different | ${result.summary.different} |`);
    lines.push(`| Missing (left) | ${result.summary.missing_in_first} |`);
    lines.push(`| Missing (right) | ${result.summary.missing_in_second} |`);
    lines.push('');

    if (result.diffs.some((d) => d.status !== 'IDENTICAL')) {
      lines.push('### Differences');
      lines.push('');
      lines.push('| Path | Status | Hash Left | Hash Right |');
      lines.push('|------|--------|-----------|------------|');
      for (const d of result.diffs.filter((d) => d.status !== 'IDENTICAL')) {
        lines.push(`| ${d.path} | ${d.status} | ${d.hash_left ?? '-'} | ${d.hash_right ?? '-'} |`);
      }
      lines.push('');
    }

    if (result.score_comparison) {
      const sc = result.score_comparison;
      lines.push('### Score Deltas');
      lines.push('');
      lines.push('| Score | Delta |');
      lines.push('|-------|-------|');
      lines.push(`| Forge (composite) | ${sc.forge_score_delta.toFixed(4)} |`);
      lines.push(`| Emotion | ${sc.emotion_score_delta.toFixed(4)} |`);
      lines.push(`| Quality | ${sc.quality_score_delta.toFixed(4)} |`);
      for (const [k, v] of Object.entries(sc.m_scores)) {
        lines.push(`| ${k} | ${v.toFixed(4)} |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
