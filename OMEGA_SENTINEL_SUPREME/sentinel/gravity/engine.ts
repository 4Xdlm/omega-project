/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — EPISTEMIC GRAVITY ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module gravity/engine
 * @version 2.0.0
 * @license MIT
 * 
 * EPISTEMIC GRAVITY — WEIGHT OF EVIDENCE
 * ======================================
 * 
 * Epistemic gravity represents the accumulated weight of evidence supporting
 * an invariant. Like physical gravity, it provides:
 * 
 * 1. ATTRACTION: Strong evidence pulls the invariant toward stability
 * 2. DECAY: Old evidence loses weight over time (temporal decay)
 * 3. CONFIDENCE: Accumulated gravity translates to confidence levels
 * 
 * The gravity model uses:
 * - Base weight from proof strength (Ω=5, Λ=4, Σ=3, Δ=2, Ε=1)
 * - Temporal decay: weight × λ^(days_since_proof)
 * - Falsification survival bonus: survived attacks add gravity
 * 
 * INVARIANTS:
 * - INV-GRAV-01: Gravity is non-negative and bounded
 * - INV-GRAV-02: Temporal decay is strictly decreasing
 * - INV-GRAV-03: Confidence levels are monotonic with gravity
 * - INV-GRAV-04: Gravity computation is deterministic
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { 
  DEFAULT_DECAY_LAMBDA,
  CONFIDENCE_THRESHOLDS,
  PROOF_STRENGTH_WEIGHTS
} from '../foundation/constants.js';

import { type ProofStrength } from '../foundation/proof_strength.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Temporal decay lambda (re-exported for convenience)
 */
export const TEMPORAL_DECAY_LAMBDA = DEFAULT_DECAY_LAMBDA;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Confidence level based on accumulated gravity
 */
export type ConfidenceLevel = 
  | 'SPECULATIVE'   // Very low confidence
  | 'TENTATIVE'     // Some evidence
  | 'MODERATE'      // Reasonable confidence
  | 'HIGH'          // Strong confidence
  | 'VERY_HIGH'     // Very strong confidence
  | 'CERTAIN';      // Near-certainty

/**
 * A weighted evidence contribution
 */
export interface EvidenceWeight {
  /** Source ID (proof ID, falsification ID, etc.) */
  readonly sourceId: string;
  
  /** Type of evidence */
  readonly type: 'proof' | 'falsification' | 'assertion' | 'external';
  
  /** Base weight (before decay) */
  readonly baseWeight: number;
  
  /** When this evidence was recorded */
  readonly timestamp: string;
  
  /** Current decayed weight */
  readonly decayedWeight: number;
  
  /** Days since evidence was recorded */
  readonly ageInDays: number;
}

/**
 * Gravity state for an invariant
 */
export interface GravityState {
  /** Invariant ID */
  readonly invariantId: string;
  
  /** All evidence weights */
  readonly weights: readonly EvidenceWeight[];
  
  /** Total raw gravity (before normalization) */
  readonly rawGravity: number;
  
  /** Normalized gravity [0, 1] */
  readonly normalizedGravity: number;
  
  /** Current confidence level */
  readonly confidence: ConfidenceLevel;
  
  /** Decay lambda used */
  readonly decayLambda: number;
  
  /** Computation timestamp */
  readonly computedAt: string;
}

/**
 * Input for adding evidence
 */
