/**
 * OMEGA Canon Types v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - INV-E-ID-01: IDs branded + opaques
 * - INV-E-NAN-01: NaN détecté = INVALID_VALUE_NAN
 * - INV-E-STATUS-01: Status enum fermé
 * - INV-E-STATUS-02: Transitions validées
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §3
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES (INV-E-ID-01)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Brand helper for nominal typing.
 */
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

/**
 * Claim ID - Identifies a single claim.
 * Format: CLM-{mono_ns_hex}-{random_hex}
 */
export type ClaimId = Brand<string, 'ClaimId'>;

/**
 * Entity ID - Identifies an entity subject.
 * Format: ENT-{mono_ns_hex}-{random_hex}
 */
export type EntityId = Brand<string, 'EntityId'>;

/**
 * Evidence ID - Identifies an evidence reference.
 * Format: EVD-{mono_ns_hex}-{random_hex}
 */
export type EvidenceId = Brand<string, 'EvidenceId'>;

/**
 * Union of all ID types for references.
 */
export type RefId = ClaimId | EvidenceId;

/**
 * Predicate type - Validated against catalog.
 */
export type PredicateType = Brand<string, 'PredicateType'>;

/**
 * Canon version - Monotonically increasing.
 */
export type CanonVersion = Brand<number, 'CanonVersion'>;

/**
 * Chain hash - SHA-256 hex string.
 */
export type ChainHash = Brand<string, 'ChainHash'>;

/**
 * Monotonic nanosecond timestamp.
 */
export type MonoNs = Brand<bigint, 'MonoNs'>;

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS AND CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Claim status (INV-E-STATUS-01: Closed enum)
 */
export const ClaimStatus = {
  ACTIVE: 'ACTIVE',
  SUPERSEDED: 'SUPERSEDED',
  CONDITIONAL: 'CONDITIONAL',
} as const;

export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

/**
 * Evidence type classification.
 */
export const EvidenceType = {
  CHAPTER: 'CHAPTER',
  NOTE: 'NOTE',
  DECISION: 'DECISION',
  EXTERNAL: 'EXTERNAL',
  CANON_CLAIM: 'CANON_CLAIM',
} as const;

export type EvidenceType = (typeof EvidenceType)[keyof typeof EvidenceType];

/**
 * Lineage source types.
 */
export const LineageSource = {
  USER_INPUT: 'USER_INPUT',
  GENESIS_FORGE: 'GENESIS_FORGE',
  INFERENCE: 'INFERENCE',
  IMPORT: 'IMPORT',
  SYSTEM: 'SYSTEM',
} as const;

export type LineageSource = (typeof LineageSource)[keyof typeof LineageSource];

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE REFERENCE (INV-E-EVID-01, INV-E-EVID-02)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reference to evidence supporting a claim.
 */
export interface EvidenceRef {
  /** Type of evidence */
  readonly type: EvidenceType;

  /** Evidence ID (must match ID_FORMAT_REGEX_EVD) */
  readonly id: EvidenceId;

  /** Optional location within evidence (e.g., "chapter:3,paragraph:5") */
  readonly location?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINEAGE (INV-E-LINEAGE-01, INV-E-LINEAGE-02)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lineage tracking for claim origin.
 */
export interface Lineage {
  /** Source of the claim */
  readonly source: LineageSource;

  /** Optional source ID (e.g., user ID, forge run ID) */
  readonly sourceId?: string;

  /** Confidence level 0.0-1.0 */
  readonly confidence: number;

  /** Optional metadata */
  readonly metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM VALUE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Primitive value types allowed in claims.
 */
export type PrimitiveValue = string | number | boolean | null | bigint;

/**
 * Recursive claim value type.
 * Arrays and objects are allowed, but NaN is forbidden (INV-E-NAN-01).
 */
export type ClaimValue =
  | PrimitiveValue
  | ClaimValue[]
  | { readonly [key: string]: ClaimValue };

// ═══════════════════════════════════════════════════════════════════════════════
// CANON CLAIM (Main Structure)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete Canon Claim structure.
 * All fields are readonly (immutable after creation).
 *
 * SPEC: CANON_SCHEMA_SPEC v1.2 §4.1
 */
export interface CanonClaim {
  // ─── Identification ───
  /** Unique claim identifier */
  readonly id: ClaimId;

  /** SHA-256 hash of canonical claim (excluding hash field) */
  readonly hash: ChainHash;

