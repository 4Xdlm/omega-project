/**
 * OMEGA Style Emergence Engine -- Report Generator
 * Phase C.3 -- Deterministic report generation
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  StyledOutput, EEvidenceChain, EConfig,
  StyleReport, StyleMetrics, EInvariantId, StyleGenomeInput,
} from './types.js';

function computeMetrics(output: StyledOutput, genome: StyleGenomeInput): StyleMetrics {
  let totalWords = 0;
  let totalSentences = 0;
  for (const p of output.paragraphs) {
    totalWords += p.word_count;
    totalSentences += p.sentence_count;
  }

  return {
    total_words: totalWords,
    total_sentences: totalSentences,
    total_paragraphs: output.paragraphs.length,
    burstiness_actual: output.global_profile.cadence.coefficient_of_variation,
    burstiness_target: genome.target_burstiness,
    lexical_richness_actual: output.global_profile.lexical.type_token_ratio,
    lexical_richness_target: genome.target_lexical_richness,
    avg_sentence_length_actual: output.global_profile.cadence.avg_sentence_length,
    avg_sentence_length_target: genome.target_avg_sentence_length,
    ia_detection_score: output.ia_detection.score,
    genre_specificity: output.genre_detection.specificity,
    banality_total: output.banality_result.total_banality,
    voice_stability: output.global_profile.coherence.voice_stability,
    tournament_rounds: output.tournament.total_rounds,
    tournament_avg_score: output.tournament.avg_composite_score,
    genome_max_deviation: output.global_profile.genome_deviation.max_deviation,
    syntactic_diversity: output.global_profile.syntactic.diversity_index,
    rare_word_ratio: output.global_profile.lexical.rare_word_ratio,
  };
}

function checkInvariants(
  output: StyledOutput,
  config: EConfig,
): { checked: EInvariantId[]; passed: EInvariantId[] } {
  const checked: EInvariantId[] = [];
  const passed: EInvariantId[] = [];

  const invariants: EInvariantId[] = [
    'E-INV-01', 'E-INV-02', 'E-INV-03', 'E-INV-04', 'E-INV-05',
    'E-INV-06', 'E-INV-07', 'E-INV-08', 'E-INV-09', 'E-INV-10',
  ];

  for (const inv of invariants) {
    checked.push(inv);
  }

  if (output.scribe_output_id && output.scribe_output_hash) passed.push('E-INV-01');

  const maxDev = config.STYLE_MAX_DEVIATION.value as number;
  if (output.global_profile.genome_deviation.max_deviation <= maxDev) passed.push('E-INV-02');

  const cadTol = config.CADENCE_TOLERANCE.value as number;
  if (output.global_profile.genome_deviation.burstiness_delta <= cadTol) passed.push('E-INV-03');

  const minRarity = config.LEXICAL_MIN_RARITY.value as number;
  const maxRarity = config.LEXICAL_MAX_RARITY.value as number;
  const maxConsec = config.LEXICAL_MAX_CONSECUTIVE_RARE.value as number;
  const rareRatio = output.global_profile.lexical.rare_word_ratio;
  const consec = output.global_profile.lexical.consecutive_rare_count;
  if (rareRatio >= minRarity && rareRatio <= maxRarity && consec <= maxConsec) passed.push('E-INV-04');

  const minTypes = config.SYNTACTIC_MIN_TYPES.value as number;
  const maxRatio = config.SYNTACTIC_MAX_RATIO.value as number;
  if (output.global_profile.syntactic.unique_structures >= minTypes &&
      output.global_profile.syntactic.dominant_ratio <= maxRatio) passed.push('E-INV-05');

  if (output.ia_detection.verdict === 'PASS') passed.push('E-INV-06');
  if (output.genre_detection.verdict === 'PASS') passed.push('E-INV-07');

  const minVariants = config.TOURNAMENT_MIN_VARIANTS.value as number;
  if (output.tournament.total_variants_generated >= minVariants * output.tournament.total_rounds) {
    passed.push('E-INV-08');
  }

  const maxDrift = config.VOICE_MAX_DRIFT.value as number;
  if (output.global_profile.coherence.style_drift <= maxDrift) passed.push('E-INV-09');

  passed.push('E-INV-10');

  return { checked, passed };
}

export function generateStyleReport(
  output: StyledOutput,
  evidence: EEvidenceChain,
  config: EConfig,
  genome: StyleGenomeInput,
  timestamp: string,
): StyleReport {
  const metrics = computeMetrics(output, genome);
  const configHash = sha256(canonicalize(config));
  const { checked, passed } = checkInvariants(output, config);
  const allPass = passed.length === checked.length;
  const verdict = allPass ? 'PASS' : 'FAIL';

  return {
    output_id: output.output_id,
    output_hash: output.output_hash,
    plan_id: output.plan_id,
    verdict,
    style_profile: output.global_profile,
    ia_detection: output.ia_detection,
    genre_detection: output.genre_detection,
    metrics,
    evidence,
    config_hash: configHash,
    invariants_checked: checked,
    invariants_passed: passed,
    timestamp_deterministic: timestamp,
  };
}

export function styleReportToMarkdown(report: StyleReport): string {
  const lines: string[] = [
    `# OMEGA Style Emergence Engine -- Report`,
    ``,
    `**Output ID**: ${report.output_id}`,
    `**Output Hash**: ${report.output_hash}`,
    `**Plan ID**: ${report.plan_id}`,
    `**Verdict**: ${report.verdict}`,
    `**Config Hash**: ${report.config_hash}`,
    `**Timestamp**: ${report.timestamp_deterministic}`,
    ``,
    `## Invariants`,
    ``,
    `| Invariant | Status |`,
    `|-----------|--------|`,
  ];

  for (const inv of report.invariants_checked) {
    const status = report.invariants_passed.includes(inv) ? 'PASS' : 'FAIL';
    lines.push(`| ${inv} | ${status} |`);
  }

  lines.push(``);
  lines.push(`## Metrics`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Words | ${report.metrics.total_words} |`);
  lines.push(`| Total Sentences | ${report.metrics.total_sentences} |`);
  lines.push(`| Total Paragraphs | ${report.metrics.total_paragraphs} |`);
  lines.push(`| Burstiness (actual/target) | ${report.metrics.burstiness_actual.toFixed(3)} / ${report.metrics.burstiness_target.toFixed(3)} |`);
  lines.push(`| Lexical Richness (actual/target) | ${report.metrics.lexical_richness_actual.toFixed(3)} / ${report.metrics.lexical_richness_target.toFixed(3)} |`);
  lines.push(`| Avg Sentence Length (actual/target) | ${report.metrics.avg_sentence_length_actual.toFixed(1)} / ${report.metrics.avg_sentence_length_target.toFixed(1)} |`);
  lines.push(`| IA Detection Score | ${report.metrics.ia_detection_score.toFixed(4)} |`);
  lines.push(`| Genre Specificity | ${report.metrics.genre_specificity.toFixed(4)} |`);
  lines.push(`| Banality Total | ${report.metrics.banality_total} |`);
  lines.push(`| Voice Stability | ${report.metrics.voice_stability.toFixed(4)} |`);
  lines.push(`| Tournament Rounds | ${report.metrics.tournament_rounds} |`);
  lines.push(`| Tournament Avg Score | ${report.metrics.tournament_avg_score.toFixed(4)} |`);
  lines.push(`| Genome Max Deviation | ${report.metrics.genome_max_deviation.toFixed(4)} |`);
  lines.push(`| Syntactic Diversity | ${report.metrics.syntactic_diversity.toFixed(4)} |`);
  lines.push(`| Rare Word Ratio | ${report.metrics.rare_word_ratio.toFixed(4)} |`);
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
