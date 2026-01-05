/**
 * OMEGA CANON_CORE — Public API
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */
// Main class
export { CanonStore, createCanonStore } from './canon-store.js';
export { CanonErrorCode } from './types.js';
// Constants
export { CANON_VERSION, CANON_MAGIC, FactType, FactSource, FactStatus, ConfidenceLevel, ConflictType, ConflictResolution, SOURCE_PRIORITY, DEFAULT_CONFIDENCE, CANON_LIMITS, HASH_CONFIG, } from './constants.js';
// Hash utilities
export { sha256, canonicalEncode, hashFact, verifyFactHash, verifyChain, computeMerkleRoot, hashAuditEntry, hashExport, generateFactId, generateSnapshotId, generateAuditId, generateConflictId, resetFactIdCounter, } from './hash.js';
//# sourceMappingURL=index.js.map