/**
 * OMEGA Scribe Engine -- Type Definitions
 * Phase C.2 -- Governed Writing Engine
 * All types are readonly and immutable by design.
 * Standard: NASA-Grade L4
 */

// Re-export genesis-planner types needed by consumers
export type { GenesisPlan, Arc, Scene, Beat, Seed, SubtextLayer } from '@omega/genesis-planner';
export type { Canon, CanonEntry, Constraints, StyleGenomeInput, EmotionTarget } from '@omega/genesis-planner';
export type { GConfig, GConfigSymbol, GVerdict } from '@omega/genesis-planner';

// ===================== SCRIBE VERDICTS =====================

export type SVerdict = 'PASS' | 'FAIL';

export type SInvariantId =
  | 'S-INV-01' | 'S-INV-02' | 'S-INV-03' | 'S-INV-04'
  | 'S-INV-05' | 'S-INV-06' | 'S-INV-07' | 'S-INV-08';

export type GateId =
  | 'TRUTH_GATE' | 'NECESSITY_GATE' | 'BANALITY_GATE' | 'STYLE_GATE'
  | 'EMOTION_GATE' | 'DISCOMFORT_GATE' | 'QUALITY_GATE';

export type OracleId =
  | 'ORACLE_TRUTH' | 'ORACLE_NECESSITY' | 'ORACLE_STYLE'
  | 'ORACLE_EMOTION' | 'ORACLE_BANALITY' | 'ORACLE_CROSSREF';

// ===================== SEGMENTS =====================

export type SegmentType =
  | 'intent' | 'conflict' | 'action' | 'reveal' | 'conceal'
  | 'pivot' | 'payoff' | 'transition' | 'sensory' | 'subtext';

export interface Segment {
  readonly segment_id: string;
  readonly type: SegmentType;
  readonly source_beat_id: string;
  readonly source_scene_id: string;
  readonly source_arc_id: string;
  readonly content: string;
  readonly role: string;
  readonly canon_refs: readonly string[];
  readonly seed_refs: readonly string[];
  readonly emotion: string;
  readonly intensity: number;
  readonly tension_delta: -1 | 0 | 1;
  readonly is_pivot: boolean;
  readonly subtext_slot: string;
}

// ===================== SKELETON =====================

export interface SkeletonDoc {
  readonly skeleton_id: string;
  readonly skeleton_hash: string;
  readonly plan_id: string;
  readonly plan_hash: string;
  readonly segments: readonly Segment[];
  readonly segment_count: number;
  readonly scene_order: readonly string[];
}

// ===================== PROSE =====================

export interface ProseParagraph {
  readonly paragraph_id: string;
  readonly segment_ids: readonly string[];
  readonly text: string;
  readonly word_count: number;
  readonly sentence_count: number;
  readonly avg_sentence_length: number;
  readonly emotion: string;
  readonly intensity: number;
  readonly rhetorical_devices: readonly string[];
  readonly sensory_anchors: readonly string[];
  readonly motif_refs: readonly string[];
  readonly canon_refs: readonly string[];
}

export interface ProseDoc {
  readonly prose_id: string;
  readonly prose_hash: string;
  readonly skeleton_id: string;
  readonly paragraphs: readonly ProseParagraph[];
  readonly total_word_count: number;
  readonly total_sentence_count: number;
  readonly pass_number: number;
}

// ===================== GATES =====================

export interface GateViolation {
  readonly gate_id: GateId;
  readonly invariant: SInvariantId;
  readonly paragraph_id: string;
  readonly message: string;
  readonly severity: 'FATAL' | 'ERROR';
  readonly details: string;
}

export interface GateResult {
  readonly gate_id: GateId;
  readonly verdict: SVerdict;
  readonly violations: readonly GateViolation[];
  readonly metrics: Readonly<Record<string, number>>;
  readonly timestamp_deterministic: string;
}

export interface GateChainResult {
  readonly verdict: SVerdict;
  readonly gate_results: readonly GateResult[];
  readonly first_failure: GateId | null;
  readonly total_violations: number;
}

// ===================== ORACLES =====================

