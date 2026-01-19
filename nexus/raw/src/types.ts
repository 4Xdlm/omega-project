/**
 * Raw Storage Types
 * Standard: NASA-Grade L4
 *
 * Phase A: Full implementation with backends, encryption, TTL
 */

// ============================================================
// Core Types
// ============================================================

export interface RawEntry {
  readonly key: string;
  readonly data: Buffer;
  readonly metadata: EntryMetadata;
}

export interface EntryMetadata {
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly expiresAt: number | null;
  readonly compressed: boolean;
  readonly encrypted: boolean;
  readonly size: number;
  readonly checksum: string;
  readonly custom?: Readonly<Record<string, unknown>>;
}

export interface StoreOptions {
  readonly ttl?: number;
  readonly compress?: boolean;
  readonly encrypt?: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface StorageResult {
  readonly success: boolean;
  readonly key: string;
  readonly error?: string;
}

export interface RetrieveResult {
  readonly success: boolean;
  readonly data?: Buffer;
  readonly metadata?: EntryMetadata;
  readonly error?: string;
}

export interface ListOptions {
  readonly prefix?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly includeMetadata?: boolean;
}

export interface ListResult {
  readonly keys: readonly string[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly entries?: readonly RawEntry[];
}

// ============================================================
// Backend Interface
// ============================================================

export interface RawBackend {
  readonly name: string;
  readonly type: BackendType;

  store(key: string, data: Buffer, metadata: EntryMetadata): Promise<void>;
  retrieve(key: string): Promise<RawEntry | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  list(options?: ListOptions): Promise<ListResult>;
  clear(): Promise<void>;
  close(): Promise<void>;

  // Optional
  getStats?(): Promise<BackendStats>;
}

export type BackendType = 'file' | 'sqlite' | 'memory';

export interface BackendStats {
  readonly type: BackendType;
  readonly entryCount: number;
  readonly totalSize: number;
  readonly oldestEntry?: number;
  readonly newestEntry?: number;
}

// ============================================================
// Backend Configuration
// ============================================================

export interface FileBackendConfig {
  readonly rootDir: string;
  readonly clock: Clock;
}

export interface SQLiteBackendConfig {
  readonly dbPath: string;
  readonly clock: Clock;
}

export interface MemoryBackendConfig {
  readonly clock: Clock;
  readonly maxSize?: number;
}

// ============================================================
// Encryption Types
// ============================================================

export interface Keyring {
  getCurrentKey(): EncryptionKey;
  getKey(keyId: string): EncryptionKey | undefined;
  rotateKey(): EncryptionKey;
  getAllKeyIds(): readonly string[];
}

export interface EncryptionKey {
  readonly id: string;
  readonly key: Buffer;
  readonly createdAt: number;
  readonly algorithm: EncryptionAlgorithm;
}

export type EncryptionAlgorithm = 'aes-256-gcm';

export interface EncryptedData {
  readonly keyId: string;
  readonly iv: string;
  readonly data: string;
  readonly tag: string;
  readonly algorithm: EncryptionAlgorithm;
}

// ============================================================
// Compression Types
// ============================================================

export type CompressionAlgorithm = 'gzip' | 'none';

export interface CompressionResult {
  readonly data: Buffer;
  readonly algorithm: CompressionAlgorithm;
  readonly originalSize: number;
  readonly compressedSize: number;
}

// ============================================================
// Backup Types
// ============================================================

export interface BackupOptions {
  readonly destination: string;
  readonly compress?: boolean;
  readonly encrypt?: boolean;
}

export interface BackupResult {
  readonly success: boolean;
  readonly path: string;
  readonly entryCount: number;
  readonly size: number;
  readonly timestamp: number;
  readonly error?: string;
}

export interface RestoreOptions {
  readonly source: string;
  readonly overwrite?: boolean;
}

export interface RestoreResult {
  readonly success: boolean;
  readonly entryCount: number;
  readonly skipped: number;
  readonly error?: string;
}

// ============================================================
// Clock Interface (Determinism)
// ============================================================

export interface Clock {
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

export function mockClock(fixedTime: number): Clock {
  return { now: () => fixedTime };
}

// ============================================================
// RNG Interface (Determinism)
// ============================================================

export interface RNG {
  randomBytes(length: number): Buffer;
  randomId(): string;
}
