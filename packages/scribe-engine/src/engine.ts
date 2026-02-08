/**
 * OMEGA Scribe Engine -- Main Orchestrator
 * Phase C.2 -- Pipeline S0->S6
 * S0: validate -> S1: segment+skeleton -> S2: weave -> S3: sensory ->
 * S4: rewrite loop -> S5: gates -> S6: oracles+packaging
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  GenesisPlan, Canon, Constraints, StyleGenomeInput, EmotionTarget,
} from '@omega/genesis-planner';
import type { SConfig, ScribeOutput, ScribeReport } from './types.js';
import { segmentPlan } from './segmenter.js';
import { buildSkeleton } from './skeleton.js';
import { weave } from './weaver.js';
import { addSensoryLayer } from './sensory.js';
import { rewriteLoop } from './rewriter.js';
import { createSEvidenceChainBuilder } from './evidence.js';
import { generateScribeReport } from './report.js';

function validateInputs(
  plan: GenesisPlan | null | undefined,
  canon: Canon,
  genome: StyleGenomeInput,
  emotionTarget: EmotionTarget,
  constraints: Constraints,
  config: SConfig,
): { valid: boolean; reason: string } {
  if (!plan) {
    return { valid: false, reason: 'Plan is null or undefined (S-INV-01)' };
  }
  if (!plan.arcs || plan.arcs.length === 0) {
    return { valid: false, reason: 'Plan has no arcs (S-INV-01)' };
  }
  if (!plan.plan_hash || plan.plan_hash.length === 0) {
    return { valid: false, reason: 'Plan has no plan_hash (S-INV-01)' };
  }
  if (!canon || !canon.entries) {
    return { valid: false, reason: 'Canon is missing' };
  }
  if (!genome) {
    return { valid: false, reason: 'Genome is missing' };
  }
  if (!emotionTarget || !emotionTarget.waypoints) {
    return { valid: false, reason: 'EmotionTarget is missing' };
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
  plan: GenesisPlan | null | undefined,
  reason: string,
  config: SConfig,
  timestamp: string,
): { output: ScribeOutput; report: ScribeReport } {
  const planId = plan?.plan_id ?? 'NONE';
  const planHash = plan?.plan_hash ?? '';
  const outputId = `SOUT-FAIL-${sha256(reason).slice(0, 16)}`;

  const failOutput: ScribeOutput = {
    output_id: outputId,
    output_hash: '',
    plan_id: planId,
    plan_hash: planHash,
    skeleton_hash: '',
    final_prose: {
      prose_id: 'NONE',
      prose_hash: '',
      skeleton_id: 'NONE',
      paragraphs: [],
      total_word_count: 0,
      total_sentence_count: 0,
      pass_number: 0,
    },
    rewrite_history: {
      candidates: [],
      accepted_pass: -1,
      total_passes: 0,
      rewrite_hash: sha256('empty-rewrite'),
    },
    gate_result: {
      verdict: 'FAIL',
      gate_results: [],
      first_failure: null,
      total_violations: 0,
    },
    oracle_result: {
      verdict: 'FAIL',
      oracle_results: [],
      weakest_oracle: null,
      combined_score: 0,
    },
    segment_to_paragraph_map: {},
  };

  const evidence = createSEvidenceChainBuilder(outputId, timestamp);
  evidence.addStep('validate-inputs', sha256(reason), sha256('FAIL'), `S-INV-01: ${reason}`, 'FAIL');
  const chain = evidence.build();
  const report = generateScribeReport(failOutput, chain, config, timestamp);

  return { output: failOutput, report };
}

export function runScribe(
  plan: GenesisPlan,
  canon: Canon,
  genome: StyleGenomeInput,
  emotionTarget: EmotionTarget,
  constraints: Constraints,
  config: SConfig,
  timestamp: string,
): { output: ScribeOutput; report: ScribeReport } {
  const evidence = createSEvidenceChainBuilder('', timestamp);

  // S0: VALIDATE INPUTS
  const validation = validateInputs(plan, canon, genome, emotionTarget, constraints, config);
  if (!validation.valid) {
    return buildFailOutput(plan, validation.reason, config, timestamp);
  }

  const inputHash = sha256(canonicalize({
    plan_hash: plan.plan_hash,
    canon_hash: sha256(canonicalize(canon)),
    genome_hash: sha256(canonicalize(genome)),
    emotion_hash: sha256(canonicalize(emotionTarget)),
    constraints_hash: sha256(canonicalize(constraints)),
  }));
  evidence.addStep('validate-inputs', inputHash, sha256('PASS'), 'S-INV-01: all inputs valid', 'PASS');

  // S1: SEGMENTER + SKELETON
  const segments = segmentPlan(plan);
  const segmentsHash = sha256(canonicalize(segments));
  evidence.addStep('segment-plan', plan.plan_hash, segmentsHash, 'Plan segmentation', 'PASS');

  const skeleton = buildSkeleton(segments, plan);
  evidence.addStep('build-skeleton', segmentsHash, skeleton.skeleton_hash, 'Skeleton construction', 'PASS');

  // S2: WEAVING
  const initialProse = weave(skeleton, genome, constraints);
  evidence.addStep('weave-prose', skeleton.skeleton_hash, initialProse.prose_hash, 'Rhetorical weaving', 'PASS');

  // S3: SENSORY + SYMBOL
  const enrichedProse = addSensoryLayer(initialProse, plan, config);
  evidence.addStep('add-sensory', initialProse.prose_hash, enrichedProse.prose_hash, 'Sensory + motif layer', 'PASS');

  // S4: REWRITE LOOP (includes S5: gates + S6: oracles)
  const rewriteHistory = rewriteLoop(
    skeleton, enrichedProse, canon, constraints, genome, emotionTarget, plan, config, timestamp,
  );
  const rewriteHash = rewriteHistory.rewrite_hash;
  evidence.addStep('rewrite-loop', enrichedProse.prose_hash, rewriteHash, 'S4: rewrite-from-scratch loop', 'PASS');

  // Get accepted candidate
  const acceptedCandidate = rewriteHistory.candidates[rewriteHistory.accepted_pass];
  const finalProse = acceptedCandidate.prose;
  const gateResult = acceptedCandidate.gate_result;
  const oracleResult = acceptedCandidate.oracle_result;

  evidence.addStep('gate-chain', finalProse.prose_hash, sha256(canonicalize(gateResult)), 'S5: 7-gate chain', gateResult.verdict);
  evidence.addStep('oracle-chain', finalProse.prose_hash, sha256(canonicalize(oracleResult)), 'S6: 6-oracle chain', oracleResult.verdict);

  // Build segment-to-paragraph map
  const segParaMap: Record<string, string[]> = {};
  for (const para of finalProse.paragraphs) {
    for (const segId of para.segment_ids) {
      if (!segParaMap[segId]) {
        segParaMap[segId] = [];
      }
      segParaMap[segId].push(para.paragraph_id);
    }
  }

  // Assemble output
  const outputWithoutHash: Omit<ScribeOutput, 'output_hash'> = {
    output_id: '',
    plan_id: plan.plan_id,
    plan_hash: plan.plan_hash,
    skeleton_hash: skeleton.skeleton_hash,
    final_prose: finalProse,
    rewrite_history: rewriteHistory,
    gate_result: gateResult,
    oracle_result: oracleResult,
    segment_to_paragraph_map: segParaMap,
  };

  const outputHash = sha256(canonicalize(outputWithoutHash));
  const outputId = `SOUT-${outputHash.slice(0, 16)}`;

  const output: ScribeOutput = {
    ...outputWithoutHash,
    output_id: outputId,
    output_hash: outputHash,
  };

  // Update evidence with final output_id
  const finalEvidence = createSEvidenceChainBuilder(outputId, timestamp);
  for (const step of evidence.build().steps) {
    finalEvidence.addStep(step.step, step.input_hash, step.output_hash, step.rule_applied, step.verdict);
  }
  finalEvidence.addStep('compute-output-hash', sha256(canonicalize(outputWithoutHash)), outputHash, 'Output hash computation', 'PASS');
  const evidenceChain = finalEvidence.build();

  evidence.addStep('build-evidence', outputHash, evidenceChain.chain_hash, 'Evidence chain assembly', 'PASS');

  // Generate report
  const report = generateScribeReport(output, evidenceChain, config, timestamp);

  return { output, report };
}
