/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Types
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * MUSE is not an AI that "invents ideas".
 * It's a DETERMINISTIC PROPOSAL ENGINE based on:
 * - ORACLE v2 emotion analysis
 * - Narrative Physics (inertia, gravity, attractors)
 * - Harmonic Resonance (suggestion coherence)
 * - Tension Topology (narrative surface model)
 * 
 * DIVINE EDITION — Never seen before.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

import type { EmotionStateV2, EmotionId } from '../emotion_v2';
import type { StrategyId, RiskType } from './constants';

// ═══════════════════════════════════════════════════════════════════════════════
// NARRATIVE CONTEXT (Input)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Where we are in the story — required context for MUSE
 */
export interface NarrativeContext {
  /** Current scene identifier */
  scene_id: string;
  /** Scene goal (what should this scene accomplish?) */
  scene_goal: string;
  /** Current beat in the scene */
  current_beat: string;
  /** Active characters in scene */
  characters: CharacterState[];
  /** Hard constraints (things that CANNOT happen) */
  constraints: string[];
  /** Style profile for tone checking */
  style_profile: StyleProfile;
}

export interface CharacterState {
  id: string;
  name: string;
  /** Is this character active (has agency) or passive? */
  agency_level: 'high' | 'medium' | 'low' | 'none';
  /** Character's current emotional state */
  emotional_state: EmotionId;
  /** Beats since last significant action */
  beats_since_action: number;
}

