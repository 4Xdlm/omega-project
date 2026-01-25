/**
 * OMEGA Emotion Gate — Core Types
 *
 * Type definitions for the Emotion Gate validation layer.
 * EmotionV2 is SSOT — read-only, never modified by this gate.
 */

import type { EntityId, RootHash, EvidenceRef } from '@omega/canon-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type FrameId = `frm_${string}`;
export type EmotionVerdictId = `evrd_${string}`;
export type EmotionValidatorId = `eval_${string}`;
export type EmotionPolicyId = `epol_${string}`;

// ═══════════════════════════════════════════════════════════════════════════════
// CALIBRATION SYMBOLS (ZERO MAGIC NUMBERS)
// ═══════════════════════════════════════════════════════════════════════════════

export const OMEGA_EMO_STABILITY_THRESHOLD = Symbol.for('OMEGA_EMO_STABILITY_THRESHOLD');
export const OMEGA_EMO_DELTA_MAX = Symbol.for('OMEGA_EMO_DELTA_MAX');
export const OMEGA_EMO_AMPLIFICATION_CYCLES = Symbol.for('OMEGA_EMO_AMPLIFICATION_CYCLES');
export const OMEGA_EMO_TOXICITY_THRESHOLD = Symbol.for('OMEGA_EMO_TOXICITY_THRESHOLD');
export const OMEGA_EMO_DRIFT_THRESHOLD = Symbol.for('OMEGA_EMO_DRIFT_THRESHOLD');
export const OMEGA_EMO_CAUSALITY_WINDOW = Symbol.for('OMEGA_EMO_CAUSALITY_WINDOW');
export const OMEGA_EMO_COHERENCE_RADIUS = Symbol.for('OMEGA_EMO_COHERENCE_RADIUS');
export const OMEGA_EMO_NEGLIGIBLE_DELTA = Symbol.for('OMEGA_EMO_NEGLIGIBLE_DELTA');

export type CalibrationSymbol =
  | typeof OMEGA_EMO_STABILITY_THRESHOLD
  | typeof OMEGA_EMO_DELTA_MAX
  | typeof OMEGA_EMO_AMPLIFICATION_CYCLES
  | typeof OMEGA_EMO_TOXICITY_THRESHOLD
  | typeof OMEGA_EMO_DRIFT_THRESHOLD
  | typeof OMEGA_EMO_CAUSALITY_WINDOW
  | typeof OMEGA_EMO_COHERENCE_RADIUS
  | typeof OMEGA_EMO_NEGLIGIBLE_DELTA;

export interface EmotionCalibration {
  readonly [OMEGA_EMO_STABILITY_THRESHOLD]: number;
  readonly [OMEGA_EMO_DELTA_MAX]: number;
  readonly [OMEGA_EMO_AMPLIFICATION_CYCLES]: number;
  readonly [OMEGA_EMO_TOXICITY_THRESHOLD]: number;
  readonly [OMEGA_EMO_DRIFT_THRESHOLD]: number;
  readonly [OMEGA_EMO_CAUSALITY_WINDOW]: number;
  readonly [OMEGA_EMO_COHERENCE_RADIUS]: number;
  readonly [OMEGA_EMO_NEGLIGIBLE_DELTA]: number;
}

