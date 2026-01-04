/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * index.ts — Public API Exports
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 10A
 * STANDARD    : DO-178C Level A
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY TYPES — Phase 10A
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Record Key
  RecordKey,
  
  // Provenance
  ProvenanceSource,
  ProvenanceReason,
  Provenance,
  
  // Record
  MemoryRecord,
  RecordMetadata,
  RecordRef,
  
  // Write Request
  WriteRequest,
  
  // Query
  QueryFilter,
  QueryOptions,
  QueryResult,
  
  // History
  RecordHistory,
  
  // Store State
  StoreState,
  
  // Config
  MemoryConfig,
} from "./memory_types.js";

export {
  // Record Key
  parseRecordKey,
  formatRecordKey,
  isValidKeyFormat,
  
  // Provenance
  createUserProvenance,
  createSystemProvenance,
  isProvenance,
  isProvenanceSource,
  
  // Record
  isMemoryRecord,
  extractMetadata,
  createRecordRef,
  
  // Write Request
  isWriteRequest,
  
  // Validation
  validateKey,
  validatePayload,
  KEY_VALIDATION,
  
  // Config
  DEFAULT_MEMORY_CONFIG,
  
  // Module info
  MEMORY_LAYER_VERSION,
  MEMORY_LAYER_PHASE,
  MEMORY_LAYER_INFO,
} from "./memory_types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY ERRORS — Phase 10A
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  MemoryErrorCode,
  MemoryErrorCategory,
  MemoryResult,
} from "./memory_errors.js";

export {
  // Error class
  MemoryError,
  MemoryErrors,
  
  // Type guards
  isMemoryError,
  isMemoryErrorOfCategory,
  isInvariantViolation,
  filterInvariantViolations,
  
  // Utilities
  getErrorCategory,
  wrapError,
  createErrorFromCode,
  
  // Result helpers
  success,
  failure,
  unwrap,
  unwrapOr,
} from "./memory_errors.js";

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY HASH — Phase 10A
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  PayloadHashInput,
  RecordHashInput,
  HashVerificationResult,
  ChainVerificationResult,
} from "./memory_hash.js";

export {
  // Canonical encoding
  canonicalEncode,
  canonicalEqual,
  
  // SHA-256
  sha256,
  sha256Buffer,
  sha256Value,
  
  // Record hashing — INV-MEM-06
  computePayloadHash,
  computeRecordHash,
  
  // Merkle tree
  combineHashes,
  computeMerkleRoot,
  
  // Verification
  verifyPayloadHash,
  verifyRecordHash,
  verifyHashChain,
  
  // Utilities
  hashToId,
  generateContentId,
  isValidHash,
  hashesEqual,
  verifyDeterminism,
  
  // Constants
  NULL_HASH,
  EMPTY_HASH,
} from "./memory_hash.js";

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY INDEX — Phase 10B
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  IndexEntry,
  IndexStats,
  IndexBuildInput,
  IndexVerificationResult,
} from "./memory_index.js";

export {
  MemoryIndex,
  isIndexEntry,
  buildIndex,
  verifyIndex,
  verifyIndexDeterminism,
} from "./memory_index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY QUERY — Phase 10C
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  QueryableRecord,
  QueryOptions,
  QueryResult,
  StoreSnapshot,
  QueryConfig,
  QueryStats,
} from "./memory_query.js";

export {
  QueryEngine,
  createSnapshot,
  sortRecordsCanonical,
  canonicalRecordCompare,
  canonicalStringCompare,
  computeResultHash,
  verifySnapshotUnchanged,
  verifyQueryDeterminism,
  DEFAULT_QUERY_CONFIG,
} from "./memory_query.js";
