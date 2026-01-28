/**
 * OMEGA Truth Gate v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Barrel file for Truth Gate module
 *
 * SPEC: TRUTH_GATE_SPEC v1.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Branded types
  type FactId,
  type ProofHash,
  type QuarantineId,

  // Enums
  FactClass,
  ViolationCode,
  Verdict,

  // Type guards
  isFactClass,
  isViolationCode,
  isVerdict,
  isGatePass,
  isGateFail,

  // Interfaces
  type SourceSpan,
  type CanonicalFact,
  type ClassifiedFact,
  type CanonViolation,
  type VerdictResult,
  type ProofManifest,
  type QuarantineResult,
  type GateInput,
  type GateOutput,
  type GatePassOutput,
  type GateFailOutput,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// FACT EXTRACTION (F2)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  extractFacts,
  extractMarkedFacts,
  createFact,
  isValidFact,
  sortFacts,
  computeFactId,
  EXTRACTION_PATTERNS,
} from './fact-extractor';

// ═══════════════════════════════════════════════════════════════════════════════
// FACT CLASSIFICATION (F3)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  classifyFacts,
  classifyFact,
  getStrictFacts,
  getDerivedFacts,
  getNonFactualFacts,
  isStrictFact,
  isDerivedFact,
  isNonFactual,
  STRICT_PREDICATES,
  DERIVED_PREDICATES,
  NON_FACTUAL_INDICATORS,
} from './fact-classifier';

// ═══════════════════════════════════════════════════════════════════════════════
// CANON MATCHING (F4)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  matchAgainstCanon,
  matchSingleFact,
  matchFactComprehensive,
  checkEntityExists,
  checkPredicateValid,
  checkValueContradiction,
  checkAmbiguity,
  createViolation,
  isViolation,
  type CanonReader,
} from './canon-matcher';

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT ENGINE (F5)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  computeVerdict,
  createVerdictResult,
  validateVerdictResult,
  isPassed,
  isFailed,
  summarizeVerdict,
} from './verdict-engine';

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF MANIFEST (F6)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  createProofManifest,
  computeProofHash,
  computeInputHash,
  verifyProofManifest,
  manifestsMatch,
  serializeManifest,
  deserializeManifest,
  summarizeManifest,
  hasViolations,
  getViolationCount,
  GATE_VERSION,
} from './proof-manifest';

// ═══════════════════════════════════════════════════════════════════════════════
// QUARANTINE (F7)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  createQuarantineResult,
  generateQuarantineId,
  validateQuarantineResult,
  isQuarantined,
  getQuarantineViolationCodes,
  getQuarantineViolationCount,
  summarizeQuarantine,
  canResolveQuarantine,
  buildQuarantineReason,
} from './quarantine';

// ═══════════════════════════════════════════════════════════════════════════════
// TRUTH GATE (MAIN)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  executeTruthGate,
  executePipelineWithSteps,
  quickValidate,
  getViolations,
  hasStrictFacts,
  computeCanonStateHash,
  type TruthGateConfig,
  type PipelineSteps,
} from './truth-gate';
