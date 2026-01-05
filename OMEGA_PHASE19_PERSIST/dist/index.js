/**
 * OMEGA Persistence Layer — Main Index
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * Modules:
 * - Core: Types, CanonicalJson encoder
 * - Adapters: NodeFileAdapter, IndexedDBAdapter
 * - Sync: SyncEngine with conflict detection
 *
 * Invariants:
 * - INV-PER-01: Write atomique (jamais état partiel)
 * - INV-PER-02: Reload == original (sha/bytes identiques)
 * - INV-PER-03: Crash mid-write => ancien OU nouveau, jamais mix
 * - INV-PER-04: Format JSON déterministe
 * - INV-PER-05: Hash intégrité post-load
 * - INV-PER-06: Version migration forward only
 * - INV-IDB-01: Same state => same bytes
 * - INV-IDB-02: Migration monotone
 * - INV-SYNC-01: Divergence => conflit explicite
 * - INV-SYNC-02: Merge déterministe si non conflict
 */
// ═══════════════════════════════════════════════════════════════════════════════
// CORE
// ═══════════════════════════════════════════════════════════════════════════════
export { 
// Version
PERSIST_VERSION, PERSIST_MAGIC, PersistErrorCode, PersistSource, DEFAULT_ADAPTER_CONFIG, 
// Sync types
SyncStatus, 
// Utilities
computeHash, generateInstanceId, validateKey, createPersistError, } from './core/index.js';
export { 
// Canonical JSON
canonicalEncode, canonicalEncodeWithHash, canonicalDecode, canonicalDecodeWithVerify, isCanonicalJson, verifyJsonHash, CanonicalJson, } from './core/index.js';
// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTERS
// ═══════════════════════════════════════════════════════════════════════════════
export { NodeFileAdapter, createNodeFileAdapter, } from './adapters/index.js';
export { IndexedDBAdapter, createIndexedDBAdapter, } from './adapters/index.js';
// ═══════════════════════════════════════════════════════════════════════════════
// SYNC
// ═══════════════════════════════════════════════════════════════════════════════
export { SyncEngine as SyncEngineImpl, createSyncEngine, } from './sync/index.js';
// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════
export const PERSISTENCE_LAYER_VERSION = '3.19.0';
//# sourceMappingURL=index.js.map