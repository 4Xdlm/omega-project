/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Constants
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Fixed parameters. No debate. These values prevent MUSE from "making noise".
 * MUSE must speak little, but right.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum suggestions per SUGGEST call */
export const MAX_SUGGESTIONS = 5;

/** Minimum suggestions (MUSE must always propose something unless error) */
export const MIN_SUGGESTIONS = 1;

/** Maximum emotion history for ASSESS */
export const MAX_HISTORY = 10;

/** Maximum projection horizon for PROJECT */
export const MAX_HORIZON = 5;

/** Maximum scenarios in PROJECT output */
export const MAX_SCENARIOS = 4;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE & SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum confidence (never 1.0 — probabilities only) */
export const CONFIDENCE_CAP = 0.95;

/** Minimum confidence */
export const CONFIDENCE_MIN = 0.05;

/** Minimum score to survive filtering */
export const MIN_SCORE_TO_SURVIVE = 0.62;

/** Minimum canon safety to not be rejected */
export const MIN_CANON_SAFETY = 0.70;

/** Minimum actionability to not be rejected */
export const MIN_ACTIONABILITY = 0.55;

// ═══════════════════════════════════════════════════════════════════════════════
// DIVERSITY
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimum distance between suggestions (anti-clone) */
export const DIVERSITY_MIN_DISTANCE = 0.35;

/** Minimum different strategy types in final output */
export const MIN_DISTINCT_TYPES = 2;

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING WEIGHTS (sum = 1.00)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scoring formula:
 * score = 0.22A + 0.20C + 0.18E + 0.16N + 0.14S + 0.10R
 * 
 * Prioritizes action and context. A "great idea" that's unusable = trash.
 */
export const SCORING_WEIGHTS = {
  /** Actionability: can you write it NOW? */
  actionability: 0.22,
  /** Context Fit: matches scene_goal, current_beat, constraints */
  context_fit: 0.20,
  /** Emotional Leverage: exploits dominant + secondary emotions */
  emotional_leverage: 0.18,
  /** Novelty: different from other candidates + history */
  novelty: 0.16,
  /** Canon Safety: risk of violation (1 = safe) */
  canon_safety: 0.14,
  /** Arc Alignment: coherent with NarrativeArc */
  arc_alignment: 0.10,
} as const;

// Compile-time check: weights sum to 1.0
const _weightSum = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(_weightSum - 1.0) > 0.001) {
  throw new Error(`SCORING_WEIGHTS must sum to 1.0, got ${_weightSum}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

export const STRATEGY_IDS = {
  BEAT_NEXT: 'beat_next',
  TENSION_DELTA: 'tension_delta',
  CONTRAST_KNIFE: 'contrast_knife',
  REFRAME_TRUTH: 'reframe_truth',
  AGENCY_INJECTION: 'agency_injection',
} as const;

export type StrategyId = typeof STRATEGY_IDS[keyof typeof STRATEGY_IDS];

export const ALL_STRATEGIES: readonly StrategyId[] = Object.values(STRATEGY_IDS);

// ═══════════════════════════════════════════════════════════════════════════════
// RISK TYPES (closed list v1)
// ═══════════════════════════════════════════════════════════════════════════════

export const RISK_TYPES = {
  REPETITION_LOOP: 'repetition_loop',
  EMOTIONAL_FLATLINE: 'emotional_flatline',
  ARC_INCOHERENCE: 'arc_incoherence',
  TONE_DRIFT: 'tone_drift',
  STAKES_MISMATCH: 'stakes_mismatch',
  CHARACTER_AGENCY_LOSS: 'character_agency_loss',
  OVERHEAT: 'overheat',
} as const;

export type RiskType = typeof RISK_TYPES[keyof typeof RISK_TYPES];

export const ALL_RISK_TYPES: readonly RiskType[] = Object.values(RISK_TYPES);

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE / TIMING
// ═══════════════════════════════════════════════════════════════════════════════

/** Cache TTL in milliseconds (1 hour) */
export const CACHE_TTL_MS = 3600000;

/** Maximum cache entries */
export const CACHE_MAX_SIZE = 500;

/** Default timeout for MUSE operations (ms) */
export const DEFAULT_TIMEOUT_MS = 5000;
