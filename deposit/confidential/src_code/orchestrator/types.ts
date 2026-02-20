/**
 * OMEGA Orchestrator Types v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Core type definitions for Intent Engine
 *
 * INVARIANTS:
 * - G-INV-01: No fact injected via Intent
 * - G-INV-04: Intent ≠ Truth (total isolation)
 * - G-INV-07: IntentId = SHA256(normalized_intent_content)
 *
 * SPEC: ORCHESTRATOR_SPEC v1.0 §G0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Brand<K, T> = K & { readonly __brand: T };

/** Unique identifier for an Intent (SHA256-based) */
export type IntentId = Brand<string, 'IntentId'>;

/** Unique identifier for an Actor */
export type ActorId = Brand<string, 'ActorId'>;

/** Unique identifier for a Policy */
export type PolicyId = Brand<string, 'PolicyId'>;

/** SHA256 chain hash */
export type ChainHash = Brand<string, 'ChainHash'>;

/** SHA256 hash */
export type Sha256 = Brand<string, 'Sha256'>;

/** ISO8601 timestamp string */
export type ISO8601 = Brand<string, 'ISO8601'>;

/** Pattern identifier for forbidden patterns */
export type PatternId = Brand<string, 'PatternId'>;

/** Vocabulary identifier for forbidden vocabulary */
export type VocabularyId = Brand<string, 'VocabularyId'>;

/** Structure identifier for forbidden structures */
export type StructureId = Brand<string, 'StructureId'>;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS FOR BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates IntentId format: INT-<32 hex chars>
 */
export function isIntentId(value: unknown): value is IntentId {
  if (typeof value !== 'string') return false;
  return /^INT-[a-f0-9]{32}$/.test(value);
}

/**
 * Validates ActorId format: ACT-<alphanumeric>
 */
export function isActorId(value: unknown): value is ActorId {
  if (typeof value !== 'string') return false;
  return /^ACT-[a-zA-Z0-9_-]+$/.test(value);
}

/**
 * Validates PolicyId format: POL-<version>-<hash>
 */
export function isPolicyId(value: unknown): value is PolicyId {
  if (typeof value !== 'string') return false;
  return /^POL-v\d+(\.\d+)*-[a-f0-9]{8}$/.test(value);
}

/**
 * Validates ChainHash format: 64 hex characters
 */
export function isChainHash(value: unknown): value is ChainHash {
  if (typeof value !== 'string') return false;
  return /^[a-f0-9]{64}$/.test(value);
}

/**
 * Validates Sha256 format: 64 hex characters
 */
export function isSha256(value: unknown): value is Sha256 {
  if (typeof value !== 'string') return false;
  return /^[a-f0-9]{64}$/.test(value);
}

/**
 * Validates ISO8601 timestamp format
 */
export function isISO8601(value: unknown): value is ISO8601 {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('T');
}

/**
 * Validates PatternId format: PAT-<id>
 */
export function isPatternId(value: unknown): value is PatternId {
  if (typeof value !== 'string') return false;
  return /^PAT-[a-zA-Z0-9_-]+$/.test(value);
}

/**
 * Validates VocabularyId format: VOC-<id>
 */
export function isVocabularyId(value: unknown): value is VocabularyId {
  if (typeof value !== 'string') return false;
  return /^VOC-[a-zA-Z0-9_-]+$/.test(value);
}

/**
 * Validates StructureId format: STR-<id>
 */
