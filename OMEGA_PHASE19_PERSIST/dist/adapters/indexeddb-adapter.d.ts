/**
 * OMEGA Persistence Layer — IndexedDB Adapter
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * Invariants:
 * - INV-IDB-01: Same state => same bytes
 * - INV-IDB-02: Migration monotone (jamais perte silencieuse)
 *
 * Note: Cette implémentation est pour environnement browser.
 * En Node.js, utiliser fake-indexeddb pour les tests.
 */
import { PersistenceAdapter, PersistResult, SaveResult, LoadResult, VerifyResult, ListResult, SaveOptions, LoadOptions, AdapterConfig, PersistSource } from '../core/types.js';
export declare class IndexedDBAdapter implements PersistenceAdapter {
    readonly name = "IndexedDBAdapter";
    readonly config: AdapterConfig;
    private db;
    private sequence;
    private initPromise;
    constructor(config?: Partial<AdapterConfig>);
    private ensureInitialized;
    private initialize;
    save<T>(key: string, data: T, source: PersistSource, options?: SaveOptions): Promise<PersistResult<SaveResult>>;
    load<T>(key: string, options?: LoadOptions): Promise<PersistResult<LoadResult<T>>>;
    verify(key: string, expectedHash?: string): Promise<PersistResult<VerifyResult>>;
    list(prefix?: string): Promise<PersistResult<ListResult>>;
    delete(key: string): Promise<PersistResult<{
        deleted: boolean;
    }>>;
    exists(key: string): Promise<boolean>;
    close(): void;
}
export declare function createIndexedDBAdapter(config?: Partial<AdapterConfig>): IndexedDBAdapter;
//# sourceMappingURL=indexeddb-adapter.d.ts.map