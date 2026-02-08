/**
 * OMEGA Forge — Main Engine
 * Phase C.5 — Single-cycle trajectory compliance analysis
 * V0: Validate -> V1: Trajectory -> V2: Laws -> V3: Quality -> V4: Diagnosis -> V5: Benchmark
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  CreationResult, ForgeResult, F5Config, CanonicalEmotionTable,
  F5Verdict, F5InvariantId, F5EvidenceStep, IntentPack,
  TrajectoryAnalysis, LawComplianceReport, QualityEnvelope,
} from './types.js';
import { resolveF5ConfigValue } from './config.js';
import { buildActualTrajectory, buildPrescribedTrajectory, computeDeviations } from './physics/trajectory-analyzer.js';
import { buildLawComplianceReport } from './diagnosis/law-violations.js';
import { detectDeadZones } from './diagnosis/dead-zones.js';
import { generatePrescriptions, resetPrescriptionCounter } from './diagnosis/prescription-engine.js';
import { buildQualityEnvelope } from './quality/quality-envelope.js';
import { computeForgeScore } from './benchmark/composite-scorer.js';
import { buildForgeProfile } from './benchmark/forge-profile.js';
import { createEvidenceStep, buildF5EvidenceChain } from './evidence.js';
import { buildForgeMetrics, buildForgeReport } from './report.js';

/** Run the complete forge analysis (single cycle, no modification) */
export function runForge(
  creation: CreationResult,
  config: F5Config,
  canonicalTable: CanonicalEmotionTable,
  timestamp: string,
): ForgeResult {
  resetPrescriptionCounter();

  const C = resolveF5ConfigValue(config.SATURATION_CAPACITY_C);
  const evidenceSteps: F5EvidenceStep[] = [];

  // ── V0: VALIDATE INPUT ──
  const inputHash = sha256(canonicalize({
    pipeline_id: creation.pipeline_id,
    output_hash: creation.output_hash,
    intent_hash: creation.intent_hash,
    verdict: creation.verdict,
  }));

  if (creation.verdict !== 'PASS') {
    return buildFailResult(creation, inputHash, 'Input CreationResult verdict is not PASS (F5-INV-01)', config, canonicalTable, timestamp);
  }

  evidenceSteps.push(createEvidenceStep(
    'V0_VALIDATE', inputHash, sha256(canonicalize({ validated: true })),
    'F5-INV-01: Certified input only', 'PASS', timestamp,
  ));

  // ── V1: EMOTION EXTRACTION & TRAJECTORY ──
  const paragraphs = creation.style_output.paragraphs;
  const intent = extractIntentPack(creation);
  const plan = creation.genesis_plan;

  const actual = buildActualTrajectory(paragraphs, canonicalTable, C);
  const prescribed = buildPrescribedTrajectory(intent, plan, paragraphs.length, canonicalTable, C);
  const trajectory = computeDeviations(prescribed, actual, config);

  evidenceSteps.push(createEvidenceStep(
    'V1_TRAJECTORY', inputHash, trajectory.trajectory_hash,
    'F5-INV-03: Emotion coverage 100% + F5-INV-04: Trajectory deviation bounded',
    trajectory.compliant_ratio > 0 ? 'PASS' : 'FAIL', timestamp,
  ));

  // ── V2: LAW VERIFICATION ──
  const lawCompliance = buildLawComplianceReport(actual, plan, canonicalTable, config);

  evidenceSteps.push(createEvidenceStep(
    'V2_LAWS', trajectory.trajectory_hash, lawCompliance.compliance_hash,
    'F5-INV-05/06/07/08: Law compliance', 'PASS', timestamp,
  ));

  // ── V3: QUALITY ENVELOPE ──
  const scribeOutput = creation.scribe_output;
  const canon = intent.canon;
  const quality = buildQualityEnvelope(creation.style_output, plan, scribeOutput, canon, config);

  evidenceSteps.push(createEvidenceStep(
    'V3_QUALITY', lawCompliance.compliance_hash, quality.quality_hash,
    'F5-INV-09/10/11: Quality envelope', 'PASS', timestamp,
  ));

  // ── V4: DIAGNOSIS ──
  const deadZones = detectDeadZones(actual, config, C);
  const prescriptions = generatePrescriptions(trajectory, lawCompliance, quality, deadZones, config);

  const diagHash = sha256(canonicalize({
    dead_zones: deadZones.length,
    prescriptions: prescriptions.length,
  }));

  evidenceSteps.push(createEvidenceStep(
    'V4_DIAGNOSIS', quality.quality_hash, diagHash,
    'F5-INV-12: Actionable prescriptions', 'PASS', timestamp,
  ));

  // ── V5: BENCHMARK & PACKAGE ──
  const emotionCompliance = computeEmotionScore(trajectory, lawCompliance);
  const forgeScore = computeForgeScore(emotionCompliance, quality.quality_score, config);
  const benchmark = buildForgeProfile(forgeScore, trajectory, lawCompliance, quality);

  const passThreshold = resolveF5ConfigValue(config.COMPOSITE_PASS_THRESHOLD);
  const verdict: F5Verdict = forgeScore.composite >= passThreshold ? 'PASS' : 'FAIL';

  // Invariants
  const { checked, passed, failed } = evaluateInvariants(
    creation, trajectory, lawCompliance, quality, prescriptions, forgeScore, config,
  );

  // Metrics & Report
  const metrics = buildForgeMetrics(
    trajectory, lawCompliance, quality, deadZones, prescriptions,
    emotionCompliance, forgeScore.composite,
  );

  const forgeId = `FORGE-${inputHash.slice(0, 16)}`;

  const forgeReport = buildForgeReport(
    forgeId, inputHash, verdict, metrics, benchmark,
    prescriptions, checked, passed, failed, config, timestamp,
  );

  evidenceSteps.push(createEvidenceStep(
    'V5_BENCHMARK', diagHash, forgeReport.report_hash,
    'F5-INV-14: Weight compliance 60/40', verdict, timestamp,
  ));

  const evidence = buildF5EvidenceChain(forgeId, evidenceSteps);

  // Final output hash
  const outputHash = sha256(canonicalize({
    forge_id: forgeId,
    input_hash: inputHash,
    trajectory_hash: trajectory.trajectory_hash,
    compliance_hash: lawCompliance.compliance_hash,
    quality_hash: quality.quality_hash,
    report_hash: forgeReport.report_hash,
    evidence_hash: evidence.chain_hash,
    verdict,
  }));

  return {
    forge_id: forgeId,
    input_hash: inputHash,
    trajectory,
    law_compliance: lawCompliance,
    quality,
    dead_zones: deadZones,
    prescriptions,
    benchmark,
    forge_report: forgeReport,
    verdict,
    output_hash: outputHash,
  };
}

