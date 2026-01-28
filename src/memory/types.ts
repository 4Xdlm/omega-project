/**
 * OMEGA Memory System - Core Types
 * Phase D2 - NASA-Grade L4
 * 
 * Branded types + discriminated unions for type-safe memory operations.
 * Zero `any` types. Zero type assertions except where provably safe.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES - Nominal typing for type safety
// ═══════════════════════════════════════════════════════════════════════════════

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Entry ID: pattern [A-Z]{3}-[0-9]{8}-[0-9]{4}-[A-Z0-9]{6} */
export type EntryId = Brand<string, 'EntryId'>;

/** ISO 8601 UTC timestamp */
export type Timestamp = Brand<string, 'Timestamp'>;

/** SHA-256 hex string (64 chars) */
export type HashValue = Brand<string, 'HashValue'>;

/** Line offset in ledger file (bytes) */
export type ByteOffset = Brand<number, 'ByteOffset'>;

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY CLASSIFICATION - Closed set, exhaustive matching required
// ═══════════════════════════════════════════════════════════════════════════════

/** Entry class - closed set from schema */
export const ENTRY_CLASSES = ['FACT', 'DECISION', 'EVIDENCE', 'METRIC', 'NOTE'] as const;
export type EntryClass = typeof ENTRY_CLASSES[number];

/** Evidence type - closed set */
export const EVIDENCE_TYPES = ['tag', 'commit', 'hash', 'path', 'url'] as const;
export type EvidenceType = typeof EVIDENCE_TYPES[number];

// ═══════════════════════════════════════════════════════════════════════════════
// CORE STRUCTURES - Immutable entry format
// ═══════════════════════════════════════════════════════════════════════════════

/** Evidence reference in payload */
export interface EvidenceRef {
  readonly type: EvidenceType;
  readonly ref: string;
}

/** Payload structure */
export interface EntryPayload {
  readonly title: string;
  readonly body: string;
  readonly evidence?: readonly EvidenceRef[];
}

/** Entry metadata */
export interface EntryMeta {
  readonly schema_version: string;
  readonly sealed: boolean;
  readonly tags?: readonly string[];
  readonly supersedes?: string;
}

/** Complete memory entry - immutable */
export interface MemoryEntry {
  readonly id: EntryId;
  readonly ts_utc: Timestamp;
  readonly author: string;
  readonly class: EntryClass;
  readonly scope: string;
  readonly payload: EntryPayload;
  readonly meta: EntryMeta;
}

