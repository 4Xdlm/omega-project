/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — GRAVITY MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module gravity
 * @version 2.0.0
 * 
 * GRAVITY — Epistemic Weight of Evidence
 * 
 * The gravity module computes the accumulated weight of evidence
 * supporting an invariant, with temporal decay and confidence levels.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type ConfidenceLevel,
  type EvidenceWeight,
  type GravityState,
  type AddEvidenceInput,
  
  // Constants
  MAX_RAW_GRAVITY,
  CONFIDENCE_LEVEL_THRESHOLDS,
  CONFIDENCE_ORDER,
  EVIDENCE_TYPE_MULTIPLIERS,
  TEMPORAL_DECAY_LAMBDA,
  
  // Temporal decay
  daysBetween,
  calculateDecayFactor,
  applyDecay,
  calculateHalfLife,
  
  // Weight computation
  getProofWeight,
  createEvidenceWeight,
  recomputeWeight,
  
  // Gravity computation
  createGravityState,
  addEvidence,
  refreshGravity,
  computeRawGravity,
  normalizeGravity,
  determineConfidence,
  
  // Queries
  countEvidence,
  getEvidenceByType,
  getStrongestEvidence,
  getOldestEvidence,
  getNewestEvidence,
  getAverageAge,
  getDecayStats,
  
  // Analysis
  meetsConfidence,
  getNextConfidenceLevel,
  gravityToNextLevel,
  calculateFreshness,
  isFresh,
  isStale,
  
  // Comparison
  compareConfidence,
  maxConfidence,
  minConfidence,
  
  // Type guards
  isConfidenceLevel,
  isEvidenceType,
  
  // Documentation
  formatGravitySummary,
  getConfidenceDescription
} from './engine.js';
