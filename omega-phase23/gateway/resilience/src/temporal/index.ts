/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Temporal Logic - Module Index
 * 
 * Phase 23 - Sprint 23.2
 */

// Types
export {
  // Branded types
  FormulaId,
  TraceTime,
  StateId,
  
  // Operators
  LTLOperator,
  
  // Formula types
  AtomicProposition,
  UnaryFormula,
  BinaryFormula,
  BooleanConstant,
  LTLFormula,
  
  // Trace types
  State,
  Trace,
  EvaluationResult,
  TracePosition,
  
  // Invariant types
  TemporalInvariant,
  InvariantSeverity,
  InvariantCategory,
  VerificationResult,
  VerificationSummary,
  
  // Factory functions
  formulaId,
  traceTime,
  stateId,
  
  // Type guards
  isAtomicProposition,
  isUnaryFormula,
  isBinaryFormula,
  isBooleanConstant,
  
  // Constants
  TRUE,
  FALSE,
  ALL_OPERATORS,
  ALL_SEVERITIES_TEMPORAL,
  ALL_CATEGORIES_TEMPORAL,
} from './types.js';

// LTL Formula Builders
export {
  // Atomic
  atom,
  constant,
  
  // Propositional
  not,
  and,
  andAll,
  or,
  orAll,
  implies,
  iff,
  
  // Temporal Future
  always,
  eventually,
  next,
  until,
  weakUntil,
  release,
  
  // Temporal Past
  historically,
  once,
  previous,
  since,
  
  // Common Patterns
  safety,
  liveness,
  fairness,
  stability,
  absence,
  existence,
  precedence,
  responseChain,
  boundedResponse,
  mutualExclusion,
  
  // Utilities
  toString,
  depth,
  getAtoms,
  countTemporalOperators,
  isSafetyProperty,
  simplify,
} from './ltl.js';

// Evaluator
export {
  LTLEvaluator,
  buildTrace,
  buildTraceFromEvents,
  createEvaluator,
  evaluateFormula,
  evaluateAll,
} from './evaluator.js';

// Invariants
export {
  PROPS,
  INV_TEMP_01,
  INV_TEMP_02,
  INV_TEMP_03,
  INV_TEMP_04,
  INV_TEMP_05,
  INV_TEMP_06,
  INV_TEMP_07,
  INV_TEMP_08,
  INV_TEMP_09,
  INV_TEMP_10,
  INV_TEMP_11,
  INV_TEMP_12,
  INV_TEMP_13,
  INV_TEMP_14,
  INV_TEMP_15,
  INV_TEMP_16,
  INV_TEMP_17,
  INV_TEMP_18,
  OMEGA_TEMPORAL_INVARIANTS,
  CRITICAL_INVARIANTS,
  SAFETY_INVARIANTS,
  getInvariantById,
  getInvariantsByCategory,
  getInvariantsBySeverity,
} from './invariants.js';

// Verifier
export {
  TemporalVerifier,
  createVerifier,
  verifyAgainstTrace,
  generateReport,
  generateJsonReport,
} from './verifier.js';
