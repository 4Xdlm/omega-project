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

import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const PERSIST_VERSION = '3.19.0';

export const PERSIST_MAGIC = 'OMEGA_PERSIST_V1';

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PersistResult<T> = 
  | { success: true; data: T }
  | { success: false; error: PersistError };

export interface PersistError {
  readonly code: PersistErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export enum PersistErrorCode {
  // Write errors
  WRITE_FAILED = 'WRITE_FAILED',
  ATOMIC_RENAME_FAILED = 'ATOMIC_RENAME_FAILED',
  LOCK_FAILED = 'LOCK_FAILED',
  LOCK_TIMEOUT = 'LOCK_TIMEOUT',
  
  // Read errors
  NOT_FOUND = 'NOT_FOUND',
  READ_FAILED = 'READ_FAILED',
  PARSE_FAILED = 'PARSE_FAILED',
  
  // Integrity errors
  HASH_MISMATCH = 'HASH_MISMATCH',
  MAGIC_MISMATCH = 'MAGIC_MISMATCH',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  CORRUPTED = 'CORRUPTED',
  
  // Sync errors
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  MERGE_FAILED = 'MERGE_FAILED',
  DIVERGENCE = 'DIVERGENCE',
  
  // General
  INVALID_KEY = 'INVALID_KEY',
  INVALID_DATA = 'INVALID_DATA',
  STORAGE_FULL = 'STORAGE_FULL',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ADAPTER_ERROR = 'ADAPTER_ERROR',
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTED STATE
// ═══════════════════════════════════════════════════════════════════════════════

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

export enum PersistSource {
  CANON_CORE = 'CANON_CORE',
  INTENT_MACHINE = 'INTENT_MACHINE',
  CONTEXT_ENGINE = 'CONTEXT_ENGINE',
  CONFLICT_RESOLVER = 'CONFLICT_RESOLVER',
  NEXUS = 'NEXUS',
  CUSTOM = 'CUSTOM',
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAVE/LOAD RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

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

export const DEFAULT_ADAPTER_CONFIG: AdapterConfig = {
  basePath: './out/persist',
  instanceId: 'default',
  lockTimeout: 5000,
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  schemaVersion: 1,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export enum SyncStatus {
  IN_SYNC = 'IN_SYNC',
  LOCAL_AHEAD = 'LOCAL_AHEAD',
  REMOTE_AHEAD = 'REMOTE_AHEAD',
  DIVERGED = 'DIVERGED',
  CONFLICT = 'CONFLICT',
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

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

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
  save<T>(
    key: string,
    data: T,
    source: PersistSource,
    options?: SaveOptions
  ): Promise<PersistResult<SaveResult>>;
  
  /**
   * Charge des données et vérifie l'intégrité
   * INV-PER-02: Reload == original
   */
  load<T>(
    key: string,
    options?: LoadOptions
  ): Promise<PersistResult<LoadResult<T>>>;
  
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
  delete(key: string): Promise<PersistResult<{ deleted: boolean }>>;
  
  /**
   * Vérifie si une clé existe
   */
  exists(key: string): Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

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
  resolveConflict(
    key: string,
    winner: 'local' | 'remote' | 'merge',
    mergedData?: unknown
  ): Promise<PersistResult<SaveResult>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le hash SHA-256 d'un buffer ou string
 */
export function computeHash(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Génère un ID d'instance unique
 */
export function generateInstanceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Valide une clé de persistance
 */
export function validateKey(key: string): PersistResult<string> {
  if (!key || typeof key !== 'string') {
    return {
      success: false,
      error: {
        code: PersistErrorCode.INVALID_KEY,
        message: 'Key must be a non-empty string',
      },
    };
  }
  
  // Pas de caractères interdits Windows/Unix (mais : autorisé comme séparateur)
  const forbidden = /[<>"|?*\\/\x00-\x1f]/;
  if (forbidden.test(key)) {
    return {
      success: false,
      error: {
        code: PersistErrorCode.INVALID_KEY,
        message: 'Key contains forbidden characters',
        details: { key },
      },
    };
  }
  
  // Longueur max 200
  if (key.length > 200) {
    return {
      success: false,
      error: {
        code: PersistErrorCode.INVALID_KEY,
        message: 'Key exceeds maximum length of 200 characters',
        details: { length: key.length },
      },
    };
  }
  
  return { success: true, data: key };
}

/**
 * Crée une erreur de persistance
 */
export function createPersistError(
  code: PersistErrorCode,
  message: string,
  details?: Record<string, unknown>
): PersistError {
  return { code, message, details };
}