  /** Hash of previous claim in chain (null for genesis) */
  readonly prevHash: ChainHash | null;

  // ─── Content ───
  /** Subject entity (what the claim is about) */
  readonly subject: EntityId;

  /** Predicate (type of assertion) */
  readonly predicate: PredicateType;

  /** Claim value/object */
  readonly value: ClaimValue;

  // ─── Metadata ───
  /** Monotonic timestamp (nanoseconds) */
  readonly mono_ns: MonoNs;

  /** Canon version (monotonically increasing) */
  readonly version: CanonVersion;

  /** Lineage tracking */
  readonly lineage: Lineage;

  /** Evidence references supporting this claim */
  readonly evidence: readonly EvidenceRef[];

  // ─── Supersession (v1.2: structural field only, not predicate) ───
  /** ID of claim being superseded (if any) */
  readonly supersedes?: ClaimId;

  // ─── Status ───
  /** Current claim status */
  readonly status: ClaimStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE CLAIM PARAMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parameters for creating a new claim.
 * ID, hash, prevHash, mono_ns, version are generated by factory.
 */
export interface CreateClaimParams {
  readonly subject: EntityId;
  readonly predicate: PredicateType;
  readonly value: ClaimValue;
  readonly lineage: Lineage;
  readonly evidence: readonly EvidenceRef[];
  readonly supersedes?: ClaimId;
  readonly status?: ClaimStatus;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERRORS (CanonError)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canon error codes.
 */
export const CanonErrorCode = {
  // Validation errors
  INVALID_SUBJECT: 'INVALID_SUBJECT',
  INVALID_PREDICATE: 'INVALID_PREDICATE',
  INVALID_VALUE: 'INVALID_VALUE',
  INVALID_VALUE_NAN: 'INVALID_VALUE_NAN',
  INVALID_EVIDENCE: 'INVALID_EVIDENCE',
  INVALID_LINEAGE: 'INVALID_LINEAGE',
  INVALID_ID: 'INVALID_ID',

  // Chain errors
  CHAIN_BROKEN: 'CHAIN_BROKEN',
  DUPLICATE_ID: 'DUPLICATE_ID',
  HASH_MISMATCH: 'HASH_MISMATCH',

  // Conflict errors
  CONTRADICTION_DIRECT: 'CONTRADICTION_DIRECT',
  CONTRADICTION_SEMANTIC: 'CONTRADICTION_SEMANTIC',
  ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
  SUPERSESSION_LOOP: 'SUPERSESSION_LOOP',

  // Storage errors
  SEGMENT_FULL: 'SEGMENT_FULL',
  STORAGE_FAILED: 'STORAGE_FAILED',
  INDEX_CORRUPT: 'INDEX_CORRUPT',

  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  SENTINEL_DENY: 'SENTINEL_DENY',
} as const;

export type CanonErrorCode = (typeof CanonErrorCode)[keyof typeof CanonErrorCode];

/**
 * Typed Canon error with code and optional details.
 */
export class CanonError extends Error {
  constructor(
    public readonly code: CanonErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'CanonError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard for ClaimStatus.
 */
export function isClaimStatus(value: unknown): value is ClaimStatus {
  return (
    typeof value === 'string' &&
    (value === ClaimStatus.ACTIVE ||
      value === ClaimStatus.SUPERSEDED ||
      value === ClaimStatus.CONDITIONAL)
  );
}

/**
 * Type guard for EvidenceType.
 */
export function isEvidenceType(value: unknown): value is EvidenceType {
  return (
    typeof value === 'string' &&
    (value === EvidenceType.CHAPTER ||
      value === EvidenceType.NOTE ||
      value === EvidenceType.DECISION ||
      value === EvidenceType.EXTERNAL ||
      value === EvidenceType.CANON_CLAIM)
  );
}

/**
 * Type guard for LineageSource.
 */
export function isLineageSource(value: unknown): value is LineageSource {
  return (
    typeof value === 'string' &&
    (value === LineageSource.USER_INPUT ||
      value === LineageSource.GENESIS_FORGE ||
      value === LineageSource.INFERENCE ||
      value === LineageSource.IMPORT ||
      value === LineageSource.SYSTEM)
  );
}

/**
 * Validates confidence is in range [0.0, 1.0].
 */
export function isValidConfidence(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1 && Number.isFinite(value);
}
