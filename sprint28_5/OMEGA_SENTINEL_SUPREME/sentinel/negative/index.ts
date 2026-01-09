/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — NEGATIVE MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module negative
 * @version 2.0.0
 * 
 * NEGATIVE — Explicit Forbidden Space
 * 
 * The negative module defines what CANNOT happen, what is FORBIDDEN,
 * and what behaviors are IMPOSSIBLE for an invariant.
 * 
 * This complements positive proofs by explicitly bounding behavior.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SPACE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type NegativeSeverity,
  type NegativeBound,
  type NegativeViolation,
  type NegativeSpace,
  type CreateBoundInput,
  
  // Constants
  SEVERITY_WEIGHTS,
  SEVERITY_ORDER,
  
  // Bound creation
  generateBoundId,
  resetBoundCounter,
  createNegativeBound,
  
  // Space management
  createNegativeSpace,
  addBound,
  recordViolation,
  
  // Score computation
  computeNegativeScore,
  computeMaxPotentialScore,
  getViolationRatio,
  
  // Queries
  getBoundsByClass,
  getBoundsBySeverity,
  getBoundsByTag,
  getViolatedBounds,
  getUnviolatedBounds,
  getViolationsForBound,
  countBounds,
  countViolations,
  countViolatedBounds,
  
  // Analysis
  hasCatastrophicViolation,
  hasCriticalOrWorse,
  getHighestViolationSeverity,
  getBoundsDistribution,
  isClean,
  isComprehensive,
  
  // Type guards
  isNegativeSeverity,
  isValidBoundId,
  
  // Documentation
  formatBound,
  formatViolation,
  generateNegativeSpaceSummary
} from './space.js';
