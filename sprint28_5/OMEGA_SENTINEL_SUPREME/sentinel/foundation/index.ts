/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — FOUNDATION MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module foundation
 * @version 3.26.0
 * 
 * The foundational layer of SENTINEL SUPREME:
 * - Axioms: The 5 foundational declarations (bootstrap transparent)
 * - Proof Strengths: The Ω→Ε hierarchy
 * - Constants: Version, thresholds, configuration
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// AXIOMS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type Axiom,
  type AxiomRegistry,
  type AxiomValidationResult,
  type RejectionImpact,
  
  // Registry
  AXIOM_REGISTRY,
  
  // Individual axioms
  AXIOM_OMEGA,
  AXIOM_LAMBDA,
  AXIOM_SIGMA,
  AXIOM_DELTA,
  AXIOM_EPSILON,
  
  // Accessors
  getAxiom,
  getAllAxioms,
  getCriticalAxioms,
  getNonCriticalAxioms,
  getAssumedAxiomIds,
  
  // Validation
  validateAxiomRegistry,
  
  // Consequence analysis
  computeRejectionConsequences,
  isSystemInvalidated,
  
  // Documentation
  generateAxiomSummary,
  generateRejectionTable
} from './axioms.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF STRENGTH
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type ProofStrength,
  type ProofStrengthDefinition,
  type StrengthComparison,
  type CompositeProofStrength,
  
  // Registry
  STRENGTH_ORDER,
  ALL_STRENGTHS,
  
  // Individual definitions
  STRENGTH_OMEGA,
  STRENGTH_LAMBDA,
  STRENGTH_SIGMA,
  STRENGTH_DELTA,
  STRENGTH_EPSILON,
  
  // Accessors
  getStrengthDefinition,
  getStrengthWeight,
  getStrengthName,
  
  // Comparison
  compareStrengths,
  isAtLeast,
  isStrongerThan,
  maxStrength,
  minStrength,
  
  // Composite
  computeCompositeStrength,
  meetsMinimumStrength,
  getDominantStrength,
  
  // Validation
  isProofStrength,
  parseProofStrength,
  
  // Documentation
  generateStrengthHierarchy,
  generateStrengthTable
} from './proof_strength.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Version
  SENTINEL_VERSION,
  IDL_VERSION,
  CORPUS_VERSION,
  
  // Cryptographic
  HASH_ALGORITHM,
  SIGNATURE_ALGORITHM,
  HASH_LENGTH_BYTES,
  HASH_LENGTH_HEX,
  
  // Proof weights
  PROOF_STRENGTH_WEIGHTS,
  
  // Falsification
  FALSIFICATION_WEIGHTS,
  
  // Negative space
  IMPOSSIBILITY_IMPACT_WEIGHTS,
  MAX_NEGATIVE_SCORE,
  
  // Temporal
  DEFAULT_DECAY_LAMBDA,
  CONFIDENCE_THRESHOLDS,
  THREAT_FACTORS,
  
  // Scrutiny
  SCRUTINY_BASE,
  SCRUTINY_MULTIPLIERS,
  
  // Certification
  CERTIFICATION_LEVELS,
  type CertificationLevel,
  
  // Axioms
  AXIOM_IDS,
  type AxiomId,
  
  // Impossibilities
  IMPOSSIBILITY_CLASSES,
  type ImpossibilityClass,
  
  // Validation patterns
  VALIDATION_PATTERNS,
  
  // Banner
  SENTINEL_BANNER,
  
  // Type guards
  isCertificationLevel,
  isAxiomId,
  isImpossibilityClass,
  isValidSHA256,
  isValidInvariantId,
  isValidSemVer,
  isValidISO8601,
  isValidUUIDv4
} from './constants.js';