export function isStructureId(value: unknown): value is StructureId {
  if (typeof value !== 'string') return false;
  return /^STR-[a-zA-Z0-9_-]+$/.test(value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TONE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Available tone identifiers */
export type ToneId = 'NEUTRAL' | 'TECHNICAL' | 'NARRATIVE' | 'POETIC' | 'FORMAL' | 'INSTRUCTIONAL';

/** Tone intensity levels */
export type ToneIntensity = 'LOW' | 'MEDIUM' | 'HIGH';

/** Tone profile for generation */
export interface ToneProfile {
  readonly tone: ToneId;
  readonly intensity: ToneIntensity;
}

/** All valid tone IDs */
export const TONE_IDS: readonly ToneId[] = [
  'NEUTRAL',
  'TECHNICAL',
  'NARRATIVE',
  'POETIC',
  'FORMAL',
  'INSTRUCTIONAL',
];

/** All valid intensity levels */
export const TONE_INTENSITIES: readonly ToneIntensity[] = ['LOW', 'MEDIUM', 'HIGH'];

/**
 * Validates ToneId
 */
export function isToneId(value: unknown): value is ToneId {
  return typeof value === 'string' && TONE_IDS.includes(value as ToneId);
}

/**
 * Validates ToneIntensity
 */
export function isToneIntensity(value: unknown): value is ToneIntensity {
  return typeof value === 'string' && TONE_INTENSITIES.includes(value as ToneIntensity);
}

/**
 * Validates ToneProfile
 */
export function isToneProfile(value: unknown): value is ToneProfile {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return isToneId(obj.tone) && isToneIntensity(obj.intensity);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN SET
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Set of forbidden elements for generation.
 * G-INV-01: Used to prevent fact injection
 */
export interface ForbiddenSet {
  readonly patterns: readonly PatternId[];
  readonly vocabularies: readonly VocabularyId[];
  readonly structures: readonly StructureId[];
}

/**
 * Creates an empty forbidden set
 */
export function createEmptyForbiddenSet(): ForbiddenSet {
  return Object.freeze({
    patterns: Object.freeze([]),
    vocabularies: Object.freeze([]),
    structures: Object.freeze([]),
  });
}

/**
 * Validates ForbiddenSet
 */
export function isForbiddenSet(value: unknown): value is ForbiddenSet {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.patterns)) return false;
  if (!Array.isArray(obj.vocabularies)) return false;
  if (!Array.isArray(obj.structures)) return false;

  return (
    obj.patterns.every(isPatternId) &&
    obj.vocabularies.every(isVocabularyId) &&
    obj.structures.every(isStructureId)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Available intent goals */
export type IntentGoal = 'DRAFT' | 'REWRITE' | 'SUMMARIZE' | 'STYLE_TRANSFER' | 'OUTLINE' | 'DIALOGUE' | 'SCENE';

/** All valid intent goals */
export const INTENT_GOALS: readonly IntentGoal[] = [
  'DRAFT',
  'REWRITE',
  'SUMMARIZE',
  'STYLE_TRANSFER',
  'OUTLINE',
  'DIALOGUE',
  'SCENE',
];

/**
 * Validates IntentGoal
 */
export function isIntentGoal(value: unknown): value is IntentGoal {
  return typeof value === 'string' && INTENT_GOALS.includes(value as IntentGoal);
}

/**
 * Intent constraints.
 * G-INV-01: allowFacts is ALWAYS false (no facts via Intent)
 */
export interface IntentConstraints {
  readonly maxLength: number;
  readonly format: 'TEXT_ONLY';
  readonly allowFacts: false;
}

/**
 * Validates IntentConstraints
 */
export function isIntentConstraints(value: unknown): value is IntentConstraints {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.maxLength === 'number' &&
    obj.maxLength > 0 &&
    obj.format === 'TEXT_ONLY' &&
    obj.allowFacts === false // G-INV-01: Must always be false
  );
}

/**
 * Intent definition.
 * G-INV-04: Intent is completely isolated from Truth/CANON
 */
export interface Intent {
  readonly intentId: IntentId;
  readonly actorId: ActorId;
  readonly goal: IntentGoal;
  readonly constraints: IntentConstraints;
  readonly tone?: ToneProfile;
  readonly forbidden?: ForbiddenSet;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Validates Intent structure
 */
export function isIntent(value: unknown): value is Intent {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isIntentId(obj.intentId)) return false;
  if (!isActorId(obj.actorId)) return false;
  if (!isIntentGoal(obj.goal)) return false;
  if (!isIntentConstraints(obj.constraints)) return false;
  if (obj.tone !== undefined && !isToneProfile(obj.tone)) return false;
  if (obj.forbidden !== undefined && !isForbiddenSet(obj.forbidden)) return false;
  if (typeof obj.payload !== 'object' || obj.payload === null) return false;

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Generation mode - MUST be MOCK_ONLY */
export type GenerationMode = 'MOCK_ONLY';

/**
 * Validates GenerationMode
 */
export function isGenerationMode(value: unknown): value is GenerationMode {
  return value === 'MOCK_ONLY';
}

/** Forge adapter configuration */
export interface ForgeAdapterConfig {
  readonly mode: GenerationMode;
  readonly seed: number;
  readonly domain: 'fiction' | 'essay';
}

/**
 * Validates ForgeAdapterConfig
 */
export function isForgeAdapterConfig(value: unknown): value is ForgeAdapterConfig {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    isGenerationMode(obj.mode) &&
    typeof obj.seed === 'number' &&
    Number.isInteger(obj.seed) &&
    (obj.domain === 'fiction' || obj.domain === 'essay')
  );
}

/** Generation contract - immutable agreement for generation */
export interface GenerationContract {
  readonly intentId: IntentId;
  readonly intentHash: Sha256;
  readonly policyId: PolicyId;
  readonly policyHash: Sha256;
  readonly maxLength: number;
  readonly format: 'TEXT_ONLY';
  readonly forbidden: ForbiddenSet;
}

/**
 * Validates GenerationContract
 */
export function isGenerationContract(value: unknown): value is GenerationContract {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    isIntentId(obj.intentId) &&
    isSha256(obj.intentHash) &&
    isPolicyId(obj.policyId) &&
    isSha256(obj.policyHash) &&
    typeof obj.maxLength === 'number' &&
    obj.maxLength > 0 &&
    obj.format === 'TEXT_ONLY' &&
    isForbiddenSet(obj.forbidden)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Ledger verdict - allowed or rejected */
export type LedgerVerdict = 'ALLOWED' | 'REJECTED';

/**
 * Validates LedgerVerdict
 */
export function isLedgerVerdict(value: unknown): value is LedgerVerdict {
  return value === 'ALLOWED' || value === 'REJECTED';
}

/**
 * Intent ledger entry.
 * G-INV-06: Append-only ledger
 * G-INV-09: Timestamp excluded from chain hash
 */
export interface IntentLedgerEntry {
  readonly intentHash: Sha256;
  readonly actorId: ActorId;
  readonly timestamp: ISO8601;
  readonly verdict: LedgerVerdict;
  readonly reason?: string;
  readonly chainHash?: ChainHash;
}

/**
 * Validates IntentLedgerEntry
 */
export function isIntentLedgerEntry(value: unknown): value is IntentLedgerEntry {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!isSha256(obj.intentHash)) return false;
  if (!isActorId(obj.actorId)) return false;
  if (!isISO8601(obj.timestamp)) return false;
  if (!isLedgerVerdict(obj.verdict)) return false;
  if (obj.reason !== undefined && typeof obj.reason !== 'string') return false;
  if (obj.chainHash !== undefined && !isChainHash(obj.chainHash)) return false;

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Orchestrator success result */
export interface OrchestratorSuccess {
  readonly success: true;
  readonly output: string;
  readonly intentId: IntentId;
  readonly proofHash: Sha256;
  readonly ledgerEntry: IntentLedgerEntry;
}

/** Orchestrator failure result */
export interface OrchestratorFailure {
  readonly success: false;
  readonly intentId: IntentId;
  readonly reason: string;
  readonly ledgerEntry: IntentLedgerEntry;
}

/** Orchestrator result union */
export type OrchestratorResult = OrchestratorSuccess | OrchestratorFailure;

/**
 * Type guard for success result
 */
export function isOrchestratorSuccess(result: OrchestratorResult): result is OrchestratorSuccess {
  return result.success === true;
}

/**
 * Type guard for failure result
 */
export function isOrchestratorFailure(result: OrchestratorResult): result is OrchestratorFailure {
  return result.success === false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Validation error codes */
export type ValidationErrorCode =
  | 'INVALID_INTENT_ID'
  | 'INVALID_ACTOR_ID'
  | 'INVALID_GOAL'
  | 'INVALID_CONSTRAINTS'
  | 'INVALID_PAYLOAD'
  | 'FACT_INJECTION_DETECTED'
  | 'POLICY_VIOLATION'
  | 'LOCK_MISMATCH';

/** Validation error */
export interface ValidationError {
  readonly code: ValidationErrorCode;
  readonly field?: string;
  readonly message: string;
}

/**
 * Creates a validation error
 */
export function createValidationError(
  code: ValidationErrorCode,
  message: string,
  field?: string
): ValidationError {
  return Object.freeze({ code, message, field });
}