export interface OracleResult {
  readonly oracle_id: OracleId;
  readonly verdict: SVerdict;
  readonly score: number;
  readonly findings: readonly string[];
  readonly evidence_hash: string;
}

export interface OracleChainResult {
  readonly verdict: SVerdict;
  readonly oracle_results: readonly OracleResult[];
  readonly weakest_oracle: OracleId | null;
  readonly combined_score: number;
}

// ===================== REWRITE =====================

export interface RewriteCandidate {
  readonly pass_number: number;
  readonly prose: ProseDoc;
  readonly gate_result: GateChainResult;
  readonly oracle_result: OracleChainResult;
  readonly accepted: boolean;
  readonly rejection_reason: string | null;
}

export interface RewriteHistory {
  readonly candidates: readonly RewriteCandidate[];
  readonly accepted_pass: number;
  readonly total_passes: number;
  readonly rewrite_hash: string;
}

// ===================== SCRIBE OUTPUT =====================

export interface ScribeOutput {
  readonly output_id: string;
  readonly output_hash: string;
  readonly plan_id: string;
  readonly plan_hash: string;
  readonly skeleton_hash: string;
  readonly final_prose: ProseDoc;
  readonly rewrite_history: RewriteHistory;
  readonly gate_result: GateChainResult;
  readonly oracle_result: OracleChainResult;
  readonly segment_to_paragraph_map: Readonly<Record<string, string[]>>;
}

// ===================== CONFIG =====================

export interface SConfigSymbol {
  readonly value: number | string | readonly string[];
  readonly unit: string;
  readonly rule: string;
  readonly derivation: string;
}

export interface SConfig {
  readonly REWRITE_MAX_PASSES: SConfigSymbol;
  readonly NECESSITY_MIN_RATIO: SConfigSymbol;
  readonly BANALITY_MAX_COUNT: SConfigSymbol;
  readonly STYLE_DEVIATION_MAX: SConfigSymbol;
  readonly EMOTION_PIVOT_TOLERANCE: SConfigSymbol;
  readonly DISCOMFORT_MIN_FRICTION: SConfigSymbol;
  readonly QUALITY_MIN_DENSITY: SConfigSymbol;
  readonly TRUTH_MAX_UNSUPPORTED: SConfigSymbol;
  readonly IA_SPEAK_PATTERNS: SConfigSymbol;
  readonly CLICHE_REGISTRY: SConfigSymbol;
  readonly MIN_SENSORY_PER_SCENE: SConfigSymbol;
  readonly MOTIF_RECURRENCE_MIN: SConfigSymbol;
}

// ===================== EVIDENCE =====================

export interface SEvidenceStep {
  readonly step: string;
  readonly input_hash: string;
  readonly output_hash: string;
  readonly rule_applied: string;
  readonly verdict: SVerdict;
  readonly timestamp_deterministic: string;
}

export interface SEvidenceChain {
  readonly output_id: string;
  readonly steps: readonly SEvidenceStep[];
  readonly chain_hash: string;
}

// ===================== REPORT =====================

export interface ScribeMetrics {
  readonly total_words: number;
  readonly total_sentences: number;
  readonly total_paragraphs: number;
  readonly total_segments: number;
  readonly avg_sentence_length: number;
  readonly burstiness: number;
  readonly lexical_richness: number;
  readonly dialogue_ratio: number;
  readonly description_density: number;
  readonly sensory_anchor_count: number;
  readonly motif_count: number;
  readonly rhetorical_device_count: number;
  readonly banality_count: number;
  readonly unsupported_claim_count: number;
  readonly emotion_pivot_coverage: number;
  readonly necessity_ratio: number;
  readonly rewrite_passes: number;
}

export interface ScribeReport {
  readonly output_id: string;
  readonly output_hash: string;
  readonly plan_id: string;
  readonly verdict: SVerdict;
  readonly gate_result: GateChainResult;
  readonly oracle_result: OracleChainResult;
  readonly metrics: ScribeMetrics;
  readonly evidence: SEvidenceChain;
  readonly config_hash: string;
  readonly timestamp_deterministic: string;
}
