/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Module
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * MUSE: Narrative Suggestion Engine
 * 
 * MUSE is not an AI that "invents ideas".
 * It's a DETERMINISTIC PROPOSAL ENGINE based on:
 * - ORACLE v2 emotion analysis
 * - Narrative Physics (inertia, gravity, attractors)
 * - Harmonic Resonance (suggestion coherence)
 * - Tension Topology (narrative surface model)
 * - Multi-axis scoring
 * - Anti-clone diversification
 * 
 * Objective: 5 suggestions max, each executable, justified, non-redundant.
 * 
 * @version 1.0.0
 * @phase 14.4
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  MAX_SUGGESTIONS,
  MIN_SUGGESTIONS,
  MAX_HISTORY,
  MAX_HORIZON,
  MAX_SCENARIOS,
  CONFIDENCE_CAP,
  CONFIDENCE_MIN,
  MIN_SCORE_TO_SURVIVE,
  MIN_CANON_SAFETY,
  MIN_ACTIONABILITY,
  DIVERSITY_MIN_DISTANCE,
  MIN_DISTINCT_TYPES,
  SCORING_WEIGHTS,
  STRATEGY_IDS,
  ALL_STRATEGIES,
  RISK_TYPES,
  ALL_RISK_TYPES,
  CACHE_TTL_MS,
  CACHE_MAX_SIZE,
  DEFAULT_TIMEOUT_MS,
  type StrategyId,
  type RiskType,
} from './constants';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Context types
  NarrativeContext,
  CharacterState,
  StyleProfile,
  NarrativeArc,
  
  // Suggest types
  SuggestInput,
  SuggestOutput,
  Suggestion,
  EmotionShift,
  Rationale,
  ScoreBreakdown,
  PhysicsCompliance,
  HarmonicAnalysis,
  SuggestMeta,
  StrategyTrace,
  Rejection,
  RejectionReason,
  
  // Assess types
  AssessInput,
  AssessOutput,
  RiskFlag,
  Evidence,
  
  // Project types
  ProjectInput,
  ProjectOutput,
  TrendLine,
  Scenario,
  TopologyPosition,
  
  // Config types
  MuseConfig,
  MuseAuditEvent,
  MuseAuditAction,
} from './types';

export { DEFAULT_MUSE_CONFIG } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PRNG
// ═══════════════════════════════════════════════════════════════════════════════

export {
  createPRNG,
  nextFloat,
  nextInt,
  nextBool,
  shuffle,
  pickN,
  pickOne,
  nextGaussian,
  generateId,
  clonePRNG,
  resetPRNG,
  getPRNGFingerprint,
  type PRNGState,
} from './prng';

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

export {
  sha256,
  stableStringify,
  hashEmotionState,
  hashContext,
  hashSuggestInput,
  hashAssessInput,
  hashProjectInput,
  fingerprintSuggestion,
  generateSuggestionId,
  generateOutputHash,
  hashRationale,
  quickHash,
  verifyHash,
} from './fingerprint';

// ═══════════════════════════════════════════════════════════════════════════════
// PHYSICS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Inertia
  EMOTION_MASS,
  calculateInertia,
  calculateShiftEnergy,
  validateInertia,
  calculateMomentum,
  predictResistance,
  getEmotionalDistance,
  getEmotionFamily,
  
  // Gravity
  GRAVITY_MATRIX,
  getGravity,
  getAttractions,
  getRepulsions,
  calculateNaturalTrajectory,
  scoreTransitionNaturalness,
  getGravitationalPath,
  calculatePathEnergy,
  
  // Attractors
  UNIVERSAL_ATTRACTORS,
  REPULSOR_STATES,
  findActiveAttractors,
  calculateAttractorPull,
  isRepulsor,
  getBasin,
  distanceToAttractor,
  type Attractor,
  type AttractorType,
  type AttractorCondition,
  
  // Transitions
  TRANSITIONS,
  getTransition,
  isTransitionValid,
  getNaturalTransitions,
  getValidPath,
  getTransitionDifficulty,
  getTransitionEnablers,
  type TransitionType,
  type TransitionRule,
  
  // Combined
  validatePhysics,
} from './physics';

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════════

export {
  scoreSuggestion,
  rankSuggestions,
  filterSurvivors,
  type ScoringInput,
  type ScoringResult,
} from './scoring';

// ═══════════════════════════════════════════════════════════════════════════════
// DIVERSITY
// ═══════════════════════════════════════════════════════════════════════════════

export {
  calculateDistance,
  diversify,
  ensureTypeVariety,
  calculateDiversityScore,
  countDistinctTypes,
  analyzeHarmony,
} from './diversity';

// ═══════════════════════════════════════════════════════════════════════════════
// SUGGEST (F1)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  suggest,
  quickSuggest,
  generateBeatNext,
  generateTensionDelta,
  generateContrastKnife,
  generateReframeTruth,
  generateAgencyInjection,
  type SuggestParams,
  type SuggestResult,
} from './suggest';

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESS (F2)
// ═══════════════════════════════════════════════════════════════════════════════

export { assess } from './assess';

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT (F3)
// ═══════════════════════════════════════════════════════════════════════════════

export { project } from './project';

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  MuseEngine,
  createMuseEngine,
  museSuggest,
  museAssess,
  museProject,
} from './muse_engine';
