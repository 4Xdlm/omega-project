/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — UNIFIED TYPES
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NEXUS DEP consumes types from sanctuarized modules (READ-ONLY).
 * Types here are MIRRORS for decoupling — actual data comes from adapters.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION14 — MIRRORED FROM @omega/genome (FROZEN)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The 14 canonical OMEGA emotions
 * SOURCE: packages/genome/src/api/types.ts (FROZEN)
 */
export type Emotion14 =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "surprise"
  | "disgust"
  | "trust"
  | "anticipation"
  | "love"
  | "guilt"
  | "shame"
  | "pride"
  | "envy"
  | "hope";

export const EMOTION14_LIST: readonly Emotion14[] = Object.freeze([
  "joy", "sadness", "anger", "fear",
  "surprise", "disgust", "trust", "anticipation",
  "love", "guilt", "shame", "pride",
  "envy", "hope"
]);

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS OPERATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type NexusOperationType =
  | "ANALYZE_TEXT"
  | "VALIDATE_INPUT"
  | "BUILD_DNA"
  | "COMPARE_FINGERPRINTS"
  | "QUERY_GENOME";

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST / RESPONSE CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic NEXUS request wrapper
 * INV-NEXUS-04: All requests have unique IDs
 */
export interface NexusRequest<T> {
  readonly id: string;
  readonly type: NexusOperationType;
  readonly payload: T;
  readonly timestamp: string;
  readonly seed?: number;
}

/**
 * Generic NEXUS response wrapper
 */
export interface NexusResponse<T> {
  readonly requestId: string;
  readonly success: boolean;
  readonly data?: T;
  readonly error?: NexusError;
  readonly executionTimeMs: number;
}

/**
 * NEXUS error structure
 */
export interface NexusError {
  readonly code: NexusErrorCode;
  readonly message: string;
  readonly source?: string;
  readonly timestamp: string;
}

export type NexusErrorCode =
  | "VALIDATION_FAILED"
  | "ADAPTER_ERROR"
  | "TIMEOUT"
  | "DETERMINISM_VIOLATION"
  | "SANCTUARY_ACCESS_DENIED"
  | "UNKNOWN_OPERATION";

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION TRACE (Audit Trail)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TraceStep {
  readonly module: string;
  readonly operation: string;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly success: boolean;
  readonly hash?: string;
}

export interface ExecutionTrace {
  readonly requestId: string;
  readonly steps: readonly TraceStep[];
  readonly totalTimeMs: number;
  readonly determinismHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base interface for all NEXUS adapters
 * INV-NEXUS-01: Adapters are READ-ONLY
 */
export interface NexusAdapter {
  readonly name: string;
  readonly version: string;
  readonly isReadOnly: true;
}

/**
 * Result of adapter health check
 */
export interface AdapterHealthResult {
  readonly adapter: string;
  readonly healthy: boolean;
  readonly latencyMs: number;
  readonly error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMILARITY TYPES (Unified)
// ═══════════════════════════════════════════════════════════════════════════════

export type SimilarityVerdict =
  | "IDENTICAL"
  | "VERY_SIMILAR"
  | "SIMILAR"
  | "DIFFERENT"
  | "UNIQUE";

export interface SimilarityResult {
  readonly score: number;
  readonly confidence: number;
  readonly verdict: SimilarityVerdict;
  readonly components?: SimilarityComponents;
}

export interface SimilarityComponents {
  readonly emotion: number;
  readonly style: number;
  readonly structure: number;
  readonly tempo: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unified fingerprint reference
 */
export interface FingerprintRef {
  readonly type: "genome" | "mycelium";
  readonly hash: string;
  readonly version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isNexusError(obj: unknown): obj is NexusError {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "code" in obj &&
    "message" in obj &&
    "timestamp" in obj
  );
}

export function isSuccessResponse<T>(
  response: NexusResponse<T>
): response is NexusResponse<T> & { data: T } {
  return response.success && response.data !== undefined;
}

export function isErrorResponse<T>(
  response: NexusResponse<T>
): response is NexusResponse<T> & { error: NexusError } {
  return !response.success && response.error !== undefined;
}