export const DEFAULT_EMOTION_CALIBRATION: EmotionCalibration = {
  [OMEGA_EMO_STABILITY_THRESHOLD]: 0.2,
  [OMEGA_EMO_DELTA_MAX]: 0.4,
  [OMEGA_EMO_AMPLIFICATION_CYCLES]: 3,
  [OMEGA_EMO_TOXICITY_THRESHOLD]: 0.6,
  [OMEGA_EMO_DRIFT_THRESHOLD]: 0.3,
  [OMEGA_EMO_CAUSALITY_WINDOW]: 5,
  [OMEGA_EMO_COHERENCE_RADIUS]: 2,
  [OMEGA_EMO_NEGLIGIBLE_DELTA]: 0.05,
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION STATE V2 (SSOT — READ-ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * EmotionStateV2 — 14 dimensions (Plutchik wheel + compounds)
 * This is the SINGLE SOURCE OF TRUTH. NEVER modified by EmotionGate.
 */
export interface EmotionStateV2 {
  readonly joy: number;
  readonly trust: number;
  readonly fear: number;
  readonly surprise: number;
  readonly sadness: number;
  readonly disgust: number;
  readonly anger: number;
  readonly anticipation: number;
  readonly love: number;
  readonly submission: number;
  readonly awe: number;
  readonly disapproval: number;
  readonly remorse: number;
  readonly contempt: number;
}

export const EMOTION_DIMENSIONS: readonly (keyof EmotionStateV2)[] = Object.freeze([
  'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
  'anger', 'anticipation', 'love', 'submission', 'awe',
  'disapproval', 'remorse', 'contempt',
]) as readonly (keyof EmotionStateV2)[];

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION FRAME
// ═══════════════════════════════════════════════════════════════════════════════

export type EmotionSource = 'EmotionV2';

export interface EmotionFrame {
  readonly frame_id: FrameId;
  readonly entity_id: EntityId;
  readonly emotion_state: EmotionStateV2;
  readonly timestamp: number;
  readonly source: EmotionSource;
  readonly evidence_refs: readonly EvidenceRef[];
  readonly previous_frame_id?: FrameId;
}

export interface EmotionSequence {
  readonly sequence_id: string;
  readonly entity_id: EntityId;
  readonly frames: readonly EmotionFrame[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION METRICS (PASSIVE MEASUREMENTS)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmotionDelta {
  readonly dimension: keyof EmotionStateV2;
  readonly from_value: number;
  readonly to_value: number;
  readonly delta: number;
  readonly relative_change: number;
}

export interface DriftVector {
  readonly semantic_delta: number;
  readonly emotional_deltas: readonly EmotionDelta[];
  readonly direction: readonly number[];
  readonly magnitude: number;
  readonly acceleration: number;
}

export interface LoopPattern {
  readonly cycle_length: number;
  readonly oscillating_dimensions: readonly (keyof EmotionStateV2)[];
  readonly amplitude: number;
}

export interface ToxicitySignal {
  readonly amplification_detected: boolean;
  readonly amplification_cycles: number;
  readonly loop_pattern?: LoopPattern;
  readonly instability_score: number;
  readonly contradiction_count: number;
  readonly unjustified_spikes: number;
}

export interface StabilityMetrics {
  readonly continuity_score: number;
  readonly smoothness_score: number;
  readonly predictability_score: number;
  readonly outlier_count: number;
}

export interface EmotionMetrics {
  readonly drift_vector?: DriftVector;
  readonly toxicity_signal?: ToxicitySignal;
  readonly stability_metrics?: StabilityMetrics;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ValidatorResultType = 'PASS' | 'FAIL' | 'DEFER';

export interface EmotionValidatorResult {
  readonly validator_id: EmotionValidatorId;
  readonly validator_version: string;
  readonly result: ValidatorResultType;
  readonly reasons: readonly string[];
  readonly metrics?: EmotionMetrics;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type EmotionVerdictType = 'ALLOW' | 'DENY' | 'DEFER';

export interface ValidatorProof {
  readonly validator_id: EmotionValidatorId;
  readonly input_hash: RootHash;
  readonly output_hash: RootHash;
  readonly computation_deterministic: boolean;
}

export interface ProofInputs {
  readonly frame_hash: RootHash;
  readonly context_hash: RootHash;
  readonly calibration_hash: RootHash;
}

export interface EmotionProof {
  readonly emotion_input_hash: RootHash;
  readonly policy_hash: RootHash;
  readonly validators_proofs: readonly ValidatorProof[];
  readonly drift_computation_hash: RootHash;
  readonly toxicity_computation_hash: RootHash;
  readonly aggregated_proof_hash: RootHash;
  readonly inputs_snapshot: ProofInputs;
}

export interface EmotionVerdict {
  readonly verdict_id: EmotionVerdictId;
  readonly frame_id: FrameId;
  readonly entity_id: EntityId;
  readonly type: EmotionVerdictType;
  readonly validators_results: readonly EmotionValidatorResult[];
  readonly policy_id: EmotionPolicyId;
  readonly policy_hash: RootHash;
  readonly emotion_hash: RootHash;
  readonly drift_vector: DriftVector;
  readonly toxicity_signal: ToxicitySignal;
  readonly proof: EmotionProof;
  readonly timestamp: number;
  readonly verdict_hash: RootHash;
}

export type EmotionEnforceAction = 'PASSED' | 'BLOCKED' | 'DEFERRED';

export interface EmotionEnforceResult {
  readonly verdict: EmotionVerdict;
  readonly action: EmotionEnforceAction;
}

export interface EmotionVerdictExplanation {
  readonly verdict_id: EmotionVerdictId;
  readonly summary: string;
  readonly validator_explanations: readonly {
    readonly validator_id: EmotionValidatorId;
    readonly result: ValidatorResultType;
    readonly explanation: string;
  }[];
  readonly drift_explanation: string;
  readonly toxicity_explanation: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmotionPolicyRules {
  readonly require_all_pass: boolean;
  readonly allow_defer: boolean;
  readonly fail_on_toxicity: boolean;
  readonly fail_on_drift_above_threshold: boolean;
  readonly require_causality_for_changes: boolean;
}

export interface EmotionThresholds {
  readonly stability_threshold: number;
  readonly delta_max: number;
  readonly amplification_cycles: number;
  readonly toxicity_threshold: number;
  readonly drift_threshold: number;
}

export interface EmotionPolicy {
  readonly policy_id: EmotionPolicyId;
  readonly version: string;
  readonly name: string;
  readonly validators: readonly EmotionValidatorId[];
  readonly rules: EmotionPolicyRules;
  readonly thresholds: EmotionThresholds;
  readonly hash: RootHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Axiom {
  readonly axiom_id: string;
  readonly constraint: string;
  readonly affected_dimensions: readonly (keyof EmotionStateV2)[];
}

export interface NarrativeContext {
  readonly recent_events: readonly string[];
  readonly active_axioms: readonly Axiom[];
}

export interface EmotionGateContext {
  readonly policy: EmotionPolicy;
  readonly calibration: EmotionCalibration;
  readonly axioms: readonly Axiom[];
  readonly narrative_context?: NarrativeContext;
  readonly previous_frame?: EmotionFrame;
  readonly related_entities?: readonly EntityId[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DriftStatistics {
  readonly total_measurements: number;
  readonly average_magnitude: number;
  readonly max_magnitude: number;
  readonly threshold_violations: number;
}

export interface ToxicityStatistics {
  readonly total_checks: number;
  readonly amplification_detected_count: number;
  readonly average_instability: number;
  readonly max_cycles_detected: number;
}

export interface EmotionGateMetrics {
  readonly total_evaluations: number;
  readonly allow_count: number;
  readonly deny_count: number;
  readonly defer_count: number;
  readonly drift_stats: DriftStatistics;
  readonly toxicity_stats: ToxicityStatistics;
}
