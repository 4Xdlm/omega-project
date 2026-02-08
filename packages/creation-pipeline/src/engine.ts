/**
 * OMEGA Creation Pipeline — Main Orchestrator
 * Phase C.4 — Pipeline F0→F8
 * F0: validate → F1: genesis → F2: scribe → F3: style →
 * F4: gates → F5: evidence → F6: report → F7: proofpack → F8: package
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { GConfig } from '@omega/genesis-planner';
import type { SConfig } from '@omega/scribe-engine';
import type { EConfig } from '@omega/style-emergence-engine';
import type {
  IntentPack, C4Config, CreationResult, CreationReport,
  StageResult, PipelineTrace,
} from './types.js';
import { stageValidate } from './pipeline/stage-validate.js';
import { stageGenesis } from './pipeline/stage-genesis.js';
import { stageScribe } from './pipeline/stage-scribe.js';
import { stageStyle } from './pipeline/stage-style.js';
import { stageUnifiedGates } from './pipeline/stage-gates.js';
import { stageEvidence } from './pipeline/stage-evidence.js';
import { stageReport } from './pipeline/stage-report.js';
import { stageProofPack } from './pipeline/stage-proofpack.js';
import { hashIntentPack } from './intent-pack.js';

function buildFailResult(
  input: IntentPack,
  stageResults: StageResult[],
  _failDetails: string,
  timestamp: string,
): CreationResult {
  const intentHash = sha256(canonicalize(input));
  const pipelineId = `CPIPE-FAIL-${intentHash.slice(0, 16)}`;

  const trace: PipelineTrace = {
    stages: stageResults,
    total_stages: stageResults.length,
    passed_stages: stageResults.filter((s) => s.verdict === 'PASS').length,
    first_failure: stageResults.find((s) => s.verdict === 'FAIL')?.stage ?? null,
  };

  const emptyGateChain = { verdict: 'FAIL' as const, gate_results: [], first_failure: null, total_violations: 0 };
  const emptyMerkle = { root_hash: '', nodes: [], leaf_count: 0, depth: 0 };
  const emptyEvidence = {
    pipeline_id: pipelineId, merkle_tree: emptyMerkle, paragraph_traces: [],
    stage_results: stageResults, genesis_evidence_hash: '', scribe_evidence_hash: '',
    style_evidence_hash: '', chain_hash: '',
  };
  const emptyManifest = {
    manifest_version: '1.0.0', pipeline_id: pipelineId, root_hash: '',
    files: [], created_at: timestamp, total_files: 0, total_bytes: 0,
  };
  const emptyProofPack = { manifest: emptyManifest, root_hash: '', merkle_tree: emptyMerkle, verifiable: false };
  const emptyMetrics = {
    total_words: 0, total_paragraphs: 0, total_segments: 0, total_arcs: 0, total_scenes: 0,
    genesis_duration_ms: 0, scribe_duration_ms: 0, style_duration_ms: 0, gates_duration_ms: 0,
    total_duration_ms: 0, rewrite_passes: 0, tournament_rounds: 0, ia_detection_score: 0,
    genre_specificity: 0, voice_stability: 0, genome_max_deviation: 0, evidence_nodes: 0,
    proof_files: 0, invariants_checked: 0, invariants_passed: 0,
  };
  const emptyReport: CreationReport = {
    pipeline_id: pipelineId, output_hash: '', intent_hash: intentHash, verdict: 'FAIL',
    unified_gates: emptyGateChain, metrics: emptyMetrics, evidence_hash: '',
    proof_pack_hash: '', pipeline_trace: trace, invariants_checked: [], invariants_passed: [],
    invariants_failed: [], config_hash: '', timestamp_deterministic: timestamp,
  };

  // Need minimal styled/scribe/genesis for the result shape
  const emptyStyledOutput = {
    output_id: '', output_hash: '', scribe_output_id: '', scribe_output_hash: '',
    plan_id: '', paragraphs: [], global_profile: {} as any,
    ia_detection: { score: 0, patterns_found: [], pattern_count: 0, verdict: 'FAIL' as const, details: [] },
    genre_detection: { genre_scores: {}, top_genre: 'none', top_score: 0, specificity: 0, verdict: 'FAIL' as const, genre_markers_found: [] },
    banality_result: { cliche_count: 0, ia_speak_count: 0, generic_transition_count: 0, total_banality: 0, verdict: 'FAIL' as const, findings: [] },
    tournament: { tournament_id: '', tournament_hash: '', rounds: [], total_variants_generated: 0, total_rounds: 0, avg_composite_score: 0 },
    total_word_count: 0,
  };
  const emptyScribeOutput = {
    output_id: '', output_hash: '', plan_id: '', plan_hash: '', skeleton_hash: '',
    final_prose: { prose_id: '', prose_hash: '', skeleton_id: '', paragraphs: [], total_word_count: 0, total_sentence_count: 0, pass_number: 0 },
    rewrite_history: { candidates: [], accepted_pass: 0, total_passes: 0, rewrite_hash: '' }, gate_result: { verdict: 'FAIL' as const, gate_results: [], first_failure: null, total_violations: 0 },
    oracle_result: { verdict: 'FAIL' as const, oracle_results: [], first_failure: null, total_violations: 0, weakest_oracle: null, combined_score: 0 },
    segment_to_paragraph_map: {},
  };
  const emptyPlan = {
    plan_id: '', plan_hash: '', version: '1.0.0' as const, intent_hash: '', canon_hash: '', constraints_hash: '',
    genome_hash: '', emotion_hash: '', arcs: [], seed_registry: [], tension_curve: [],
    emotion_trajectory: [], scene_count: 0, beat_count: 0, estimated_word_count: 0,
  };

  return {
    pipeline_id: pipelineId, output_hash: '', intent_hash: intentHash,
    final_text: emptyStyledOutput, genesis_plan: emptyPlan,
    scribe_output: emptyScribeOutput, style_output: emptyStyledOutput,
    unified_gates: emptyGateChain, evidence: emptyEvidence,
    proof_pack: emptyProofPack, report: emptyReport,
    pipeline_trace: trace, verdict: 'FAIL',
  };
}

export function runCreation(
  input: IntentPack,
  config: C4Config,
  gConfig: GConfig,
  sConfig: SConfig,
  eConfig: EConfig,
  timestamp: string,
): CreationResult {
  const stageResults: StageResult[] = [];

  // F0: VALIDATE
  const f0 = stageValidate(input, config, timestamp);
  stageResults.push(f0);
  if (f0.verdict === 'FAIL') {
    return buildFailResult(input, stageResults, f0.details, timestamp);
  }

  // F1: GENESIS
  const f1 = stageGenesis(f0.normalizedInput, f0.input_hash, gConfig, timestamp);
  stageResults.push(f1);

  // F2: SCRIBE
  const f2 = stageScribe(f1.plan, f0.normalizedInput, sConfig, timestamp);
  stageResults.push(f2);

  // F3: STYLE
  const f3 = stageStyle(f2.scribeOutput, f0.normalizedInput, eConfig, timestamp);
  stageResults.push(f3);

  // F4: UNIFIED GATES
  const f4 = stageUnifiedGates(f3.styleOutput, f1.plan, f0.normalizedInput, config, timestamp);
  stageResults.push(f4);

  // Determine pipeline verdict from gates
  const pipelineVerdict = f4.gateChain.verdict;

  // F5: EVIDENCE (always built, even on FAIL)
  // Use flattened hashes to avoid stack overflow on deeply nested report objects
  const genesisEvidenceHash = sha256(
    [f1.plan.plan_hash, 'genesis-evidence', timestamp].join('\0'),
  );
  const scribeEvidenceHash = sha256(
    [f2.scribeOutput.output_hash, 'scribe-evidence', timestamp].join('\0'),
  );
  const styleEvidenceHash = sha256(
    [f3.styleOutput.output_hash, 'style-evidence', timestamp].join('\0'),
  );

  const intentHash = hashIntentPack(f0.normalizedInput);
  const pipelineId = `CPIPE-${intentHash.slice(0, 16)}`;

  const f5 = stageEvidence(
    f3.styleOutput, f1.plan, f2.scribeOutput, f0.normalizedInput,
    pipelineId, stageResults,
    genesisEvidenceHash, scribeEvidenceHash, styleEvidenceHash,
    timestamp,
  );
  stageResults.push(f5);

  // F7: PROOF-PACK (before report so we can include proof hash in report)
  const proofPackVersion = config.PROOF_PACK_VERSION.value as string;
  const f7 = stageProofPack(
    f0.normalizedInput, f1.plan, f2.scribeOutput, f3.styleOutput,
    f5.evidence, null, pipelineId, proofPackVersion, timestamp,
  );

  // F6: REPORT
  const trace: PipelineTrace = {
    stages: stageResults,
    total_stages: stageResults.length,
    passed_stages: stageResults.filter((s) => s.verdict === 'PASS').length,
    first_failure: stageResults.find((s) => s.verdict === 'FAIL')?.stage ?? null,
  };

  // Compute preliminary output hash for the report
  const outputPreHash = sha256(canonicalize({
    style_hash: f3.styleOutput.output_hash,
    gates_verdict: pipelineVerdict,
    evidence_hash: f5.evidence.chain_hash,
  }));

  const f6 = stageReport(
    f0.normalizedInput, f1.plan, f2.scribeOutput, f3.styleOutput,
    f4.gateChain, f5.evidence, trace, config,
    outputPreHash, intentHash, pipelineId,
    f7.proofPack.root_hash, f7.proofPack.manifest.total_files,
    timestamp,
  );
  stageResults.push(f6);
  stageResults.push(f7);

  // F8: PACKAGE — compute output hash from flattened hashes (avoids stack overflow on deep objects)
  const outputHash = sha256(canonicalize({
    pipeline_id: pipelineId,
    intent_hash: intentHash,
    plan_hash: f1.plan.plan_hash,
    scribe_hash: f2.scribeOutput.output_hash,
    style_hash: f3.styleOutput.output_hash,
    gates_hash: f4.output_hash,
    evidence_hash: f5.evidence.chain_hash,
    proof_hash: f7.proofPack.root_hash,
    report_hash: f6.output_hash,
    verdict: pipelineVerdict,
  }));

  const f8Result: StageResult = {
    stage: 'F8',
    verdict: 'PASS',
    input_hash: f7.proofPack.root_hash,
    output_hash: outputHash,
    duration_ms: 0,
    details: `Final package: pipeline_id=${pipelineId}, verdict=${pipelineVerdict}`,
    timestamp_deterministic: timestamp,
  };

  const finalStages = [...stageResults, f8Result];
  const finalTrace: PipelineTrace = {
    stages: finalStages,
    total_stages: finalStages.length,
    passed_stages: finalStages.filter((s) => s.verdict === 'PASS').length,
    first_failure: finalStages.find((s) => s.verdict === 'FAIL')?.stage ?? null,
  };

  return {
    pipeline_id: pipelineId,
    output_hash: outputHash,
    intent_hash: intentHash,
    final_text: f3.styleOutput,
    genesis_plan: f1.plan,
    scribe_output: f2.scribeOutput,
    style_output: f3.styleOutput,
    unified_gates: f4.gateChain,
    evidence: f5.evidence,
    proof_pack: f7.proofPack,
    report: f6.report,
    pipeline_trace: finalTrace,
    verdict: pipelineVerdict,
  };
}