export interface StyleProfile {
  /** Overall tone: dark, light, neutral, mixed */
  tone: 'dark' | 'light' | 'neutral' | 'mixed';
  /** Pacing: slow, medium, fast */
  pacing: 'slow' | 'medium' | 'fast';
  /** Genre constraints */
  genre: string;
  /** Acceptable emotion intensity range */
  intensity_range: [number, number];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NARRATIVE ARC (For ASSESS)
// ═══════════════════════════════════════════════════════════════════════════════

export interface NarrativeArc {
  /** Arc identifier */
  id: string;
  /** Arc type: rise, fall, flat, oscillate */
  type: 'rise' | 'fall' | 'flat' | 'oscillate';
  /** Target emotion at arc end */
  target_emotion: EmotionId;
  /** Current position in arc (0..1) */
  progress: number;
  /** Expected tension at current position */
  expected_tension: number;
  /** Stakes level declared */
  stakes: 'low' | 'medium' | 'high' | 'critical';
}

// ═══════════════════════════════════════════════════════════════════════════════
// F1: SUGGEST — Input/Output
// ═══════════════════════════════════════════════════════════════════════════════

export interface SuggestInput {
  /** Current emotion snapshot from ORACLE v2 */
  emotion: EmotionStateV2;
  /** Narrative context */
  context: NarrativeContext;
  /** REQUIRED: seed for determinism */
  seed: number;
  /** Optional: previous suggestions to avoid repetition */
  previous_suggestions?: string[];
}

export interface SuggestOutput {
  /** 1-5 suggestions, scored, justified, non-redundant */
  suggestions: Suggestion[];
  /** Hash of entire output for verification */
  output_hash: string;
  /** Input hash for traceability */
  input_hash: string;
  /** Seed used */
  seed: number;
  /** Processing metadata */
  meta: SuggestMeta;
}

export interface SuggestMeta {
  /** Total candidates generated across all strategies */
  candidates_generated: number;
  /** Candidates rejected and why */
  rejections: Rejection[];
  /** Strategy trace for audit */
  strategy_trace: StrategyTrace[];
  /** Harmonic analysis of final set */
  harmonic_analysis: HarmonicAnalysis;
  /** Processing time in ms */
  duration_ms: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGESTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface Suggestion {
  /** Unique ID: sha256(strategy + input_hash + seed + fingerprint) */
  id: string;
  /** Which strategy generated this */
  strategy: StrategyId;
  /** Human-readable suggestion */
  content: string;
  /** Target character (if applicable) */
  target_character?: string;
  /** Expected emotion shift */
  expected_shift: EmotionShift;
  /** Final score (0..1, min 0.62 to survive) */
  score: number;
  /** Confidence (0..0.95, never 1) */
  confidence: number;
  /** REQUIRED: structured rationale */
  rationale: Rationale;
  /** Score breakdown for transparency */
  score_breakdown: ScoreBreakdown;
  /** Physics compliance data */
  physics: PhysicsCompliance;
}

export interface EmotionShift {
  /** Starting emotion */
  from: EmotionId;
  /** Target emotion */
  to: EmotionId;
  /** Expected delta in intensity (-1..1) */
  intensity_delta: number;
  /** Transition type */
  transition_type: 'natural' | 'forced' | 'pivot';
}

/**
 * RATIONALE — Structured justification (no blabla)
 * INV-MUSE-01: All fields required
 */
export interface Rationale {
  /** Trigger: source emotion(s) + intensities */
  trigger: {
    emotions: EmotionId[];
    intensities: number[];
  };
  /** Constraint check: why this is safe */
  constraint_check: string;
  /** Mechanism: which narrative lever (tension/contrast/reveal/agency) */
  mechanism: 'tension' | 'contrast' | 'reveal' | 'agency' | 'resolution';
  /** Expected outcome: what emotional delta is expected */
  expected_outcome: string;
  /** REQUIRED: 1-sentence execution example */
  minimal_draft: string;
}

export interface ScoreBreakdown {
  /** Actionability (A): can you write it NOW? */
  actionability: number;
  /** Context Fit (C): matches scene_goal, beat, constraints */
  context_fit: number;
  /** Emotional Leverage (E): exploits emotions properly */
  emotional_leverage: number;
  /** Novelty (N): different from others + history */
  novelty: number;
  /** Canon Safety (S): risk of violation (1 = safe) */
  canon_safety: number;
  /** Arc Alignment (R): coherent with arc */
  arc_alignment: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHYSICS COMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════════

export interface PhysicsCompliance {
  /** Does this transition respect inertia? */
  inertia_respected: boolean;
  /** Gravity score: how "natural" is this transition */
  gravity_score: number;
  /** Is target an attractor, repulsor, or neutral? */
  target_type: 'attractor' | 'repulsor' | 'neutral';
  /** Transition matrix validation */
  transition_valid: boolean;
  /** Energy required for this transition (high = forced) */
  energy_required: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HARMONIC ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface HarmonicAnalysis {
  /** Overall consonance score (0..1) */
  consonance: number;
  /** Do suggestions form a coherent micro-arc? */
  progression_coherent: boolean;
  /** Which suggestion is the "wild card" (controlled dissonance)? */
  wild_card_id: string | null;
  /** Diversity score */
  diversity_score: number;
  /** Number of distinct strategy types used */
  distinct_types: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY TRACE (Audit)
// ═══════════════════════════════════════════════════════════════════════════════

export interface StrategyTrace {
  strategy: StrategyId;
  candidates_count: number;
  survivors_count: number;
  best_score: number;
  worst_score: number;
  rejection_reasons: string[];
}

export interface Rejection {
  suggestion_fingerprint: string;
  strategy: StrategyId;
  reason: RejectionReason;
  score?: number;
  detail: string;
}

export type RejectionReason =
  | 'score_too_low'
  | 'actionability_too_low'
  | 'canon_safety_too_low'
  | 'diversity_too_similar'
  | 'physics_violation'
  | 'transition_invalid';

// ═══════════════════════════════════════════════════════════════════════════════
// F2: ASSESS — Input/Output
// ═══════════════════════════════════════════════════════════════════════════════

export interface AssessInput {
  /** Current emotion state */
  current: EmotionStateV2;
  /** History (max 10) */
  history: EmotionStateV2[];
  /** Narrative arc in progress */
  arc: NarrativeArc;
  /** Style profile for tone checking */
  style_profile: StyleProfile;
}

export interface AssessOutput {
  /** Identified risks, sorted by priority */
  risks: RiskFlag[];
  /** Overall health score (0..1) */
  health_score: number;
  /** Output hash */
  output_hash: string;
  /** Input hash */
  input_hash: string;
  /** Processing time */
  duration_ms: number;
}

export interface RiskFlag {
  /** Unique ID */
  id: string;
  /** Risk type (closed list) */
  type: RiskType;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Human description */
  description: string;
  /** Evidence: concrete data proving this risk */
  evidence: Evidence[];
  /** Impact if not addressed */
  impact: string;
  /** REQUIRED: concrete remediation action */
  remediation: string;
  /** Priority order (lower = more urgent) */
  priority: number;
  /** Confidence in this assessment */
  confidence: number;
}

export interface Evidence {
  /** What metric or observation */
  metric: string;
  /** Observed value */
  value: number | string;
  /** Expected/threshold value */
  expected: number | string;
  /** Delta or deviation */
  deviation: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// F3: PROJECT — Input/Output
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProjectInput {
  /** History (min 3 for meaningful projection) */
  history: EmotionStateV2[];
  /** Current context */
  context: NarrativeContext;
  /** Steps to project (max 5) */
  horizon: number;
  /** REQUIRED: seed for determinism */
  seed: number;
}

export interface ProjectOutput {
  /** Identified trends */
  trends: TrendLine[];
  /** Possible scenarios (2-4, probabilities sum ≤ 1) */
  scenarios: Scenario[];
  /** Overall confidence */
  confidence: number;
  /** Actual horizon (may be < requested if insufficient data) */
  horizon_actual: number;
  /** Reason if horizon was reduced */
  horizon_reduction_reason?: string;
  /** Output hash */
  output_hash: string;
  /** Input hash */
  input_hash: string;
  /** Seed used */
  seed: number;
  /** Processing time */
  duration_ms: number;
}

export interface TrendLine {
  /** Which emotion this trend concerns */
  emotion: EmotionId;
  /** Direction: rising, falling, stable, oscillating */
  direction: 'rising' | 'falling' | 'stable' | 'oscillating';
  /** Strength of trend (0..1) */
  strength: number;
  /** Predicted value at horizon */
  predicted_value: number;
  /** Confidence band (±) */
  confidence_band: number;
}

export interface Scenario {
  /** Unique ID */
  id: string;
  /** Human description */
  description: string;
  /** Probability (0..1, all scenarios sum ≤ 1) */
  probability: number;
  /** Dominant emotion in this scenario */
  dominant_emotion: EmotionId;
  /** What would trigger this scenario */
  trigger_conditions: string[];
  /** Tension topology position */
  topology_position: TopologyPosition;
}

export interface TopologyPosition {
  /** Is this a peak, valley, slope, or pivot? */
  type: 'peak' | 'valley' | 'slope' | 'pivot';
  /** Tension level (0..1) */
  tension: number;
  /** Stability (how likely to stay here) */
  stability: number;
  /** Natural direction from this position */
  gradient_direction: 'up' | 'down' | 'flat';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUSE ENGINE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface MuseConfig {
  /** Enable physics validation */
  enable_physics: boolean;
  /** Enable harmonic analysis */
  enable_harmonic: boolean;
  /** Enable topology calculations */
  enable_topology: boolean;
  /** Enable caching */
  enable_cache: boolean;
  /** Enable audit trail */
  enable_audit: boolean;
  /** Strict mode: fail on any physics violation */
  strict_mode: boolean;
}

export const DEFAULT_MUSE_CONFIG: MuseConfig = {
  enable_physics: true,
  enable_harmonic: true,
  enable_topology: true,
  enable_cache: true,
  enable_audit: true,
  strict_mode: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export type MuseAuditAction =
  | 'MUSE_SUGGEST_START'
  | 'MUSE_SUGGEST_STRATEGY'
  | 'MUSE_SUGGEST_SCORE'
  | 'MUSE_SUGGEST_REJECT'
  | 'MUSE_SUGGEST_DIVERSIFY'
  | 'MUSE_SUGGEST_HARMONIC'
  | 'MUSE_SUGGEST_COMPLETE'
  | 'MUSE_ASSESS_START'
  | 'MUSE_ASSESS_RISK'
  | 'MUSE_ASSESS_COMPLETE'
  | 'MUSE_PROJECT_START'
  | 'MUSE_PROJECT_TREND'
  | 'MUSE_PROJECT_SCENARIO'
  | 'MUSE_PROJECT_COMPLETE'
  | 'MUSE_CACHE_HIT'
  | 'MUSE_PHYSICS_CHECK'
  | 'MUSE_ERROR';

export interface MuseAuditEvent {
  type: 'MUSE';
  action: MuseAuditAction;
  timestamp_ms: number;
  trace_id: string;
  input_hash: string;
  seed?: number;
  details: Record<string, unknown>;
}
