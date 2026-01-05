/**
 * OMEGA Integration Layer — Persistence Adapter
 * Phase 20 — v3.20.0
 *
 * Simplified persistence for integration.
 * Based on Phase 19 NodeFileAdapter concepts.
 *
 * Invariants:
 * - INV-INT-01: Atomic writes (tmp → fsync → rename)
 * - INV-INT-02: Reload == original
 * - INV-INT-03: Hash integrity verified
 */
export interface PersistenceConfig {
    readonly basePath: string;
    readonly instanceId?: string;
}
export interface PersistedData<T = unknown> {
    readonly magic: 'OMEGA_PERSIST_V2';
    readonly version: string;
    readonly key: string;
    readonly timestamp: string;
    readonly dataHash: string;
    readonly data: T;
}
export interface SaveResult {
    readonly key: string;
    readonly path: string;
    readonly hash: string;
    readonly bytesWritten: number;
}
export interface LoadResult<T> {
    readonly key: string;
    readonly path: string;
    readonly hash: string;
    readonly data: T;
    readonly verified: boolean;
}
export type PersistResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};
export declare class PersistenceAdapter {
    private readonly basePath;
    private readonly instanceId;
    constructor(config: PersistenceConfig);
    private ensureDirectory;
    private keyToPath;
    private keyToTempPath;
    save<T>(key: string, data: T): Promise<PersistResult<SaveResult>>;
    load<T>(key: string): Promise<PersistResult<LoadResult<T>>>;
    list(prefix?: string): Promise<PersistResult<string[]>>;
    exists(key: string): Promise<boolean>;
    delete(key: string): Promise<PersistResult<boolean>>;
}
export declare function createPersistenceAdapter(config: PersistenceConfig): PersistenceAdapter;
//# sourceMappingURL=persistence-adapter.d.ts.map