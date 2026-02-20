/**
 * OMEGA Orchestrator Module v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Main entry point for the Orchestrator / Intent Engine.
 *
 * Pipeline: validate → normalize → policy → contract → forge-adapter → (truth-gate)
 *
 * INVARIANTS:
 * - G-INV-01: No fact injection via Intent
 * - G-INV-02: All generation routed through Truth Gate
 * - G-INV-03: Intent ≠ Truth (segregation)
 * - G-INV-04: Deterministic seed
 * - G-INV-05: Deterministic pipeline order
 * - G-INV-06: Append-only ledger, chain hash (timestamp excluded)
 * - G-INV-07: IntentId = SHA256(normalized_intent_content)
 * - G-INV-08: Policies from versioned config + lock hash
 * - G-INV-09: Forbidden patterns rejection
 * - G-INV-10: Generation mode MOCK_ONLY
 * - G-INV-11: No network calls
 * - G-INV-12: No dynamic imports
 * - G-INV-13: Fixed policies path
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Branded types
  IntentId,
  ActorId,
  PolicyId,
  PatternId,
  VocabularyId,
  StructureId,
  ChainHash,
  Sha256,
  ISO8601,

  // Intent types
  IntentGoal,
  IntentConstraints,
  ToneProfile,
  ForbiddenSet,
  Intent,

  // Validation types
  ValidationError,
  ValidationErrorCode,

  // Result types
  OrchestratorResult,
  RejectionReason,
  ProcessedContent,
} from './types';

// Type guards
export {
  isIntentId,
  isActorId,
  isPolicyId,
  isPatternId,
  isVocabularyId,
  isStructureId,
  isChainHash,
  isSha256,
  isISO8601,
  isIntentGoal,
  isIntentConstraints,
  isToneProfile,
  isForbiddenSet,
  isIntent,
  createEmptyForbiddenSet,
  createValidationError,
  INTENT_GOALS,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export type { RawIntentInput } from './intent-schema';

export {
  INTENT_SCHEMA,
  validateAgainstSchema,
  normalizeIntentForHash,
  computeIntentHash,
  generateIntentId,
  createIntent,
} from './intent-schema';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

export type { IntentValidationResult } from './intent-validator';

export {
  detectFactInjection,
  detectForbiddenStructures,
  validateIntentId,
  validateActorId,
  validateGoal,
  validateConstraints,
  validateTone,
  validateForbidden,
  validatePayload,
  validateIntentIdMatch,
  validateIntent,
  validateRawIntentInput,
} from './intent-validator';

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZER
// ═══════════════════════════════════════════════════════════════════════════════

export type { NormalizationResult } from './intent-normalizer';

export {
  DEFAULT_MAX_LENGTH,
  MIN_MAX_LENGTH,
  MAX_MAX_LENGTH,
  DEFAULT_TONE_PROFILE,
  normalizeText,
  normalizePayload,
  normalizeConstraints,
  normalizeForbiddenSet,
  normalizeToneProfile,
  normalizeRawIntent,
  normalizeIntent,
  isNormalized,
} from './intent-normalizer';

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY LOADER
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  PatternDefinition,
  VocabularyDefinition,
  StructureDefinition,
  PolicyRules,
  PolicyForbidden,
  PolicyLimits,
  PolicyConfig,
  LoadedPolicy,
} from './policy-loader';

export {
  POLICIES_PATH,
  POLICIES_LOCK_PATH,
  loadPolicyFile,
  loadLockFile,
  parsePolicy,
  verifyPolicyHash,
  loadPolicy,
  loadPolicyUnsafe,
  getExpectedPolicyHash,
  computePolicyHash,
} from './policy-loader';

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ViolationType,
  PolicyViolation,
  PolicyCheckResult,
  PolicyEngine,
} from './policy-engine';

export {
  createPolicyEngine,
  createPolicyEngineWith,
  checkIntentAgainstPolicy,
} from './policy-engine';

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATION CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  GenerationMode,
  ContractStatus,
  ContractId,
  GenerationParams,
  GenerationContract,
  SealedContract,
  ContractCreationOptions,
} from './generation-contract';

export {
  isContractId,
  computeDeterministicSeed,
  DEFAULT_CONTRACT_TTL_MS,
  createGenerationContract,
  validateContract,
  isContractExpired,
  canExecuteContract,
  updateContractStatus,
  markContractExecuting,
  markContractCompleted,
  markContractFailed,
  markContractRejected,
} from './generation-contract';

// ═══════════════════════════════════════════════════════════════════════════════
// FORGE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ForgeResult,
  ForgeError,
  ForgeResponse,
  ForgeAdapter,
} from './forge-adapter';

export {
  createForgeAdapter,
  verifyDeterministicResult,
  isMockGenerated,
} from './forge-adapter';

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  LedgerEntryStatus,
  LedgerEntry,
  IntentLedger,
} from './intent-ledger';

export {
  createIntentLedger,
  exportLedger,
  verifyImportedLedger,
  findTamperedEntries,
  getIntentHistory,
  getLatestIntentStatus,
  countByStatus,
} from './intent-ledger';

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  PipelineStage,
  ProcessingResult,
  OrchestratorConfig,
  Orchestrator,
} from './orchestrator';

export {
  createOrchestrator,
  processIntent,
  preflightIntent,
} from './orchestrator';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const ORCHESTRATOR_VERSION = '1.0.0';
export const ORCHESTRATOR_PHASE = 'G';
