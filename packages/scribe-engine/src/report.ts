/**
 * OMEGA Scribe Engine -- Report Generator
 * Phase C.2 -- Deterministic report generation
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  ScribeOutput, SEvidenceChain, SConfig,
  ScribeReport, ScribeMetrics,
} from './types.js';

function computeMetrics(output: ScribeOutput): ScribeMetrics {
  const prose = output.final_prose;
  const totalWords = prose.total_word_count;
  const totalSentences = prose.total_sentence_count;
  const totalParagraphs = prose.paragraphs.length;

  let totalSensory = 0;
  let totalMotifs = 0;
  let totalRhetorical = 0;
  const uniqueWords = new Set<string>();
  let dialogueWords = 0;
  let descriptionWords = 0;

  for (const para of prose.paragraphs) {
    totalSensory += para.sensory_anchors.length;
    totalMotifs += para.motif_refs.length;
    totalRhetorical += para.rhetorical_devices.length;

    const words = para.text.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
    for (const w of words) uniqueWords.add(w);

    // Dialogue detection
    const dialogueMatches = para.text.match(/"[^"]*"/g) || [];
    for (const dm of dialogueMatches) {
      dialogueWords += dm.split(/\s+/).length;
    }

    // Description density: non-dialogue, non-action words
    descriptionWords += Math.floor(words.length * 0.6);
  }

  const avgSentLength = totalSentences > 0 ? totalWords / totalSentences : 0;
  const lexicalRichness = totalWords > 0 ? Math.min(1, uniqueWords.size / totalWords) : 0;
  const dialogueRatio = totalWords > 0 ? dialogueWords / totalWords : 0;
  const descriptionDensity = totalWords > 0 ? descriptionWords / totalWords : 0;

  // Burstiness
  const sentenceLengths = prose.paragraphs
    .filter((p) => p.sentence_count > 0)
    .map((p) => p.word_count / p.sentence_count);
  let burstiness = 0;
  if (sentenceLengths.length > 1) {
    const mean = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sentenceLengths.length;
    burstiness = Math.min(1, Math.sqrt(variance) / (mean || 1));
  }

  // Count banalities (should be 0)
  const banalityCount = output.gate_result.gate_results
    .filter((g) => g.gate_id === 'BANALITY_GATE')
    .reduce((acc, g) => acc + g.violations.length, 0);

  const unsupportedCount = output.gate_result.gate_results
    .filter((g) => g.gate_id === 'TRUTH_GATE')
    .reduce((acc, g) => acc + g.violations.length, 0);

  // Emotion pivot coverage from oracle
  const emotionOracle = output.oracle_result.oracle_results
    .find((o) => o.oracle_id === 'ORACLE_EMOTION');
  const emotionCoverage = emotionOracle ? emotionOracle.score : 0;

  // Necessity ratio from gate
  const necessityGate = output.gate_result.gate_results
    .find((g) => g.gate_id === 'NECESSITY_GATE');
  const necessityRatio = necessityGate ? (necessityGate.metrics['necessity_ratio'] ?? 1) : 1;

  // Total segments from skeleton
  const totalSegments = Object.keys(output.segment_to_paragraph_map).length;

  return {
    total_words: totalWords,
    total_sentences: totalSentences,
    total_paragraphs: totalParagraphs,
    total_segments: totalSegments,
    avg_sentence_length: avgSentLength,
    burstiness,
    lexical_richness: lexicalRichness,
    dialogue_ratio: dialogueRatio,
    description_density: descriptionDensity,
    sensory_anchor_count: totalSensory,
    motif_count: totalMotifs,
    rhetorical_device_count: totalRhetorical,
    banality_count: banalityCount,
    unsupported_claim_count: unsupportedCount,
    emotion_pivot_coverage: emotionCoverage,
    necessity_ratio: necessityRatio,
    rewrite_passes: output.rewrite_history.total_passes,
  };
}

export function generateScribeReport(
  output: ScribeOutput,
  evidence: SEvidenceChain,
  config: SConfig,
  timestamp: string,
): ScribeReport {
  const metrics = computeMetrics(output);
  const configHash = sha256(canonicalize(config));

  const verdict = output.gate_result.verdict === 'PASS' && output.oracle_result.verdict === 'PASS'
    ? 'PASS' : 'FAIL';

  return {
    output_id: output.output_id,
    output_hash: output.output_hash,
    plan_id: output.plan_id,
    verdict,
    gate_result: output.gate_result,
    oracle_result: output.oracle_result,
    metrics,
    evidence,
    config_hash: configHash,
    timestamp_deterministic: timestamp,
  };
}

export function scribeReportToMarkdown(report: ScribeReport): string {
  const lines: string[] = [
    `# OMEGA Scribe Engine — Report`,
    ``,
    `**Output ID**: ${report.output_id}`,
    `**Output Hash**: ${report.output_hash}`,
    `**Plan ID**: ${report.plan_id}`,
    `**Verdict**: ${report.verdict}`,
    `**Config Hash**: ${report.config_hash}`,
    `**Timestamp**: ${report.timestamp_deterministic}`,
    ``,
    `## Metrics`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Words | ${report.metrics.total_words} |`,
    `| Total Sentences | ${report.metrics.total_sentences} |`,
    `| Total Paragraphs | ${report.metrics.total_paragraphs} |`,
    `| Total Segments | ${report.metrics.total_segments} |`,
    `| Avg Sentence Length | ${report.metrics.avg_sentence_length.toFixed(1)} |`,
    `| Burstiness | ${report.metrics.burstiness.toFixed(3)} |`,
    `| Lexical Richness | ${report.metrics.lexical_richness.toFixed(3)} |`,
    `| Dialogue Ratio | ${report.metrics.dialogue_ratio.toFixed(3)} |`,
    `| Description Density | ${report.metrics.description_density.toFixed(3)} |`,
    `| Sensory Anchors | ${report.metrics.sensory_anchor_count} |`,
    `| Motifs | ${report.metrics.motif_count} |`,
    `| Rhetorical Devices | ${report.metrics.rhetorical_device_count} |`,
    `| Banality Count | ${report.metrics.banality_count} |`,
    `| Unsupported Claims | ${report.metrics.unsupported_claim_count} |`,
    `| Emotion Pivot Coverage | ${report.metrics.emotion_pivot_coverage.toFixed(3)} |`,
    `| Necessity Ratio | ${report.metrics.necessity_ratio.toFixed(3)} |`,
    `| Rewrite Passes | ${report.metrics.rewrite_passes} |`,
    ``,
    `## Gates`,
    ``,
    `| Gate | Verdict | Violations |`,
    `|------|---------|------------|`,
  ];

  for (const g of report.gate_result.gate_results) {
    lines.push(`| ${g.gate_id} | ${g.verdict} | ${g.violations.length} |`);
  }

  lines.push(``);
  lines.push(`## Oracles`);
  lines.push(``);
  lines.push(`| Oracle | Verdict | Score |`);
  lines.push(`|--------|---------|-------|`);

  for (const o of report.oracle_result.oracle_results) {
    lines.push(`| ${o.oracle_id} | ${o.verdict} | ${o.score.toFixed(3)} |`);
  }

  lines.push(``);
  lines.push(`## Evidence Chain`);
  lines.push(``);
  lines.push(`**Chain Hash**: ${report.evidence.chain_hash}`);
  lines.push(`**Steps**: ${report.evidence.steps.length}`);
  lines.push(``);

  for (const step of report.evidence.steps) {
    lines.push(`- **${step.step}**: ${step.verdict} (${step.rule_applied})`);
  }

  return lines.join('\n');
}