export interface AddEvidenceInput {
  readonly sourceId: string;
  readonly type: 'proof' | 'falsification' | 'assertion' | 'external';
  readonly baseWeight: number;
  readonly timestamp?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum raw gravity (for normalization)
 * Based on maximum theoretical accumulation
 */
export const MAX_RAW_GRAVITY = 100 as const;

/**
 * Confidence level thresholds (normalized gravity)
 */
export const CONFIDENCE_LEVEL_THRESHOLDS: Readonly<Record<ConfidenceLevel, number>> = Object.freeze({
  SPECULATIVE: 0,      // 0%
  TENTATIVE: 0.15,     // 15%
  MODERATE: 0.35,      // 35%
  HIGH: 0.55,          // 55%
  VERY_HIGH: 0.75,     // 75%
  CERTAIN: 0.90        // 90%
});

/**
 * Confidence levels in order
 */
export const CONFIDENCE_ORDER: readonly ConfidenceLevel[] = Object.freeze([
  'SPECULATIVE',
  'TENTATIVE',
  'MODERATE',
  'HIGH',
  'VERY_HIGH',
  'CERTAIN'
]);

/**
 * Weight multipliers by evidence type
 */
export const EVIDENCE_TYPE_MULTIPLIERS: Readonly<Record<string, number>> = Object.freeze({
  proof: 1.0,
  falsification: 1.2,    // Survived falsification is strong evidence
  assertion: 0.5,        // Assertions are weaker
  external: 1.5          // External certifier evidence is strongest
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPORAL DECAY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate days between two timestamps
 */
export function daysBetween(from: string, to: string): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate decay factor for a given age
 * decay = λ^days
 */
export function calculateDecayFactor(
  ageInDays: number,
  lambda: number = TEMPORAL_DECAY_LAMBDA
): number {
  if (ageInDays < 0) return 1;
  return Math.pow(lambda, ageInDays);
}

/**
 * Apply temporal decay to a weight
 */
export function applyDecay(
  baseWeight: number,
  ageInDays: number,
  lambda: number = TEMPORAL_DECAY_LAMBDA
): number {
  const factor = calculateDecayFactor(ageInDays, lambda);
  return baseWeight * factor;
}

/**
 * Calculate half-life in days for given lambda
 * half-life = ln(0.5) / ln(λ)
 */
export function calculateHalfLife(lambda: number = TEMPORAL_DECAY_LAMBDA): number {
  return Math.log(0.5) / Math.log(lambda);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Greek letters to English names for weight lookup
 */
const GREEK_TO_ENGLISH: Record<string, keyof typeof PROOF_STRENGTH_WEIGHTS> = {
  'Ω': 'OMEGA',
  'Λ': 'LAMBDA',
  'Σ': 'SIGMA',
  'Δ': 'DELTA',
  'Ε': 'EPSILON'
};

/**
 * Get base weight for a proof strength
 */
export function getProofWeight(strength: ProofStrength): number {
  const englishName = GREEK_TO_ENGLISH[strength];
  return englishName ? PROOF_STRENGTH_WEIGHTS[englishName] : 1;
}

/**
 * Create evidence weight from input
 */
export function createEvidenceWeight(
  input: AddEvidenceInput,
  referenceTime: string = new Date().toISOString()
): EvidenceWeight {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const ageInDays = daysBetween(timestamp, referenceTime);
  const typeMultiplier = EVIDENCE_TYPE_MULTIPLIERS[input.type] ?? 1;
  const adjustedBase = input.baseWeight * typeMultiplier;
  const decayedWeight = applyDecay(adjustedBase, ageInDays);
  
  return Object.freeze({
    sourceId: input.sourceId,
    type: input.type,
    baseWeight: adjustedBase,
    timestamp,
    decayedWeight,
    ageInDays
  });
}

/**
 * Recompute decayed weight for a reference time
 */
export function recomputeWeight(
  weight: EvidenceWeight,
  referenceTime: string
): EvidenceWeight {
  const ageInDays = daysBetween(weight.timestamp, referenceTime);
  const decayedWeight = applyDecay(weight.baseWeight, ageInDays);
  
  return Object.freeze({
    ...weight,
    decayedWeight,
    ageInDays
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAVITY COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create initial gravity state
 */
export function createGravityState(invariantId: string): GravityState {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  return Object.freeze({
    invariantId,
    weights: Object.freeze([]),
    rawGravity: 0,
    normalizedGravity: 0,
    confidence: 'SPECULATIVE',
    decayLambda: TEMPORAL_DECAY_LAMBDA,
    computedAt: now
  });
}

/**
 * Add evidence to gravity state
 */
export function addEvidence(
  state: GravityState,
  input: AddEvidenceInput
): GravityState {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const weight = createEvidenceWeight(input, now);
  
  const newWeights = Object.freeze([...state.weights, weight]);
  const rawGravity = computeRawGravity(newWeights);
  const normalizedGravity = normalizeGravity(rawGravity);
  const confidence = determineConfidence(normalizedGravity);
  
  return Object.freeze({
    ...state,
    weights: newWeights,
    rawGravity,
    normalizedGravity,
    confidence,
    computedAt: now
  });
}

/**
 * Recompute gravity with current time (refresh decay)
 */
export function refreshGravity(state: GravityState): GravityState {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  
  // Recompute all weights with current time
  const newWeights = Object.freeze(
    state.weights.map(w => recomputeWeight(w, now))
  );
  
  const rawGravity = computeRawGravity(newWeights);
  const normalizedGravity = normalizeGravity(rawGravity);
  const confidence = determineConfidence(normalizedGravity);
  
  return Object.freeze({
    ...state,
    weights: newWeights,
    rawGravity,
    normalizedGravity,
    confidence,
    computedAt: now
  });
}

/**
 * Compute raw gravity from weights
 */
export function computeRawGravity(weights: readonly EvidenceWeight[]): number {
  return weights.reduce((sum, w) => sum + w.decayedWeight, 0);
}

/**
 * Normalize gravity to [0, 1]
 */
export function normalizeGravity(rawGravity: number): number {
  return Math.min(1, Math.max(0, rawGravity / MAX_RAW_GRAVITY));
}

/**
 * Determine confidence level from normalized gravity
 */
export function determineConfidence(normalizedGravity: number): ConfidenceLevel {
  // Go through levels in reverse order (highest first)
  for (let i = CONFIDENCE_ORDER.length - 1; i >= 0; i--) {
    const level = CONFIDENCE_ORDER[i];
    if (normalizedGravity >= CONFIDENCE_LEVEL_THRESHOLDS[level]) {
      return level;
    }
  }
  return 'SPECULATIVE';
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get total evidence count
 */
export function countEvidence(state: GravityState): number {
  return state.weights.length;
}

/**
 * Get evidence by type
 */
export function getEvidenceByType(
  state: GravityState,
  type: 'proof' | 'falsification' | 'assertion' | 'external'
): readonly EvidenceWeight[] {
  return state.weights.filter(w => w.type === type);
}

/**
 * Get strongest evidence (highest decayed weight)
 */
export function getStrongestEvidence(state: GravityState): EvidenceWeight | null {
  if (state.weights.length === 0) return null;
  
  return state.weights.reduce((strongest, current) => 
    current.decayedWeight > strongest.decayedWeight ? current : strongest
  );
}

/**
 * Get oldest evidence
 */
export function getOldestEvidence(state: GravityState): EvidenceWeight | null {
  if (state.weights.length === 0) return null;
  
  return state.weights.reduce((oldest, current) => 
    current.ageInDays > oldest.ageInDays ? current : oldest
  );
}

/**
 * Get newest evidence
 */
export function getNewestEvidence(state: GravityState): EvidenceWeight | null {
  if (state.weights.length === 0) return null;
  
  return state.weights.reduce((newest, current) => 
    current.ageInDays < newest.ageInDays ? current : newest
  );
}

/**
 * Get average evidence age
 */
export function getAverageAge(state: GravityState): number {
  if (state.weights.length === 0) return 0;
  
  const totalAge = state.weights.reduce((sum, w) => sum + w.ageInDays, 0);
  return totalAge / state.weights.length;
}

/**
 * Get decay factor statistics
 */
export function getDecayStats(state: GravityState): {
  readonly minDecay: number;
  readonly maxDecay: number;
  readonly avgDecay: number;
} {
  if (state.weights.length === 0) {
    return { minDecay: 1, maxDecay: 1, avgDecay: 1 };
  }
  
  const decayFactors = state.weights.map(w => 
    w.baseWeight > 0 ? w.decayedWeight / w.baseWeight : 1
  );
  
  return {
    minDecay: Math.min(...decayFactors),
    maxDecay: Math.max(...decayFactors),
    avgDecay: decayFactors.reduce((a, b) => a + b, 0) / decayFactors.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if confidence meets a minimum level
 */
export function meetsConfidence(
  state: GravityState,
  minimum: ConfidenceLevel
): boolean {
  const currentIndex = CONFIDENCE_ORDER.indexOf(state.confidence);
  const minimumIndex = CONFIDENCE_ORDER.indexOf(minimum);
  return currentIndex >= minimumIndex;
}

/**
 * Get next confidence level to achieve
 */
export function getNextConfidenceLevel(state: GravityState): ConfidenceLevel | null {
  const currentIndex = CONFIDENCE_ORDER.indexOf(state.confidence);
  if (currentIndex >= CONFIDENCE_ORDER.length - 1) {
    return null; // Already at highest
  }
  return CONFIDENCE_ORDER[currentIndex + 1];
}

/**
 * Calculate gravity needed to reach next confidence level
 */
export function gravityToNextLevel(state: GravityState): number {
  const nextLevel = getNextConfidenceLevel(state);
  if (!nextLevel) return 0;
  
  const targetNormalized = CONFIDENCE_LEVEL_THRESHOLDS[nextLevel];
  const needed = targetNormalized - state.normalizedGravity;
  return Math.max(0, needed * MAX_RAW_GRAVITY);
}

/**
 * Calculate evidence freshness (how much is recent)
 */
export function calculateFreshness(state: GravityState, recentDays: number = 30): number {
  if (state.weights.length === 0) return 0;
  
  const recentWeights = state.weights.filter(w => w.ageInDays <= recentDays);
  const recentGravity = recentWeights.reduce((sum, w) => sum + w.decayedWeight, 0);
  
  return state.rawGravity > 0 ? recentGravity / state.rawGravity : 0;
}

/**
 * Check if gravity is primarily from recent evidence
 */
export function isFresh(state: GravityState, threshold: number = 0.5): boolean {
  return calculateFreshness(state) >= threshold;
}

/**
 * Check if gravity is stale (mostly old evidence)
 */
export function isStale(state: GravityState, threshold: number = 0.3): boolean {
  return calculateFreshness(state) < threshold;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare confidence levels
 */
export function compareConfidence(
  a: ConfidenceLevel,
  b: ConfidenceLevel
): 'HIGHER' | 'EQUAL' | 'LOWER' {
  const indexA = CONFIDENCE_ORDER.indexOf(a);
  const indexB = CONFIDENCE_ORDER.indexOf(b);
  
  if (indexA > indexB) return 'HIGHER';
  if (indexA < indexB) return 'LOWER';
  return 'EQUAL';
}

/**
 * Get the higher of two confidence levels
 */
export function maxConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const indexA = CONFIDENCE_ORDER.indexOf(a);
  const indexB = CONFIDENCE_ORDER.indexOf(b);
  return indexA >= indexB ? a : b;
}

/**
 * Get the lower of two confidence levels
 */
export function minConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const indexA = CONFIDENCE_ORDER.indexOf(a);
  const indexB = CONFIDENCE_ORDER.indexOf(b);
  return indexA <= indexB ? a : b;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if value is a valid confidence level
 */
export function isConfidenceLevel(value: unknown): value is ConfidenceLevel {
  return typeof value === 'string' && 
    CONFIDENCE_ORDER.includes(value as ConfidenceLevel);
}

/**
 * Check if value is a valid evidence type
 */
export function isEvidenceType(value: unknown): value is 'proof' | 'falsification' | 'assertion' | 'external' {
  return typeof value === 'string' &&
    ['proof', 'falsification', 'assertion', 'external'].includes(value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format gravity state summary
 */
export function formatGravitySummary(state: GravityState): string {
  const lines = [
    `Gravity State for ${state.invariantId}`,
    `═══════════════════════════════════`,
    `Evidence Count: ${state.weights.length}`,
    `Raw Gravity: ${state.rawGravity.toFixed(2)}`,
    `Normalized: ${(state.normalizedGravity * 100).toFixed(1)}%`,
    `Confidence: ${state.confidence}`,
    `Decay Lambda: ${state.decayLambda}`,
    `Computed At: ${state.computedAt}`
  ];
  
  const freshness = calculateFreshness(state);
  lines.push(`Freshness: ${(freshness * 100).toFixed(1)}%`);
  
  const nextLevel = getNextConfidenceLevel(state);
  if (nextLevel) {
    const needed = gravityToNextLevel(state);
    lines.push(`To ${nextLevel}: +${needed.toFixed(2)} gravity`);
  }
  
  return lines.join('\n');
}

/**
 * Format confidence level description
 */
export function getConfidenceDescription(level: ConfidenceLevel): string {
  const descriptions: Record<ConfidenceLevel, string> = {
    SPECULATIVE: 'Very low confidence - needs significant evidence',
    TENTATIVE: 'Some evidence exists - needs more validation',
    MODERATE: 'Reasonable confidence - evidence is accumulating',
    HIGH: 'Strong confidence - well-supported by evidence',
    VERY_HIGH: 'Very strong confidence - extensive evidence',
    CERTAIN: 'Near-certainty - overwhelming evidence'
  };
  return descriptions[level];
}
