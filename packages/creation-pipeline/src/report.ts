/**
 * OMEGA Creation Pipeline — Report Generation
 * Phase C.4 — Unified report + markdown
 */

import type { CreationReport } from './types.js';

export function creationReportToMarkdown(report: CreationReport): string {
  const lines: string[] = [];
  lines.push('# OMEGA Creation Pipeline Report');
  lines.push(`**Pipeline ID**: ${report.pipeline_id}`);
  lines.push(`**Verdict**: ${report.verdict}`);
  lines.push(`**Timestamp**: ${report.timestamp_deterministic}`);
  lines.push('');

  lines.push('## Metrics');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Words | ${report.metrics.total_words} |`);
  lines.push(`| Total Paragraphs | ${report.metrics.total_paragraphs} |`);
  lines.push(`| Total Arcs | ${report.metrics.total_arcs} |`);
  lines.push(`| Total Scenes | ${report.metrics.total_scenes} |`);
  lines.push(`| Rewrite Passes | ${report.metrics.rewrite_passes} |`);
  lines.push(`| Tournament Rounds | ${report.metrics.tournament_rounds} |`);
  lines.push(`| IA Detection Score | ${report.metrics.ia_detection_score.toFixed(3)} |`);
  lines.push(`| Genre Specificity | ${report.metrics.genre_specificity.toFixed(3)} |`);
  lines.push(`| Voice Stability | ${report.metrics.voice_stability.toFixed(3)} |`);
  lines.push(`| Genome Max Deviation | ${report.metrics.genome_max_deviation.toFixed(3)} |`);
  lines.push(`| Evidence Nodes | ${report.metrics.evidence_nodes} |`);
  lines.push(`| Proof Files | ${report.metrics.proof_files} |`);
  lines.push('');

  lines.push('## Unified Gates');
  lines.push(`| Gate | Verdict |`);
  lines.push(`|------|---------|`);
  for (const gate of report.unified_gates.gate_results) {
    lines.push(`| ${gate.gate_id} | ${gate.verdict} |`);
  }
  lines.push('');

  lines.push('## Invariants');
  lines.push(`- Checked: ${report.invariants_checked.length}`);
  lines.push(`- Passed: ${report.invariants_passed.length}`);
  lines.push(`- Failed: ${report.invariants_failed.length}`);
  if (report.invariants_failed.length > 0) {
    lines.push(`- Failed IDs: ${report.invariants_failed.join(', ')}`);
  }
  lines.push('');

  lines.push('## Hashes');
  lines.push(`- Output: ${report.output_hash}`);
  lines.push(`- Intent: ${report.intent_hash}`);
  lines.push(`- Evidence: ${report.evidence_hash}`);
  lines.push(`- Proof-Pack: ${report.proof_pack_hash}`);
  lines.push(`- Config: ${report.config_hash}`);

  return lines.join('\n');
}
