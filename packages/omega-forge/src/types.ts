/**
 * OMEGA Forge — Type Definitions
 * Phase C.5 — Trajectory Compliance Engine
 * Grounded in OMEGA V4.4 Organic Physics
 * All types are readonly and immutable by design.
 */

// Re-export consumed types from C.4 (which re-exports C.1/C.2/C.3)
export type {
  CreationResult, IntentPack, StyledParagraph, GenesisPlan,
  Arc, Scene, Beat, Seed, Canon, EmotionTarget, C4Verdict,
  StyleProfile, StyledOutput, ScribeOutput, ProseDoc, ProseParagraph,
  E2EEvidenceChain, ProofPack, UnifiedGateChainResult,
  IntentPackMetadata, Constraints, StyleGenomeInput,
} from '@omega/creation-pipeline';

export type { EmotionWaypoint } from '@omega/genesis-planner';

// ═══════════════════════ OMEGA V4.4 PHYSICS ═══════════════════════

/** The 14 Plutchik-extended emotions (FIXED by design, R14) */
export type Emotion14 =
  | 'joy' | 'trust' | 'fear' | 'surprise' | 'sadness'
  | 'disgust' | 'anger' | 'anticipation' | 'love' | 'submission'
  | 'awe' | 'disapproval' | 'remorse' | 'contempt';

/** All 14 emotion keys as array for iteration */
export const EMOTION_14_KEYS: readonly Emotion14[] = [
  'joy', 'trust', 'fear', 'surprise', 'sadness',
  'disgust', 'anger', 'anticipation', 'love', 'submission',
  'awe', 'disapproval', 'remorse', 'contempt',
] as const;

/** Emotion state in R14 — each value in [0, 1] */
export type EmotionState14D = Readonly<Record<Emotion14, number>>;

/** Emotion polarity for valence computation */
export type EmotionPolarity = -1 | 0 | 1;

export const EMOTION_POLARITY: Readonly<Record<Emotion14, EmotionPolarity>> = {
  joy: 1, trust: 1, love: 1, anticipation: 1, awe: 1,
  fear: -1, sadness: -1, disgust: -1, anger: -1,
  contempt: -1, remorse: -1,
  surprise: 0, submission: 0, disapproval: 0,
};

/** OMEGA tridimensional state Omega(t) = (X, Y, Z) */
export interface OmegaState {
  readonly X: number;
  readonly Y: number;
  readonly Z: number;
}

/** Physical parameters for a single emotion (from canonical table) */
export interface EmotionPhysics {
  readonly emotion: Emotion14;
  readonly M: number;
  readonly lambda: number;
  readonly kappa: number;
  readonly E0: number;
  readonly zeta: number;
  readonly mu: number;
}

/** Complete canonical table (14 emotions x parameters) */
export type CanonicalEmotionTable = readonly EmotionPhysics[];

// ═══════════════════════ TRAJECTORY ═══════════════════════

/** Emotional state of a single paragraph */
export interface ParagraphEmotionState {
  readonly paragraph_index: number;
  readonly paragraph_hash: string;
  readonly state_14d: EmotionState14D;
  readonly omega_state: OmegaState;
  readonly dominant_emotion: Emotion14;
  readonly valence: number;
  readonly arousal: number;
}

/** Prescribed emotion target for a paragraph/segment */
export interface PrescribedState {
  readonly paragraph_index: number;
  readonly target_14d: EmotionState14D;
  readonly target_omega: OmegaState;
  readonly source: string;
}

/** Deviation between prescribed and actual for one paragraph */
export interface TrajectoryDeviation {
  readonly paragraph_index: number;
  readonly cosine_distance: number;
  readonly euclidean_distance: number;
  readonly vad_distance: number;
  readonly delta_X: number;
  readonly delta_Y: number;
  readonly delta_Z: number;
  readonly compliant: boolean;
}

/** Complete trajectory analysis */
export interface TrajectoryAnalysis {
  readonly paragraph_states: readonly ParagraphEmotionState[];
  readonly prescribed_states: readonly PrescribedState[];
  readonly deviations: readonly TrajectoryDeviation[];
  readonly avg_cosine_distance: number;
  readonly avg_euclidean_distance: number;
  readonly max_deviation_index: number;
  readonly compliant_ratio: number;
  readonly trajectory_hash: string;
}

