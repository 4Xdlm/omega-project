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
import { CanonStore, CanonSnapshot } from './canon-store.js';
export interface MemoryServiceConfig {
    readonly basePath: string;
    readonly instanceId?: string;
}
export interface SnapshotInfo {
    readonly key: string;
    readonly rootHash: string;
    readonly factCount: number;
    readonly timestamp: string;
}
export interface SaveSnapshotResult {
    readonly key: string;
    readonly rootHash: string;
    readonly factCount: number;
    readonly bytesWritten: number;
    readonly path: string;
}
export interface LoadSnapshotResult {
    readonly key: string;
    readonly rootHash: string;
    readonly factCount: number;
    readonly verified: boolean;
}
export declare enum SyncStatus {
    IN_SYNC = "IN_SYNC",
    LOCAL_ONLY = "LOCAL_ONLY",
    REMOTE_ONLY = "REMOTE_ONLY",
    CONFLICT = "CONFLICT"
}
export interface SyncResult {
    readonly status: SyncStatus;
    readonly localHash?: string;
    readonly remoteHash?: string;
    readonly merged?: boolean;
    readonly conflict?: ConflictInfo;
}
export interface ConflictInfo {
    readonly key: string;
    readonly localSnapshot: CanonSnapshot;
    readonly remoteSnapshot: CanonSnapshot;
    readonly detectedAt: string;
}
export type MemoryResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};
export declare class MemoryService {
    private readonly canon;
    private readonly persistence;
    private readonly conflicts;
    constructor(config: MemoryServiceConfig, canon?: CanonStore);
    getCanon(): CanonStore;
    saveSnapshot(key: string): Promise<MemoryResult<SaveSnapshotResult>>;
    loadSnapshot(key: string): Promise<MemoryResult<LoadSnapshotResult>>;
    listSnapshots(prefix?: string): Promise<MemoryResult<string[]>>;
    sync(key: string, remoteSnapshot?: CanonSnapshot): Promise<MemoryResult<SyncResult>>;
    resolveConflict(key: string, winner: 'local' | 'remote'): Promise<MemoryResult<SaveSnapshotResult>>;
    hasConflict(key: string): boolean;
    getConflict(key: string): ConflictInfo | undefined;
    getAllConflicts(): readonly ConflictInfo[];
    clearConflicts(): void;
    exists(key: string): Promise<boolean>;
    delete(key: string): Promise<MemoryResult<boolean>>;
}
export declare function createMemoryService(config: MemoryServiceConfig, canon?: CanonStore): MemoryService;
//# sourceMappingURL=memory-service.d.ts.map