/** Entry with computed hash for chain validation */
export interface HashedEntry extends MemoryEntry {
  readonly _hash: HashValue;
  readonly _prevHash: HashValue | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPE - Discriminated union for error handling
// ═══════════════════════════════════════════════════════════════════════════════

export type Result<T, E> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CODES - Exhaustive, typed error handling
// ═══════════════════════════════════════════════════════════════════════════════

export const MEMORY_ERROR_CODES = {
  // Schema/Validation errors
  INVALID_JSON: 'INVALID_JSON',
  SCHEMA_VIOLATION: 'SCHEMA_VIOLATION',
  INVALID_ID_FORMAT: 'INVALID_ID_FORMAT',
  INVALID_TIMESTAMP: 'INVALID_TIMESTAMP',
  INVALID_CLASS: 'INVALID_CLASS',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // Integrity errors
  DUPLICATE_ID: 'DUPLICATE_ID',
  HASH_MISMATCH: 'HASH_MISMATCH',
  CHAIN_BROKEN: 'CHAIN_BROKEN',
  GENESIS_INVALID: 'GENESIS_INVALID',
  
  // I/O errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  READ_ERROR: 'READ_ERROR',
  WRITE_ERROR: 'WRITE_ERROR',
  OFFSET_OUT_OF_BOUNDS: 'OFFSET_OUT_OF_BOUNDS',
  LINE_TOO_LARGE: 'LINE_TOO_LARGE',
  
  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  AUTHORITY_DENIED: 'AUTHORITY_DENIED',
  
  // Index errors
  INDEX_CORRUPTED: 'INDEX_CORRUPTED',
  INDEX_STALE: 'INDEX_STALE',
  ENTRY_NOT_FOUND: 'ENTRY_NOT_FOUND',
} as const;

export type MemoryErrorCode = typeof MEMORY_ERROR_CODES[keyof typeof MEMORY_ERROR_CODES];

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY OPTIONS - Type-safe filtering
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueryOptions {
  readonly class?: EntryClass;
  readonly author?: string;
  readonly scope?: string;
  readonly tags?: readonly string[];
  readonly fromTs?: Timestamp;
  readonly toTs?: Timestamp;
  readonly limit?: number;
  readonly offset?: number;
}

export interface QueryResult {
  readonly entries: readonly MemoryEntry[];
  readonly total: number;
  readonly hasMore: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRITY REPORT - Chain validation results
// ═══════════════════════════════════════════════════════════════════════════════

export interface IntegrityViolation {
  readonly lineNumber: number;
  readonly entryId: EntryId | null;
  readonly code: MemoryErrorCode;
  readonly message: string;
}

export interface IntegrityReport {
  readonly valid: boolean;
  readonly entriesChecked: number;
  readonly ledgerHash: HashValue;
  readonly violations: readonly IntegrityViolation[];
  readonly checkedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX STRUCTURES - Derived, rebuildable
// ═══════════════════════════════════════════════════════════════════════════════

/** Offset index: id -> byte offset in ledger */
export type OffsetIndex = ReadonlyMap<EntryId, ByteOffset>;

/** Class index: class -> entry ids */
export type ClassIndex = ReadonlyMap<EntryClass, readonly EntryId[]>;

/** Tag index: tag -> entry ids */
export type TagIndex = ReadonlyMap<string, readonly EntryId[]>;

/** Complete built index */
export interface BuiltIndex {
  readonly byId: OffsetIndex;
  readonly byClass: ClassIndex;
  readonly byTag: TagIndex;
  readonly ledgerSha256: HashValue;
  readonly entryCount: number;
  readonly builtAt: Timestamp;
}

/** Index metadata for staleness check */
export interface IndexMeta {
  readonly ledgerSha256: HashValue;
  readonly entryCount: number;
  readonly builtAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIERING - Memory classification (D4)
// ═══════════════════════════════════════════════════════════════════════════════

export const TIERS = ['HOT', 'WARM', 'COLD', 'FROZEN'] as const;
export type Tier = typeof TIERS[number];

export interface TieringConfig {
  readonly ttlHotMs: number;
  readonly ttlWarmMs: number;
  readonly ttlColdMs: number;
  // FROZEN = infinite, no TTL
}

export interface TierClassification {
  readonly entryId: EntryId;
  readonly tier: Tier;
  readonly ageMs: number;
  readonly classifiedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE - Authority & Audit (D5)
// ═══════════════════════════════════════════════════════════════════════════════

export const AUTHORITY_VERDICTS = ['ALLOW', 'DENY', 'DEFER'] as const;
export type AuthorityVerdict = typeof AUTHORITY_VERDICTS[number];

export interface AuthorizationRequest {
  readonly action: 'APPEND';
  readonly entry: MemoryEntry;
  readonly requestedBy: string;
  readonly requestedAt: Timestamp;
}

export interface AuthorizationResponse {
  readonly verdict: AuthorityVerdict;
  readonly reason: string;
  readonly trace: string;
  readonly respondedAt: Timestamp;
}

export interface AuditEvent {
  readonly id: string;
  readonly ts_utc: Timestamp;
  readonly action: string;
  readonly actor: string;
  readonly entryId: EntryId | null;
  readonly verdict: AuthorityVerdict | null;
  readonly trace: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS - Runtime validation
// ═══════════════════════════════════════════════════════════════════════════════

const ID_PATTERN = /^[A-Z]{3}-[0-9]{8}-[0-9]{4}-[A-Z0-9]{6}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export function isValidEntryId(value: string): value is EntryId {
  return ID_PATTERN.test(value);
}

export function isValidTimestamp(value: string): value is Timestamp {
  return ISO_PATTERN.test(value);
}

export function isValidHash(value: string): value is HashValue {
  return HASH_PATTERN.test(value);
}

export function isValidEntryClass(value: string): value is EntryClass {
  return ENTRY_CLASSES.includes(value as EntryClass);
}

export function isValidEvidenceType(value: string): value is EvidenceType {
  return EVIDENCE_TYPES.includes(value as EvidenceType);
}

/** Create branded EntryId (throws if invalid) */
export function toEntryId(value: string): EntryId {
  if (!isValidEntryId(value)) {
    throw new Error(`Invalid entry ID format: ${value}`);
  }
  return value;
}

/** Create branded Timestamp (throws if invalid) */
export function toTimestamp(value: string): Timestamp {
  if (!isValidTimestamp(value)) {
    throw new Error(`Invalid timestamp format: ${value}`);
  }
  return value;
}

/** Create branded HashValue (throws if invalid) */
export function toHashValue(value: string): HashValue {
  if (!isValidHash(value)) {
    throw new Error(`Invalid hash format: ${value}`);
  }
  return value;
}

/** Create branded ByteOffset (throws if negative) */
export function toByteOffset(value: number): ByteOffset {
  if (value < 0 || !Number.isInteger(value)) {
    throw new Error(`Invalid byte offset: ${value}`);
  }
  return value as ByteOffset;
}

/** Get current timestamp as branded type */
export function nowTimestamp(): Timestamp {
  return new Date().toISOString() as Timestamp;
}