// ═══════════════════════ LAW VERIFICATION ═══════════════════════

export type OmegaLawId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

/** Result of verifying one law on one transition */
export interface LawVerification {
  readonly law: OmegaLawId;
  readonly paragraph_indices: readonly [number, number];
  readonly compliant: boolean;
  readonly measured_value: number;
  readonly threshold: number;
  readonly detail: string;
}

/** Transition between two consecutive paragraphs */
export interface EmotionTransition {
  readonly from_index: number;
  readonly to_index: number;
  readonly from_state: OmegaState;
  readonly to_state: OmegaState;
  readonly delta_intensity: number;
  readonly narrative_force: number;
  readonly inertia_mass: number;
  readonly resistance: number;
  readonly law_results: readonly LawVerification[];
  readonly forced_transition: boolean;
  readonly feasibility_fail: boolean;
}

/** Law 4 organic decay analysis for a segment */
export interface OrganicDecayAnalysis {
  readonly segment_start: number;
  readonly segment_end: number;
  readonly expected_curve: readonly number[];
  readonly actual_curve: readonly number[];
  readonly deviation: number;
  readonly zeta_regime: 'underdamped' | 'critical' | 'overdamped';
  readonly compliant: boolean;
}

/** Flux conservation analysis (Law 5) */
export interface FluxConservation {
  readonly phi_transferred: number;
  readonly phi_stored: number;
  readonly phi_dissipated: number;
  readonly phi_total: number;
  readonly balance_error: number;
  readonly compliant: boolean;
}

/** Complete law compliance report */
export interface LawComplianceReport {
  readonly transitions: readonly EmotionTransition[];
  readonly organic_decay_segments: readonly OrganicDecayAnalysis[];
  readonly flux_conservation: FluxConservation;
  readonly total_transitions: number;
  readonly forced_transitions: number;
  readonly feasibility_failures: number;
  readonly law4_violations: number;
  readonly law5_compliant: boolean;
  readonly overall_compliance: number;
  readonly compliance_hash: string;
}

// ═══════════════════════ QUALITY ENVELOPE (M1-M12) ═══════════════════════

export interface QualityMetrics {
  readonly M1_contradiction_rate: number;
  readonly M2_canon_compliance: number;
  readonly M3_coherence_span: number;
  readonly M4_arc_maintenance: number;
  readonly M5_memory_integrity: number;
  readonly M6_style_emergence: number;
  readonly M7_author_fingerprint: number;
  readonly M8_sentence_necessity: number;
  readonly M9_semantic_density: number;
  readonly M10_reading_levels: number;
  readonly M11_discomfort_index: number;
  readonly M12_superiority_index: number;
}

export interface QualityEnvelope {
  readonly metrics: QualityMetrics;
  readonly quality_score: number;
  readonly quality_hash: string;
}

// ═══════════════════════ DIAGNOSIS ═══════════════════════

export type PrescriptionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type PrescriptionDomain =
  | 'law_1_inertia' | 'law_2_dissipation' | 'law_3_feasibility'
  | 'law_4_organic_decay' | 'law_5_flux' | 'law_6_synthesis'
  | 'canon_compliance' | 'necessity' | 'style' | 'complexity'
  | 'dead_zone' | 'forced_transition';

export interface Prescription {
  readonly prescription_id: string;
  readonly domain: PrescriptionDomain;
  readonly priority: PrescriptionPriority;
  readonly paragraph_indices: readonly number[];
  readonly law_violated: OmegaLawId | null;
  readonly metric_violated: string | null;
  readonly diagnostic: string;
  readonly action: string;
  readonly current_value: number;
  readonly target_value: number;
}

/** Dead zone = segment where Z plateaus and dissipation fails */
export interface DeadZone {
  readonly start_index: number;
  readonly end_index: number;
  readonly length: number;
  readonly avg_Z: number;
  readonly dissipation_rate: number;
  readonly cause: string;
}

// ═══════════════════════ BENCHMARK ═══════════════════════

export interface ForgeScore {
  readonly emotion_compliance: number;
  readonly quality_score: number;
  readonly composite: number;
}

export interface ForgeProfile {
  readonly score: ForgeScore;
  readonly trajectory_compliance: number;
  readonly law_compliance: number;
  readonly canon_compliance: number;
  readonly necessity_score: number;
  readonly style_emergence: number;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly profile_hash: string;
}

