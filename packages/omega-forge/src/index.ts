/**
 * OMEGA Forge — Public API
 * Phase C.5 — Trajectory Compliance Engine
 * @module @omega/omega-forge
 */

// Types
export type {
  Emotion14, EmotionState14D, EmotionPolarity,
  OmegaState, EmotionPhysics, CanonicalEmotionTable,
  ParagraphEmotionState, PrescribedState, TrajectoryDeviation, TrajectoryAnalysis,
  OmegaLawId, LawVerification, EmotionTransition,
  OrganicDecayAnalysis, FluxConservation, LawComplianceReport,
  QualityMetrics, QualityEnvelope,
  PrescriptionPriority, PrescriptionDomain, Prescription, DeadZone,
  ForgeScore, ForgeProfile,
  F5Verdict, F5InvariantId, ForgeResult, ForgeMetrics, ForgeReport,
  F5ConfigSymbol, F5Config,
  F5EvidenceStep, F5EvidenceChain,
} from './types.js';

export { EMOTION_14_KEYS, EMOTION_POLARITY } from './types.js';

// Config
export { createDefaultF5Config, resolveF5ConfigValue, validateF5Config, hashF5Config } from './config.js';

// Normalizer
export { normalizeLF, normalizeWhitespace, normalizeJSON, normalize } from './normalizer.js';

// Physics
export { cosineSimilarity14D, euclideanDistance14D, vadDistance, computeValence, computeArousal, dominantEmotion, isValidState, zeroState, singleEmotionState } from './physics/emotion-space.js';
export { toOmegaState, fromOmegaState, isValidOmega, neutralOmega } from './physics/omega-state.js';
export { DEFAULT_CANONICAL_TABLE, loadCanonicalTable, getEmotionPhysics, validateTable } from './physics/canonical-table.js';
export { checkInertia, estimateNarrativeForce, computeResistance, verifyLaw1 } from './physics/law-1-inertia.js';
export { simpleDissipation, verifyLaw2 } from './physics/law-2-dissipation.js';
export { feasibilityThreshold, checkFeasibility, verifyLaw3 } from './physics/law-3-feasibility.js';
export { theoreticalDecay, computeLambdaEff, detectZetaRegime, computeOmega, analyzeDecaySegment } from './physics/law-4-organic-decay.js';
export { computeFluxConservation, verifyLaw5 } from './physics/law-5-flux-conservation.js';
export { computeSynthesisMass, checkSynthesis, detectSynthesis, verifyLaw6 } from './physics/law-6-synthesis.js';
export { analyzeEmotionFromText, buildPrescribedTrajectory, buildActualTrajectory, computeDeviations } from './physics/trajectory-analyzer.js';

// Quality
export { computeM1, computeM2 } from './quality/canon-compliance.js';
export { computeM3, computeM4, computeM5 } from './quality/structure-metrics.js';
export { computeM6, computeM7 } from './quality/style-metrics.js';
export { computeM8, computeM9 } from './quality/necessity-metrics.js';
export { computeM10, computeM11 } from './quality/complexity-metrics.js';
export { computeQualityMetrics, computeQualityScore, buildQualityEnvelope } from './quality/quality-envelope.js';

// Diagnosis
export { analyzeTransitions, analyzeDecaySegments, buildLawComplianceReport } from './diagnosis/law-violations.js';
export { detectDeadZones } from './diagnosis/dead-zones.js';
export { detectForcedTransitions, detectFeasibilityFailures, forcedTransitionRatio } from './diagnosis/forced-transitions.js';
export { generatePrescriptions, resetPrescriptionCounter } from './diagnosis/prescription-engine.js';

// Benchmark
export { computeM12, computeForgeScore } from './benchmark/composite-scorer.js';
export { buildForgeProfile } from './benchmark/forge-profile.js';

// Evidence
export { createEvidenceStep, buildF5EvidenceChain, verifyF5EvidenceChain } from './evidence.js';

// Report
export { buildForgeMetrics, buildForgeReport, forgeReportToMarkdown } from './report.js';

// Engine
export { runForge } from './engine.js';
