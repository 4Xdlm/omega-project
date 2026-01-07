/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — CRYSTAL MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module crystal
 * @version 2.0.0
 * 
 * IDL CRYSTALLINE — Invariant Descriptor Language
 * 
 * The crystal module provides:
 * - Grammar: IDL schema and type definitions
 * - Validator: Schema validation and error reporting
 * - Crystallizer: Invariant creation and management
 * - Lineage: Genetic traceability and DAG operations
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Version
  GRAMMAR_VERSION,
  MIN_SUPPORTED_VERSION,
  
  // Core types
  type CrystallineInvariant,
  type InvariantProof,
  type InvariantProperty,
  type InvariantLineage,
  type InvariantComputed,
  type ProofEvidence,
  type ProofType,
  type IDLDocument,
  
  // Schema
  type FieldMutability,
  type FieldSchema,
  GRAMMAR_SCHEMA,
  PROOF_TYPE_STRENGTHS,
  PROOF_TYPES,
  
  // Type guards
  isProofType,
  isValidInvariantId,
  isValidTimestamp,
  isValidHash,
  
  // Documentation
  generateGrammarDoc,
  generateInvariantTemplate
} from './grammar.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type ValidationSeverity,
  type ValidationIssue,
  type ValidationResult,
  
  // Error codes
  ValidationCodes,
  
  // Validation functions
  validateInvariant,
  validateDocument,
  isValidInvariant,
  
  // Helpers
  getErrors,
  getWarnings,
  formatValidationResult
} from './validator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CRYSTALLIZER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type CreateInvariantInput,
  type CreateProofInput,
  type CrystallizationResult,
  
  // Hash operations
  computeInvariantHash,
  verifyInvariantHash,
  
  // Computed fields
  computeDerivedFields,
  
  // Crystallization
  crystallize,
  
  // Append operations
  addProof,
  addImpossibility,
  addProofs,
  addImpossibilities,
  
  // Queries
  hasProofs,
  hasImpossibilities,
  getStrongestProof,
  getProofsByType,
  getProofsByMinStrength,
  meetsMinStrength,
  
  // Serialization
  toYAMLObject,
  toJSON,
  
  // Factory helpers
  createTestProof,
  createAdversarialProof,
  createFormalProof,
  createArchitecturalProof
} from './crystallizer.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type LineageNode,
  type LineageGraph,
  type LineageValidationResult,
  
  // Graph construction
  buildLineageGraph,
  
  // Validation
  validateLineage,
  
  // Ancestor/descendant queries
  getAncestors,
  getDescendants,
  isAncestor,
  isDescendant,
  getCommonAncestors,
  
  // Generation queries
  getByGeneration,
  calculateGeneration,
  
  // Topological operations
  topologicalSort,
  getDepth,
  
  // Lineage builder
  createLineage,
  createRootLineage,
  
  // Statistics
  getGraphStats
} from './lineage.js';
