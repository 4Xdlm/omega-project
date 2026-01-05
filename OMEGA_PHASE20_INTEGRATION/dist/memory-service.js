/**
 * OMEGA Integration Layer — Memory Service
 * Phase 20 — v3.20.0
 *
 * Unified service that combines Canon (Phase 18) and Persistence (Phase 19).
 *
 * Features:
 * - saveSnapshot(key): Canon → canonical JSON → file
 * - loadSnapshot(key): file → verify → restore Canon
 * - listSnapshots(prefix): list saved snapshots
 * - sync(key, remote?): detect conflicts, merge or flag
 *
 * Invariants:
 * - INV-INT-01: Atomic writes
 * - INV-INT-02: Reload == original (hash verified)
 * - INV-INT-03: Conflict never silent
 * - INV-INT-04: Roundtrip determinism
 */
import { createCanonStore } from './canon-store.js';
import { createPersistenceAdapter } from './persistence-adapter.js';
export var SyncStatus;
(function (SyncStatus) {
    SyncStatus["IN_SYNC"] = "IN_SYNC";
    SyncStatus["LOCAL_ONLY"] = "LOCAL_ONLY";
    SyncStatus["REMOTE_ONLY"] = "REMOTE_ONLY";
    SyncStatus["CONFLICT"] = "CONFLICT";
})(SyncStatus || (SyncStatus = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY SERVICE
// ═══════════════════════════════════════════════════════════════════════════════
export class MemoryService {
    canon;
    persistence;
    conflicts = new Map();
    constructor(config, canon) {
        this.canon = canon ?? createCanonStore();
        this.persistence = createPersistenceAdapter({
            basePath: config.basePath,
            instanceId: config.instanceId,
        });
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CANON ACCESS
    // ═══════════════════════════════════════════════════════════════════════════
    getCanon() {
        return this.canon;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SAVE SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════════════
    async saveSnapshot(key) {
        try {
            // Create snapshot from canon
            const snapshot = this.canon.snapshot();
            // Save to persistence
            const result = await this.persistence.save(key, snapshot);
            if (!result.success) {
                return { success: false, error: result.error };
            }
            return {
                success: true,
                data: {
                    key,
                    rootHash: snapshot.rootHash,
                    factCount: snapshot.metadata.factCount,
                    bytesWritten: result.data.bytesWritten,
                    path: result.data.path,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `saveSnapshot failed: ${error instanceof Error ? error.message : 'Unknown'}`,
            };
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // LOAD SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════════════
    async loadSnapshot(key) {
        try {
            // Load from persistence
            const result = await this.persistence.load(key);
            if (!result.success) {
                return { success: false, error: result.error };
            }
            const snapshot = result.data.data;
            // Restore to canon
            const restoreResult = this.canon.restore(snapshot);
            if (!restoreResult.success) {
                return { success: false, error: restoreResult.error ?? 'Restore failed' };
            }
            return {
                success: true,
                data: {
                    key,
                    rootHash: snapshot.rootHash,
                    factCount: snapshot.metadata.factCount,
                    verified: result.data.verified,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `loadSnapshot failed: ${error instanceof Error ? error.message : 'Unknown'}`,
            };
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // LIST SNAPSHOTS
    // ═══════════════════════════════════════════════════════════════════════════
    async listSnapshots(prefix) {
        return this.persistence.list(prefix);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SYNC
    // ═══════════════════════════════════════════════════════════════════════════
    async sync(key, remoteSnapshot) {
        try {
            const localExists = await this.persistence.exists(key);
            const localHash = this.canon.getRootHash();
            // Case 1: No remote provided
            if (!remoteSnapshot) {
                if (!localExists) {
                    return {
                        success: true,
                        data: { status: SyncStatus.LOCAL_ONLY, localHash },
                    };
                }
                // Load local and compare with current canon
                const loadResult = await this.persistence.load(key);
                if (!loadResult.success) {
                    return { success: false, error: loadResult.error };
                }
                const persistedHash = loadResult.data.data.rootHash;
                if (persistedHash === localHash) {
                    return {
                        success: true,
                        data: { status: SyncStatus.IN_SYNC, localHash },
                    };
                }
                // Local canon differs from persisted - need to decide
                return {
                    success: true,
                    data: {
                        status: SyncStatus.CONFLICT,
                        localHash,
                        remoteHash: persistedHash,
                        conflict: {
                            key,
                            localSnapshot: this.canon.snapshot(),
                            remoteSnapshot: loadResult.data.data,
                            detectedAt: new Date().toISOString(),
                        },
                    },
                };
            }
            // Case 2: Remote provided - compare
            const remoteHash = remoteSnapshot.rootHash;
            if (localHash === remoteHash) {
                return {
                    success: true,
                    data: { status: SyncStatus.IN_SYNC, localHash, remoteHash },
                };
            }
            // Different hashes = conflict (INV-INT-03: Conflict never silent)
            const conflict = {
                key,
                localSnapshot: this.canon.snapshot(),
                remoteSnapshot,
                detectedAt: new Date().toISOString(),
            };
            this.conflicts.set(key, conflict);
            return {
                success: true,
                data: {
                    status: SyncStatus.CONFLICT,
                    localHash,
                    remoteHash,
                    merged: false,
                    conflict,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: `sync failed: ${error instanceof Error ? error.message : 'Unknown'}`,
            };
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFLICT RESOLUTION
    // ═══════════════════════════════════════════════════════════════════════════
    async resolveConflict(key, winner) {
        const conflict = this.conflicts.get(key);
        if (!conflict) {
            return { success: false, error: `No conflict found for key: ${key}` };
        }
        if (winner === 'remote') {
            // Restore remote snapshot to canon
            const restoreResult = this.canon.restore(conflict.remoteSnapshot);
            if (!restoreResult.success) {
                return { success: false, error: restoreResult.error ?? 'Restore failed' };
            }
        }
        // Save current canon state
        const saveResult = await this.saveSnapshot(key);
        if (saveResult.success) {
            this.conflicts.delete(key);
        }
        return saveResult;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFLICT QUERIES
    // ═══════════════════════════════════════════════════════════════════════════
    hasConflict(key) {
        return this.conflicts.has(key);
    }
    getConflict(key) {
        return this.conflicts.get(key);
    }
    getAllConflicts() {
        return Array.from(this.conflicts.values());
    }
    clearConflicts() {
        this.conflicts.clear();
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════════════════
    async exists(key) {
        return this.persistence.exists(key);
    }
    async delete(key) {
        return this.persistence.delete(key);
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
export function createMemoryService(config, canon) {
    return new MemoryService(config, canon);
}
//# sourceMappingURL=memory-service.js.map