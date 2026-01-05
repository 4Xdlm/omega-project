/**
 * OMEGA Persistence Layer — Core Types
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * Invariants:
 * - INV-PER-01: Write atomique (jamais état partiel)
 * - INV-PER-02: Reload == original (sha/bytes identiques)
 * - INV-PER-03: Crash mid-write => ancien OU nouveau, jamais mix
 * - INV-PER-04: Format JSON déterministe
 * - INV-PER-05: Hash intégrité post-load
 * - INV-PER-06: Version migration forward only
 */
export declare const PERSIST_VERSION = "3.19.0";
export declare const PERSIST_MAGIC = "OMEGA_PERSIST_V1";
export type PersistResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: PersistError;
};
export interface PersistError {
    readonly code: PersistErrorCode;
    readonly message: string;
    readonly details?: Record<string, unknown>;
}
export declare enum PersistErrorCode {
    WRITE_FAILED = "WRITE_FAILED",
    ATOMIC_RENAME_FAILED = "ATOMIC_RENAME_FAILED",
    LOCK_FAILED = "LOCK_FAILED",
    LOCK_TIMEOUT = "LOCK_TIMEOUT",
    NOT_FOUND = "NOT_FOUND",
    READ_FAILED = "READ_FAILED",
    PARSE_FAILED = "PARSE_FAILED",
    HASH_MISMATCH = "HASH_MISMATCH",
    MAGIC_MISMATCH = "MAGIC_MISMATCH",
    VERSION_MISMATCH = "VERSION_MISMATCH",
    CORRUPTED = "CORRUPTED",
    CONFLICT_DETECTED = "CONFLICT_DETECTED",
    MERGE_FAILED = "MERGE_FAILED",
    DIVERGENCE = "DIVERGENCE",
    INVALID_KEY = "INVALID_KEY",
    INVALID_DATA = "INVALID_DATA",
    STORAGE_FULL = "STORAGE_FULL",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    ADAPTER_ERROR = "ADAPTER_ERROR"
}
/**
 * Envelope de persistance — structure wrapper pour toutes les données
 */
export interface PersistedEnvelope<T = unknown> {
    readonly magic: typeof PERSIST_MAGIC;
    readonly version: string;
    readonly schemaVersion: number;
    readonly key: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly dataHash: string;
    readonly data: T;
    readonly metadata: PersistMetadata;
}
export interface PersistMetadata {
    readonly source: PersistSource;
    readonly instanceId: string;
    readonly sequence: number;
    readonly previousHash: string | null;
    readonly tags: readonly string[];
}
export declare enum PersistSource {
    CANON_CORE = "CANON_CORE",
    INTENT_MACHINE = "INTENT_MACHINE",
    CONTEXT_ENGINE = "CONTEXT_ENGINE",
    CONFLICT_RESOLVER = "CONFLICT_RESOLVER",
    NEXUS = "NEXUS",
    CUSTOM = "CUSTOM"
}
export interface SaveResult {
    readonly key: string;
    readonly path: string;
    readonly bytesWritten: number;
    readonly sha256: string;
    readonly timestamp: string;
    readonly sequence: number;
}
export interface LoadResult<T = unknown> {
    readonly key: string;
    readonly path: string;
    readonly bytesRead: number;
    readonly sha256: string;
    readonly envelope: PersistedEnvelope<T>;
    readonly verified: boolean;
}
export interface VerifyResult {
    readonly key: string;
    readonly valid: boolean;
    readonly expectedHash: string;
    readonly actualHash: string;
    readonly errors: string[];
}
export interface ListResult {
    readonly keys: readonly string[];
    readonly count: number;
    readonly prefix?: string;
}
export interface SaveOptions {
    readonly expectedHash?: string;
    readonly tags?: readonly string[];
    readonly overwrite?: boolean;
    readonly compress?: boolean;
}
export interface LoadOptions {
    readonly verify?: boolean;
    readonly allowMigration?: boolean;
}
export interface AdapterConfig {
    readonly basePath: string;
    readonly instanceId: string;
    readonly lockTimeout: number;
    readonly maxFileSize: number;
    readonly schemaVersion: number;
}
export declare const DEFAULT_ADAPTER_CONFIG: AdapterConfig;
export declare enum SyncStatus {
    IN_SYNC = "IN_SYNC",
    LOCAL_AHEAD = "LOCAL_AHEAD",
    REMOTE_AHEAD = "REMOTE_AHEAD",
    DIVERGED = "DIVERGED",
    CONFLICT = "CONFLICT"
}
export interface SyncState {
    readonly localSequence: number;
    readonly remoteSequence: number;
    readonly localHash: string;
    readonly remoteHash: string;
    readonly status: SyncStatus;
    readonly lastSyncAt: string;
}
export interface SyncConflict {
    readonly key: string;
    readonly localEnvelope: PersistedEnvelope;
    readonly remoteEnvelope: PersistedEnvelope;
    readonly detectedAt: string;
    readonly reason: string;
}
export interface MergeResult<T = unknown> {
    readonly merged: boolean;
    readonly result?: PersistedEnvelope<T>;
    readonly conflict?: SyncConflict;
}
/**
 * Interface abstraite pour les adaptateurs de persistance
 * Implémentée par: NodeFileAdapter, IndexedDBAdapter
 */
export interface PersistenceAdapter {
    readonly name: string;
    readonly config: AdapterConfig;
    /**
     * Sauvegarde des données avec écriture atomique
     * INV-PER-01: Jamais d'état partiel
     */
    save<T>(key: string, data: T, source: PersistSource, options?: SaveOptions): Promise<PersistResult<SaveResult>>;
    /**
     * Charge des données et vérifie l'intégrité
     * INV-PER-02: Reload == original
     */
    load<T>(key: string, options?: LoadOptions): Promise<PersistResult<LoadResult<T>>>;
    /**
     * Vérifie l'intégrité d'une entrée
     * INV-PER-05: Hash intégrité post-load
     */
    verify(key: string, expectedHash?: string): Promise<PersistResult<VerifyResult>>;
    /**
     * Liste les clés avec préfixe optionnel
     */
    list(prefix?: string): Promise<PersistResult<ListResult>>;
    /**
     * Supprime une entrée (soft delete via rename)
     */
    delete(key: string): Promise<PersistResult<{
        deleted: boolean;
    }>>;
    /**
     * Vérifie si une clé existe
     */
    exists(key: string): Promise<boolean>;
}
export interface SyncEngine {
    /**
     * Compare l'état local vs remote
     */
    compare(key: string): Promise<PersistResult<SyncState>>;
    /**
     * Pull depuis remote avec détection de conflit
     * INV-SYNC-01: Divergence => conflit explicite
     */
    pull(key: string): Promise<PersistResult<MergeResult>>;
    /**
     * Push vers remote
     */
    push(key: string): Promise<PersistResult<SaveResult>>;
    /**
     * Résout un conflit manuellement
     */
    resolveConflict(key: string, winner: 'local' | 'remote' | 'merge', mergedData?: unknown): Promise<PersistResult<SaveResult>>;
}
/**
 * Calcule le hash SHA-256 d'un buffer ou string
 */
export declare function computeHash(data: Buffer | string): string;
/**
 * Génère un ID d'instance unique
 */
export declare function generateInstanceId(): string;
/**
 * Valide une clé de persistance
 */
export declare function validateKey(key: string): PersistResult<string>;
/**
 * Crée une erreur de persistance
 */
export declare function createPersistError(code: PersistErrorCode, message: string, details?: Record<string, unknown>): PersistError;
//# sourceMappingURL=types.d.ts.map