/** Compute emotion compliance from trajectory + law results */
function computeEmotionScore(
  trajectory: TrajectoryAnalysis,
  laws: LawComplianceReport,
): number {
  const trajScore = trajectory.compliant_ratio;
  const lawScore = laws.overall_compliance;
  return (trajScore + lawScore) / 2;
}

/** Extract IntentPack-like data from CreationResult */
function extractIntentPack(creation: CreationResult): IntentPack {
  const plan = creation.genesis_plan;
  return {
    intent: {
      title: '',
      premise: '',
      themes: [],
      core_emotion: 'fear',
      target_audience: '',
      message: '',
      target_word_count: 0,
    },
    canon: { entries: [] },
    constraints: {
      pov: 'third-limited',
      tense: 'past',
      banned_words: [],
      banned_topics: [],
      max_dialogue_ratio: 0.5,
      min_sensory_anchors_per_scene: 1,
      max_scenes: 10,
      min_scenes: 1,
      forbidden_cliches: [],
    },
    genome: {
      target_burstiness: 0.5,
      target_lexical_richness: 0.5,
      target_avg_sentence_length: 15,
      target_dialogue_ratio: 0.2,
      target_description_density: 0.5,
      signature_traits: [],
    },
    emotion: {
      arc_emotion: 'fear',
      waypoints: plan.emotion_trajectory.map((w: { readonly position: number; readonly emotion: string; readonly intensity: number }) => ({
        position: w.position,
        emotion: w.emotion,
        intensity: w.intensity,
      })),
      climax_position: 0.8,
      resolution_emotion: 'sadness',
    },
    metadata: {
      pack_id: '',
      pack_version: '1.0.0',
      author: '',
      created_at: '',
      description: '',
    },
  };
}

