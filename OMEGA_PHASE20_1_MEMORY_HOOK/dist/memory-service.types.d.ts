/**
 * OMEGA Memory Hook — Memory Service Types
 * Phase 20.1 — v3.20.1
 *
 * Interfaces for integrating with Phase 20 MemoryService.
 * These types allow the hook to work with any compatible memory service.
 */
export type MemoryResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};
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
export interface CanonFact {
    readonly id: string;
    readonly subject: string;
    readonly predicate: string;
    readonly value: string;
    readonly confidence: number;
    readonly source: string;
    readonly createdAt: string;
    readonly hash: string;
}
export interface CanonSnapshot {
    readonly version: string;
    readonly timestamp: string;
    readonly facts: readonly CanonFact[];
    readonly rootHash: string;
    readonly metadata: {
        readonly factCount: number;
        readonly sources: readonly string[];
        readonly lastModified: string;
    };
}
/**
 * Interface for memory service (compatible with Phase 20 MemoryService).
 * This allows the hook to work with the real service or a mock.
 */
export interface IMemoryService {
    saveSnapshot(key: string): Promise<MemoryResult<SaveSnapshotResult>>;
    loadSnapshot(key: string): Promise<MemoryResult<LoadSnapshotResult>>;
    listSnapshots(prefix?: string): Promise<MemoryResult<string[]>>;
    exists(key: string): Promise<boolean>;
    delete(key: string): Promise<MemoryResult<boolean>>;
    getCanon(): ICanonStore;
}
export interface ICanonStore {
    size: number;
    addFact(subject: string, predicate: string, value: string, source: string, confidence?: number): CanonFact;
    getFact(id: string): CanonFact | undefined;
    getAllFacts(): readonly CanonFact[];
    removeFact(id: string): boolean;
    clear(): void;
    snapshot(): CanonSnapshot;
    restore(snapshot: CanonSnapshot): {
        success: boolean;
        error?: string;
    };
    getRootHash(): string;
}
export declare class MockCanonStore implements ICanonStore {
    private facts;
    private idCounter;
    get size(): number;
    addFact(subject: string, predicate: string, value: string, source: string, confidence?: number): CanonFact;
    getFact(id: string): CanonFact | undefined;
    getAllFacts(): readonly CanonFact[];
    removeFact(id: string): boolean;
    clear(): void;
    snapshot(): CanonSnapshot;
    restore(snapshot: CanonSnapshot): {
        success: boolean;
        error?: string;
    };
    getRootHash(): string;
}
export declare class MockMemoryService implements IMemoryService {
    private canon;
    private snapshots;
    getCanon(): ICanonStore;
    saveSnapshot(key: string): Promise<MemoryResult<SaveSnapshotResult>>;
    loadSnapshot(key: string): Promise<MemoryResult<LoadSnapshotResult>>;
    listSnapshots(prefix?: string): Promise<MemoryResult<string[]>>;
    exists(key: string): Promise<boolean>;
    delete(key: string): Promise<MemoryResult<boolean>>;
}
//# sourceMappingURL=memory-service.types.d.ts.map