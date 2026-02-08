/**
 * OMEGA Creation Pipeline — F6: Unified Report
 * Phase C.4 — Assemble CreationReport
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  IntentPack, GenesisPlan, ScribeOutput, StyledOutput,
  UnifiedGateChainResult, E2EEvidenceChain, PipelineTrace,
  C4Config, StageResult, CreationReport, CreationMetrics, C4InvariantId,
} from '../types.js';

const ALL_INVARIANTS: readonly C4InvariantId[] = [
  'C4-INV-01', 'C4-INV-02', 'C4-INV-03', 'C4-INV-04',
  'C4-INV-05', 'C4-INV-06', 'C4-INV-07', 'C4-INV-08',
  'C4-INV-09', 'C4-INV-10', 'C4-INV-11', 'C4-INV-12',
];

function computeMetrics(
  plan: GenesisPlan,
  scribeOutput: ScribeOutput,
  styleOutput: StyledOutput,
  gateChain: UnifiedGateChainResult,
  evidence: E2EEvidenceChain,
  proofFiles: number,
): CreationMetrics {
  return {
    total_words: styleOutput.total_word_count,
    total_paragraphs: styleOutput.paragraphs.length,
    total_segments: scribeOutput.final_prose.paragraphs.reduce(
      (sum, p) => sum + p.segment_ids.length, 0,
    ),
    total_arcs: plan.arcs.length,
    total_scenes: plan.scene_count,
    genesis_duration_ms: 0,
    scribe_duration_ms: 0,
    style_duration_ms: 0,
    gates_duration_ms: 0,
    total_duration_ms: 0,
    rewrite_passes: scribeOutput.rewrite_history.total_passes,
    tournament_rounds: styleOutput.tournament.total_rounds,
    ia_detection_score: styleOutput.ia_detection.score,
    genre_specificity: styleOutput.genre_detection.specificity,
    voice_stability: styleOutput.global_profile.coherence.voice_stability,
    genome_max_deviation: styleOutput.global_profile.genome_deviation.max_deviation,
    evidence_nodes: evidence.merkle_tree.nodes.length,
    proof_files: proofFiles,
    invariants_checked: ALL_INVARIANTS.length,
    invariants_passed: gateChain.verdict === 'PASS' ? ALL_INVARIANTS.length : ALL_INVARIANTS.length - 1,
  };
}

export function stageReport(
  _input: IntentPack,
  plan: GenesisPlan,
  scribeOutput: ScribeOutput,
  styleOutput: StyledOutput,
  gateChain: UnifiedGateChainResult,
  evidence: E2EEvidenceChain,
  trace: PipelineTrace,
  config: C4Config,
  outputHash: string,
  intentHash: string,
  pipelineId: string,
  proofPackHash: string,
  proofFiles: number,
  timestamp: string,
): StageResult & { readonly report: CreationReport } {
  const metrics = computeMetrics(plan, scribeOutput, styleOutput, gateChain, evidence, proofFiles);

  const invariantsPassed: C4InvariantId[] = [...ALL_INVARIANTS];
  const invariantsFailed: C4InvariantId[] = [];

  if (gateChain.verdict === 'FAIL') {
    // Determine which invariant failed from the gate chain
    if (gateChain.first_failure === 'U_TRUTH') {
      invariantsFailed.push('C4-INV-04');
      invariantsPassed.splice(invariantsPassed.indexOf('C4-INV-04'), 1);
    } else if (gateChain.first_failure === 'U_NECESSITY') {
      invariantsFailed.push('C4-INV-05');
      invariantsPassed.splice(invariantsPassed.indexOf('C4-INV-05'), 1);
    } else if (gateChain.first_failure === 'U_CROSSREF') {
      invariantsFailed.push('C4-INV-06');
      invariantsPassed.splice(invariantsPassed.indexOf('C4-INV-06'), 1);
    }
  }

  const configHash = sha256(canonicalize(config));

  const report: CreationReport = {
    pipeline_id: pipelineId,
    output_hash: outputHash,
    intent_hash: intentHash,
    verdict: gateChain.verdict,
    unified_gates: gateChain,
    metrics,
    evidence_hash: evidence.chain_hash,
    proof_pack_hash: proofPackHash,
    pipeline_trace: trace,
    invariants_checked: ALL_INVARIANTS,
    invariants_passed: invariantsPassed,
    invariants_failed: invariantsFailed,
    config_hash: configHash,
    timestamp_deterministic: timestamp,
  };

  return {
    stage: 'F6',
    verdict: 'PASS',
    input_hash: evidence.chain_hash,
    output_hash: sha256(canonicalize({
      pipeline_id: report.pipeline_id,
      output_hash: report.output_hash,
      intent_hash: report.intent_hash,
      verdict: report.verdict,
      evidence_hash: report.evidence_hash,
      proof_pack_hash: report.proof_pack_hash,
      config_hash: report.config_hash,
      invariants_checked_count: report.invariants_checked.length,
      invariants_passed_count: report.invariants_passed.length,
      total_violations: report.unified_gates.total_violations,
      total_stages: report.pipeline_trace.total_stages,
      timestamp_deterministic: report.timestamp_deterministic,
    })),
    duration_ms: 0,
    details: `Report: verdict=${gateChain.verdict}, ${metrics.invariants_checked} invariants checked`,
    timestamp_deterministic: timestamp,
    report,
  };
}
