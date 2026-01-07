/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — SELF-CERTIFICATION MODULE
 * Sprint 27.2 — Falsification Runner
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module self
 * @version 1.0.0
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// SURVIVAL PROOF
// ============================================================================

export {
  // Types
  type AttackOutcome,
  type AttackVector,
  type AttackAttempt,
  type SurvivalProof,
  type FalsificationReport,
  type FalsificationSummary,
  type ProofValidationResult,
  
  // Constants
  SURVIVAL_PROOF_VERSION,
  MIN_ATTACKS_PER_INVARIANT,
  DEFAULT_SEED,
  
  // Hash computation
  computeProofHash,
  computeReportHash,
  
  // Factories
  createAttackVector,
  createAttackAttempt,
  createSurvivalProof,
  createFalsificationReport,
  
  // Validation
  validateSurvivalProof,
  validateFalsificationReport,
  
  // Queries
  getSurvivedProofs,
  getBreachedProofs,
  getProofByInvariantId,
  allInvariantsSurvived,
  getInsufficientCoverage,
  
  // Formatting
  formatProofSummary,
  formatReportSummary,
  
  // Type guards
  isAttackOutcome,
  isValidProofHash,
} from './survival-proof.js';

// ============================================================================
// FALSIFICATION RUNNER
// ============================================================================

export {
  // Types
  type RunnerConfig,
  type InvariantTestFn,
  type InvariantTestRegistry,
  type RunnerState,
  
  // Constants
  DEFAULT_RUNNER_CONFIG,
  RUNNER_VERSION,
  
  // Seeded random
  createSeededRandom,
  shuffleWithSeed,
  selectWithSeed,
  
  // Attack generation
  generateAttackVectors,
  generateAttackInput,
  
  // Execution
  executeAttack,
  attackInvariant,
  
  // Runner
  createRunnerState,
  getPureInvariants,
  runFalsification,
  
  // Built-in tests
  createAlwaysSurvivesTest,
  createAlwaysFailsTest,
  createFailsOnSeedTest,
  createProbabilisticTest,
  
  // Validation
  validateTestCoverage,
  isValidConfig,
} from './falsify-runner.js';

// ============================================================================
// SELF SEAL
// ============================================================================

export {
  // Types
  type SelfSeal,
  type SelfSealCore,
  type SelfSealMeta,
  type SealReferences,
  type BoundaryLedgerReference,
  type InventoryReference,
  type SurvivalProofReference,
  type SealAttestation,
  type PureInvariantAttestation,
  type RunnerAttestation,
  type SealVerdict,
  type SealLimitation,
  type InventoryData,
  type SealValidationResult,
  type AttestationInput,
  type SealCoreInput,
  type SealMetaInput,
  type CreateSealInput,
  
  // Constants
  SEAL_VERSION,
  MANDATORY_BOUNDARY_IDS,
  BOUNDARY_SUMMARIES,
  
  // Serialization & Hash
  canonicalSerialize,
  computeSealHash,
  computeInventoryHash,
  
  // Reference factories
  createBoundaryLedgerReference,
  createInventoryReference,
  createSurvivalProofReference,
  
  // Limitations
  createMandatoryLimitations,
  
  // Verdict
  computeVerdict,
  
  // Factories
  createAttestation,
  createSealCore,
  createSealMeta,
  createSelfSeal,
  
  // Utilities
  generateRunId,
  detectEnvironment,
  
  // Validation
  validateSeal,
  
  // Queries
  isSealed,
  isBreached,
  getLimitationIds,
  getSurvivalRate,
  
  // Formatting
  formatSealSummary,
  formatSealReference,
} from './seal.js';