// ═══════════════════════ FORGE OUTPUT ═══════════════════════

export type F5Verdict = 'PASS' | 'FAIL';
export type F5InvariantId =
  | 'F5-INV-01' | 'F5-INV-02' | 'F5-INV-03' | 'F5-INV-04'
  | 'F5-INV-05' | 'F5-INV-06' | 'F5-INV-07' | 'F5-INV-08'
  | 'F5-INV-09' | 'F5-INV-10' | 'F5-INV-11' | 'F5-INV-12'
  | 'F5-INV-13' | 'F5-INV-14';

export interface ForgeResult {
  readonly forge_id: string;
  readonly input_hash: string;
  readonly trajectory: TrajectoryAnalysis;
  readonly law_compliance: LawComplianceReport;
  readonly quality: QualityEnvelope;
  readonly dead_zones: readonly DeadZone[];
  readonly prescriptions: readonly Prescription[];
  readonly benchmark: ForgeProfile;
  readonly forge_report: ForgeReport;
  readonly verdict: F5Verdict;
  readonly output_hash: string;
}

export interface ForgeMetrics {
  readonly total_paragraphs: number;
  readonly emotion_coverage: number;
  readonly trajectory_compliance: number;
  readonly avg_cosine_distance: number;
  readonly avg_euclidean_distance: number;
  readonly forced_transitions: number;
  readonly feasibility_failures: number;
  readonly law4_violations: number;
  readonly flux_balance_error: number;
  readonly M1: number; readonly M2: number; readonly M3: number;
  readonly M4: number; readonly M5: number; readonly M6: number;
  readonly M7: number; readonly M8: number; readonly M9: number;
  readonly M10: number; readonly M11: number; readonly M12: number;
  readonly emotion_score: number;
  readonly quality_score: number;
  readonly composite_score: number;
  readonly dead_zones_count: number;
  readonly prescriptions_count: number;
  readonly critical_prescriptions: number;
}

export interface ForgeReport {
  readonly forge_id: string;
  readonly input_hash: string;
  readonly verdict: F5Verdict;
  readonly metrics: ForgeMetrics;
  readonly benchmark: ForgeProfile;
  readonly prescriptions_summary: readonly Prescription[];
  readonly invariants_checked: readonly F5InvariantId[];
  readonly invariants_passed: readonly F5InvariantId[];
  readonly invariants_failed: readonly F5InvariantId[];
  readonly config_hash: string;
  readonly report_hash: string;
  readonly timestamp_deterministic: string;
}

// ═══════════════════════ CONFIG ═══════════════════════

export interface F5ConfigSymbol {
  readonly value: number | string | readonly number[];
  readonly unit: string;
  readonly rule: string;
  readonly derivation: string;
}

export interface F5Config {
  readonly TAU_COSINE_DEVIATION: F5ConfigSymbol;
  readonly TAU_EUCLIDEAN_DEVIATION: F5ConfigSymbol;
  readonly TAU_VAD_DEVIATION: F5ConfigSymbol;
  readonly TAU_DECAY_TOLERANCE: F5ConfigSymbol;
  readonly TAU_FLUX_BALANCE: F5ConfigSymbol;
  readonly TAU_NECESSITY: F5ConfigSymbol;
  readonly TAU_DISCOMFORT_MIN: F5ConfigSymbol;
  readonly TAU_DISCOMFORT_MAX: F5ConfigSymbol;
  readonly DEAD_ZONE_MIN_LENGTH: F5ConfigSymbol;
  readonly DEAD_ZONE_Z_THRESHOLD: F5ConfigSymbol;
  readonly WEIGHT_EMOTION: F5ConfigSymbol;
  readonly WEIGHT_QUALITY: F5ConfigSymbol;
  readonly SATURATION_CAPACITY_C: F5ConfigSymbol;
  readonly COMPOSITE_PASS_THRESHOLD: F5ConfigSymbol;
}

// ═══════════════════════ EVIDENCE ═══════════════════════

export interface F5EvidenceStep {
  readonly step: string;
  readonly input_hash: string;
  readonly output_hash: string;
  readonly rule_applied: string;
  readonly verdict: F5Verdict;
  readonly timestamp_deterministic: string;
}

export interface F5EvidenceChain {
  readonly forge_id: string;
  readonly steps: readonly F5EvidenceStep[];
  readonly chain_hash: string;
}
