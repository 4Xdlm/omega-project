/**
 * OMEGA Style Emergence Engine -- Main Orchestrator
 * Phase C.3 -- Pipeline E0->E6
 * E0: validate -> E1: profile -> E2: tournament -> E3: harmonize ->
 * E4: detect -> E5: validate -> E6: package
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { ScribeOutput, ProseParagraph } from '@omega/scribe-engine';
import type { StyleGenomeInput, Constraints } from '@omega/genesis-planner';
import type { EConfig, StyledOutput, StyledParagraph, StyleReport } from './types.js';
import { profileStyle } from './metrics/style-profiler.js';
import { runTournament } from './tournament/tournament-runner.js';
import { harmonize } from './harmonizer.js';
import { detectIA } from './detectors/ia-detector.js';
import { detectGenre } from './detectors/genre-detector.js';
import { detectBanality } from './detectors/banality-detector.js';
import { createEEvidenceChainBuilder } from './evidence.js';
import { generateStyleReport } from './report.js';

function validateInputs(
  scribeOutput: ScribeOutput | null | undefined,
  genome: StyleGenomeInput,
  constraints: Constraints,
  config: EConfig,
): { valid: boolean; reason: string } {
  if (!scribeOutput) {
    return { valid: false, reason: 'ScribeOutput is null or undefined (E-INV-01)' };
  }
  if (!scribeOutput.final_prose || scribeOutput.final_prose.paragraphs.length === 0) {
    return { valid: false, reason: 'ScribeOutput has no paragraphs (E-INV-01)' };
  }
  if (!genome) {
    return { valid: false, reason: 'Genome is missing' };
  }
  if (!constraints) {
    return { valid: false, reason: 'Constraints are missing' };
  }
  if (!config) {
    return { valid: false, reason: 'Config is missing' };
  }
  return { valid: true, reason: '' };
}

function buildFailOutput(
  scribeOutput: ScribeOutput | null | undefined,
  reason: string,
  config: EConfig,
  genome: StyleGenomeInput,
  timestamp: string,
): { output: StyledOutput; report: StyleReport } {
  const outputId = `EOUT-FAIL-${sha256(reason).slice(0, 16)}`;
  const emptyProfile = profileStyle([], genome, timestamp);

  const failOutput: StyledOutput = {
    output_id: outputId,
    output_hash: '',
    scribe_output_id: scribeOutput?.output_id ?? 'NONE',
    scribe_output_hash: scribeOutput?.output_hash ?? '',
    plan_id: scribeOutput?.plan_id ?? 'NONE',
    paragraphs: [],
    global_profile: emptyProfile,
    ia_detection: { score: 0, patterns_found: [], pattern_count: 0, verdict: 'FAIL', details: [] },
    genre_detection: { genre_scores: {}, top_genre: 'none', top_score: 0, specificity: 0, verdict: 'FAIL', genre_markers_found: [] },
    banality_result: { cliche_count: 0, ia_speak_count: 0, generic_transition_count: 0, total_banality: 0, verdict: 'FAIL', findings: [] },
    tournament: { tournament_id: 'NONE', tournament_hash: '', rounds: [], total_variants_generated: 0, total_rounds: 0, avg_composite_score: 0 },
    total_word_count: 0,
  };

  const evidence = createEEvidenceChainBuilder(outputId, timestamp);
  evidence.addStep('validate-inputs', sha256(reason), sha256('FAIL'), `E-INV-01: ${reason}`, 'FAIL');
  const chain = evidence.build();
  const report = generateStyleReport(failOutput, chain, config, genome, timestamp);

  return { output: failOutput, report };
}

export function runStyleEmergence(
  scribeOutput: ScribeOutput,
  genome: StyleGenomeInput,
  constraints: Constraints,
  config: EConfig,
  timestamp: string,
): { output: StyledOutput; report: StyleReport } {
  const evidence = createEEvidenceChainBuilder('', timestamp);

  // E0: VALIDATE INPUTS
  const validation = validateInputs(scribeOutput, genome, constraints, config);
  if (!validation.valid) {
    return buildFailOutput(scribeOutput, validation.reason, config, genome, timestamp);
  }

  const inputHash = sha256(canonicalize({
    scribe_hash: scribeOutput.output_hash,
    genome_hash: sha256(canonicalize(genome)),
    constraints_hash: sha256(canonicalize(constraints)),
  }));
  evidence.addStep('E0-validate', inputHash, sha256('PASS'), 'E-INV-01: all inputs valid', 'PASS');

  const paragraphs = scribeOutput.final_prose.paragraphs;

  // E1: PROFILE BASELINE
  const maxDev = config.STYLE_MAX_DEVIATION.value as number;
  const baselineProfile = profileStyle(paragraphs, genome, timestamp, maxDev);
  evidence.addStep('E1-profile-baseline', scribeOutput.output_hash, baselineProfile.profile_hash, 'Baseline style profiling', 'PASS');

  // E2: TOURNAMENT
  const tournament = runTournament(paragraphs, genome, constraints, config, timestamp);
  evidence.addStep('E2-tournament', baselineProfile.profile_hash, tournament.tournament_hash, 'Tournament self-play', 'PASS');

  // Build StyledParagraphs from tournament results
  const styledParagraphs: StyledParagraph[] = tournament.rounds.map((round) => {
    const selectedVariant = round.variants.find((v) => v.variant_id === round.selected_variant_id);
    const text = selectedVariant?.text ?? '';
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

    return {
      paragraph_id: `ESTYLE-${round.paragraph_id}`,
      original_paragraph_id: round.paragraph_id,
      text,
      word_count: words.length,
      sentence_count: sentences.length,
      selected_variant_id: round.selected_variant_id,
      style_profile: selectedVariant?.style_profile ?? baselineProfile,
    };
  });

  // E3: HARMONIZE
  const { paragraphs: harmonized, coherence } = harmonize(styledParagraphs, config, genome, timestamp);
  const harmonizeHash = sha256(canonicalize(harmonized.map((p) => p.paragraph_id)));
  evidence.addStep('E3-harmonize', tournament.tournament_hash, harmonizeHash, 'Voice harmonization', 'PASS');

  // Build prose paragraphs for detectors
  const proseParagraphs: ProseParagraph[] = harmonized.map((sp) => ({
    paragraph_id: sp.paragraph_id,
    segment_ids: [],
    text: sp.text,
    word_count: sp.word_count,
    sentence_count: sp.sentence_count,
    avg_sentence_length: sp.sentence_count > 0 ? sp.word_count / sp.sentence_count : 0,
    emotion: '',
    intensity: 0,
    rhetorical_devices: [],
    sensory_anchors: [],
    motif_refs: [],
    canon_refs: [],
  }));

  // E4: DETECT
  const iaDetection = detectIA(proseParagraphs, config);
  const genreDetection = detectGenre(proseParagraphs, config);
  const banalityResult = detectBanality(proseParagraphs, constraints, config);
  evidence.addStep('E4-detect-ia', harmonizeHash, sha256(canonicalize(iaDetection)), 'IA detection', iaDetection.verdict);
  evidence.addStep('E4-detect-genre', harmonizeHash, sha256(canonicalize(genreDetection)), 'Genre detection', genreDetection.verdict);
  evidence.addStep('E4-detect-banality', harmonizeHash, sha256(canonicalize(banalityResult)), 'Banality detection', banalityResult.verdict);

  // Global profile with coherence
  const globalProfile = profileStyle(proseParagraphs, genome, timestamp, maxDev, coherence);

  // E5: VALIDATE (all invariants checked in report)
  evidence.addStep('E5-validate', sha256(canonicalize(globalProfile)), sha256('checked'), 'Invariant validation', 'PASS');

  // E6: PACKAGE
  let totalWordCount = 0;
  for (const p of harmonized) {
    totalWordCount += p.word_count;
  }

  const outputWithoutHash = {
    output_id: '',
    scribe_output_id: scribeOutput.output_id,
    scribe_output_hash: scribeOutput.output_hash,
    plan_id: scribeOutput.plan_id,
    paragraphs: harmonized,
    global_profile: globalProfile,
    ia_detection: iaDetection,
    genre_detection: genreDetection,
    banality_result: banalityResult,
    tournament,
    total_word_count: totalWordCount,
  };

  const outputHash = sha256(canonicalize(outputWithoutHash));
  const outputId = `EOUT-${outputHash.slice(0, 16)}`;

  const output: StyledOutput = {
    ...outputWithoutHash,
    output_id: outputId,
    output_hash: outputHash,
  };

  evidence.addStep('E6-package', sha256(canonicalize(outputWithoutHash)), outputHash, 'Output packaging', 'PASS');

  // Rebuild evidence with final output_id
  const finalEvidence = createEEvidenceChainBuilder(outputId, timestamp);
  for (const step of evidence.build().steps) {
    finalEvidence.addStep(step.step, step.input_hash, step.output_hash, step.rule_applied, step.verdict);
  }
  const evidenceChain = finalEvidence.build();

  // Generate report
  const report = generateStyleReport(output, evidenceChain, config, genome, timestamp);

  return { output, report };
}
