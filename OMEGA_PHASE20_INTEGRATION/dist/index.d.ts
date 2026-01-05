/**
 * OMEGA Integration Layer — Main Index
 * Phase 20 — v3.20.0
 *
 * Unified API combining Memory (Phase 18) and Persistence (Phase 19).
 *
 * Invariants:
 * - INV-INT-01: Atomic writes (tmp → fsync → rename)
 * - INV-INT-02: Reload == original (hash verified)
 * - INV-INT-03: Conflict never silent
 * - INV-INT-04: Roundtrip determinism
 */
export declare const INTEGRATION_VERSION = "3.20.0";
export { CanonStore, createCanonStore, type CanonFact, type CanonSnapshot, type CanonMetadata, type CanonStoreConfig, } from './canon-store.js';
export { PersistenceAdapter, createPersistenceAdapter, type PersistenceConfig, type PersistedData, type SaveResult, type LoadResult, type PersistResult, } from './persistence-adapter.js';
export { MemoryService, createMemoryService, SyncStatus, type MemoryServiceConfig, type SnapshotInfo, type SaveSnapshotResult, type LoadSnapshotResult, type SyncResult, type ConflictInfo, type MemoryResult, } from './memory-service.js';
//# sourceMappingURL=index.d.ts.map