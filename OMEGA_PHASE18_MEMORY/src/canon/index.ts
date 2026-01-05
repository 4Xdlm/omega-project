/**
 * OMEGA CANON_CORE — Public API
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */

// Main class
export { CanonStore, createCanonStore } from './canon-store.js';
export type { ClockFn } from './canon-store.js';

// Types
export type {
  Fact,
  FactMetadata,
  CreateFactInput,
  UpdateFactInput,
  FactFilter,
  CanonSnapshot,
  CanonDiff,
  FactConflict,
  CanonMetrics,
  AuditEntry,
  CanonResult,
  CanonError,
  CanonExport,
} from './types.js';

export { CanonErrorCode } from './types.js';

// Constants
export {
  CANON_VERSION,
  CANON_MAGIC,
  FactType,
  FactSource,
  FactStatus,
  ConfidenceLevel,
  ConflictType,
  ConflictResolution,
  SOURCE_PRIORITY,
  DEFAULT_CONFIDENCE,
  CANON_LIMITS,
  HASH_CONFIG,
} from './constants.js';

// Hash utilities
export {
  sha256,
  canonicalEncode,
  hashFact,
  verifyFactHash,
  verifyChain,
  computeMerkleRoot,
  hashAuditEntry,
  hashExport,
  generateFactId,
  generateSnapshotId,
  generateAuditId,
  generateConflictId,
  resetFactIdCounter,
} from './hash.js';