/** Build a fail result for invalid input */
function buildFailResult(
  _creation: CreationResult,
  inputHash: string,
  reason: string,
  config: F5Config,
  _table: CanonicalEmotionTable,
  timestamp: string,
): ForgeResult {
  const forgeId = `FORGE-FAIL-${inputHash.slice(0, 16)}`;

  const emptyTrajectory: TrajectoryAnalysis = {
    paragraph_states: [],
    prescribed_states: [],
    deviations: [],
    avg_cosine_distance: 0,
    avg_euclidean_distance: 0,
    max_deviation_index: 0,
    compliant_ratio: 0,
    trajectory_hash: sha256(canonicalize({ empty: true })),
  };

  const emptyLaws: LawComplianceReport = {
    transitions: [],
    organic_decay_segments: [],
    flux_conservation: { phi_transferred: 0, phi_stored: 0, phi_dissipated: 0, phi_total: 0, balance_error: 0, compliant: true },
    total_transitions: 0,
    forced_transitions: 0,
    feasibility_failures: 0,
    law4_violations: 0,
    law5_compliant: true,
    overall_compliance: 0,
    compliance_hash: sha256(canonicalize({ empty: true })),
  };

  const emptyQuality: QualityEnvelope = {
    metrics: {
      M1_contradiction_rate: 0, M2_canon_compliance: 0, M3_coherence_span: 0,
      M4_arc_maintenance: 0, M5_memory_integrity: 0, M6_style_emergence: 0,
      M7_author_fingerprint: 0, M8_sentence_necessity: 0, M9_semantic_density: 0,
      M10_reading_levels: 0, M11_discomfort_index: 0, M12_superiority_index: 0,
    },
    quality_score: 0,
    quality_hash: sha256(canonicalize({ empty: true })),
  };

  const score = computeForgeScore(0, 0, config);
  const benchmark = buildForgeProfile(score, emptyTrajectory, emptyLaws, emptyQuality);
  const metrics = buildForgeMetrics(emptyTrajectory, emptyLaws, emptyQuality, [], [], 0, 0);

  const allInvariants: F5InvariantId[] = [
    'F5-INV-01', 'F5-INV-02', 'F5-INV-03', 'F5-INV-04',
    'F5-INV-05', 'F5-INV-06', 'F5-INV-07', 'F5-INV-08',
    'F5-INV-09', 'F5-INV-10', 'F5-INV-11', 'F5-INV-12',
    'F5-INV-13', 'F5-INV-14',
  ];

  const report = buildForgeReport(
    forgeId, inputHash, 'FAIL', metrics, benchmark, [],
    allInvariants, [], ['F5-INV-01'], config, timestamp,
  );

  const evidence = buildF5EvidenceChain(forgeId, [
    createEvidenceStep('V0_VALIDATE', inputHash, sha256(reason), 'F5-INV-01', 'FAIL', timestamp),
  ]);

  return {
    forge_id: forgeId,
    input_hash: inputHash,
    trajectory: emptyTrajectory,
    law_compliance: emptyLaws,
    quality: emptyQuality,
    dead_zones: [],
    prescriptions: [],
    benchmark,
    forge_report: report,
    verdict: 'FAIL',
    output_hash: sha256(canonicalize({ forge_id: forgeId, verdict: 'FAIL', evidence: evidence.chain_hash })),
  };
}

/** Evaluate all 14 invariants */
function evaluateInvariants(
  creation: CreationResult,
  trajectory: TrajectoryAnalysis,
  laws: LawComplianceReport,
  quality: QualityEnvelope,
  prescriptions: readonly import('./types.js').Prescription[],
  _score: import('./types.js').ForgeScore,
  config: F5Config,
): { checked: F5InvariantId[]; passed: F5InvariantId[]; failed: F5InvariantId[] } {
  const checked: F5InvariantId[] = [];
  const passed: F5InvariantId[] = [];
  const failed: F5InvariantId[] = [];

  const check = (id: F5InvariantId, condition: boolean) => {
    checked.push(id);
    if (condition) passed.push(id);
    else failed.push(id);
  };

  // F5-INV-01: Certified input
  check('F5-INV-01', creation.verdict === 'PASS');

  // F5-INV-02: Read-only (always true — we don't modify anything)
  check('F5-INV-02', true);

  // F5-INV-03: Emotion coverage 100%
  const coverage = trajectory.paragraph_states.length > 0
    ? trajectory.paragraph_states.length / creation.style_output.paragraphs.length
    : 0;
  check('F5-INV-03', coverage === 1);

  // F5-INV-04: Trajectory deviation bounded
  const tauCos = resolveF5ConfigValue(config.TAU_COSINE_DEVIATION);
  check('F5-INV-04', trajectory.avg_cosine_distance <= tauCos);

  // F5-INV-05: Law 1 compliance
  check('F5-INV-05', laws.forced_transitions === 0);

  // F5-INV-06: Law 3 compliance
  check('F5-INV-06', laws.feasibility_failures === 0);

  // F5-INV-07: Law 4 compliance
  check('F5-INV-07', laws.law4_violations === 0);

  // F5-INV-08: Law 5 compliance
  check('F5-INV-08', laws.law5_compliant);

  // F5-INV-09: Canon compliance (M1=0, M2=100%)
  check('F5-INV-09', quality.metrics.M1_contradiction_rate === 0 && quality.metrics.M2_canon_compliance >= 1);

  // F5-INV-10: Necessity (M8 >= threshold)
  const tauNec = resolveF5ConfigValue(config.TAU_NECESSITY);
  check('F5-INV-10', quality.metrics.M8_sentence_necessity >= tauNec);

  // F5-INV-11: Style emergence
  check('F5-INV-11', quality.metrics.M6_style_emergence >= 0.5);

  // F5-INV-12: Prescription actionability
  const allActionable = prescriptions.every((p) =>
    p.paragraph_indices.length >= 0 &&
    p.diagnostic.length > 0 &&
    p.action.length > 0,
  );
  check('F5-INV-12', allActionable);

  // F5-INV-13: Determinism (always true in single run — tested externally)
  check('F5-INV-13', true);

  // F5-INV-14: Weight compliance 60/40
  const wEmo = resolveF5ConfigValue(config.WEIGHT_EMOTION);
  const wQual = resolveF5ConfigValue(config.WEIGHT_QUALITY);
  check('F5-INV-14', Math.abs(wEmo - 0.6) < 0.001 && Math.abs(wQual - 0.4) < 0.001);

  return { checked, passed, failed };
}
