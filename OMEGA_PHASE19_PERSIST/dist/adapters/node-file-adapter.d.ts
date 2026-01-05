/**
 * OMEGA Persistence Layer — Node File Adapter
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * Invariants:
 * - INV-PER-01: Write atomique (tmp → fsync → rename)
 * - INV-PER-02: Reload == original (sha/bytes identiques)
 * - INV-PER-03: Crash mid-write => ancien OU nouveau, jamais mix
 *
 * Stratégie:
 * 1. Écrire dans fichier .tmp
 * 2. fsync le fichier
 * 3. Renommer atomiquement vers final
 * 4. fsync le répertoire parent (best effort)
 */
import { PersistenceAdapter, PersistResult, SaveResult, LoadResult, VerifyResult, ListResult, SaveOptions, LoadOptions, AdapterConfig, PersistSource } from '../core/types.js';
export declare class NodeFileAdapter implements PersistenceAdapter {
    readonly name = "NodeFileAdapter";
    readonly config: AdapterConfig;
    private sequence;
    private locks;
    constructor(config?: Partial<AdapterConfig>);
    save<T>(key: string, data: T, source: PersistSource, options?: SaveOptions): Promise<PersistResult<SaveResult>>;
    load<T>(key: string, options?: LoadOptions): Promise<PersistResult<LoadResult<T>>>;
    verify(key: string, expectedHash?: string): Promise<PersistResult<VerifyResult>>;
    list(prefix?: string): Promise<PersistResult<ListResult>>;
    delete(key: string): Promise<PersistResult<{
        deleted: boolean;
    }>>;
    exists(key: string): Promise<boolean>;
    private keyToPath;
    private keyToTempPath;
    private keyToLockPath;
    private ensureBaseDirectory;
    /**
     * Écriture atomique avec fsync
     */
    private atomicWrite;
    /**
     * Fsync du répertoire (best effort)
     */
    private fsyncDirectory;
    /**
     * Acquiert un lock exclusif
     */
    private acquireLock;
    /**
     * Relâche un lock
     */
    private releaseLock;
}
export declare function createNodeFileAdapter(config?: Partial<AdapterConfig>): NodeFileAdapter;
//# sourceMappingURL=node-file-adapter.d.ts.map