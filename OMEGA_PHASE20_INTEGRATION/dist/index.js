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
// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════
export const INTEGRATION_VERSION = '3.20.0';
// ═══════════════════════════════════════════════════════════════════════════════
// CANON STORE (Phase 18 concepts)
// ═══════════════════════════════════════════════════════════════════════════════
export { CanonStore, createCanonStore, } from './canon-store.js';
// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENCE ADAPTER (Phase 19 concepts)
// ═══════════════════════════════════════════════════════════════════════════════
export { PersistenceAdapter, createPersistenceAdapter, } from './persistence-adapter.js';
// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY SERVICE (Integration)
// ═══════════════════════════════════════════════════════════════════════════════
export { MemoryService, createMemoryService, SyncStatus, } from './memory-service.js';
//# sourceMappingURL=index.js.map