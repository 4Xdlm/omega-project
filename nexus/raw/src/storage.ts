/**
 * Raw Storage Facade
 * Standard: NASA-Grade L4
 *
 * Unified API for raw data storage with encryption, compression, and TTL
 */

import type {
  RawBackend,
  RawEntry,
  EntryMetadata,
  StoreOptions,
  ListOptions,
  ListResult,
  BackendStats,
  Clock,
  Keyring,
} from './types.js';
import {
  RawStorageNotFoundError,
  RawTTLExpiredError,
} from './errors.js';
import { compress, decompress, isGzipCompressed } from './utils/compression.js';
import { encrypt, decrypt, serializeEncrypted, deserializeEncrypted, systemRNG } from './utils/encryption.js';
import { computeChecksum, assertChecksum } from './utils/checksum.js';
import { sanitizeKey } from './utils/paths.js';
import type { RNG } from './types.js';

// ============================================================
// Storage Configuration
// ============================================================

export interface RawStorageConfig {
  readonly backend: RawBackend;
  readonly clock: Clock;
  readonly keyring?: Keyring;
  readonly rng?: RNG;
  readonly defaultCompress?: boolean;
  readonly defaultEncrypt?: boolean;
  readonly defaultTTL?: number;
}

// ============================================================
// Raw Storage
// ============================================================

export class RawStorage {
  private readonly backend: RawBackend;
  private readonly clock: Clock;
  private readonly keyring?: Keyring;
  private readonly rng: RNG;
  private readonly defaultCompress: boolean;
  private readonly defaultEncrypt: boolean;
  private readonly defaultTTL?: number;

  constructor(config: RawStorageConfig) {
    this.backend = config.backend;
    this.clock = config.clock;
    this.keyring = config.keyring;
    this.rng = config.rng ?? systemRNG;
    this.defaultCompress = config.defaultCompress ?? false;
    this.defaultEncrypt = config.defaultEncrypt ?? false;
    this.defaultTTL = config.defaultTTL;
  }

  // ============================================================
  // Store
  // ============================================================

  async store(key: string, data: Buffer, options: StoreOptions = {}): Promise<void> {
    // Validate key for security (defense-in-depth)
    const safeKey = sanitizeKey(key);

    const shouldCompress = options.compress ?? this.defaultCompress;
    const shouldEncrypt = options.encrypt ?? this.defaultEncrypt;
    const ttl = options.ttl ?? this.defaultTTL;

    let processedData = data;
    let compressed = false;
    let encrypted = false;

    // Compress first (before encryption)
    if (shouldCompress) {
      const compressionResult = await compress(data);
      processedData = compressionResult.data;
      compressed = true;
    }

    // Encrypt
    if (shouldEncrypt) {
      if (!this.keyring) {
        throw new Error('Encryption requested but no keyring configured');
      }
      const encryptedData = encrypt(processedData, this.keyring.getCurrentKey(), this.rng);
      processedData = Buffer.from(serializeEncrypted(encryptedData), 'utf-8');
      encrypted = true;
    }

    const now = this.clock.now();
    const checksum = computeChecksum(processedData);

    const metadata: EntryMetadata = Object.freeze({
      createdAt: now,
      updatedAt: now,
      expiresAt: ttl ? now + ttl : null,
      compressed,
      encrypted,
      size: processedData.length,
      checksum,
      custom: options.metadata ? Object.freeze({ ...options.metadata }) : undefined,
    });

    await this.backend.store(safeKey, processedData, metadata);
  }

  // ============================================================
  // Retrieve
  // ============================================================

  async retrieve(key: string): Promise<Buffer> {
    // Validate key for security (defense-in-depth)
    const safeKey = sanitizeKey(key);

    const entry = await this.backend.retrieve(safeKey);

    if (!entry) {
      throw new RawStorageNotFoundError(`Key not found: ${safeKey}`, { key: safeKey });
    }

    // Check TTL
    if (entry.metadata.expiresAt !== null) {
      const now = this.clock.now();
      if (now > entry.metadata.expiresAt) {
        // Entry expired - delete it and throw
        await this.backend.delete(safeKey);
        throw new RawTTLExpiredError(`Entry expired: ${safeKey}`, {
          key: safeKey,
          expiresAt: entry.metadata.expiresAt,
          now,
        });
      }
    }

    // Verify checksum
    assertChecksum(entry.data, entry.metadata.checksum, { key });

    let data = entry.data;

    // Decrypt
    if (entry.metadata.encrypted) {
      if (!this.keyring) {
        throw new Error('Entry is encrypted but no keyring configured');
      }
      const encryptedData = deserializeEncrypted(data.toString('utf-8'));
      data = decrypt(encryptedData, this.keyring);
    }

    // Decompress
    if (entry.metadata.compressed) {
      data = await decompress(data);
    }

    return data;
  }

  // ============================================================
  // Retrieve with Metadata
  // ============================================================

  async retrieveWithMetadata(key: string): Promise<{ data: Buffer; metadata: EntryMetadata }> {
    const data = await this.retrieve(key);
    const entry = await this.backend.retrieve(key);

    return {
      data,
      metadata: entry!.metadata,
    };
  }

  // ============================================================
  // Delete
  // ============================================================

  async delete(key: string): Promise<boolean> {
    // Validate key for security (defense-in-depth)
    const safeKey = sanitizeKey(key);
    return this.backend.delete(safeKey);
  }

  // ============================================================
  // Exists
  // ============================================================

  async exists(key: string): Promise<boolean> {
    // Validate key for security (defense-in-depth)
    const safeKey = sanitizeKey(key);

    const entry = await this.backend.retrieve(safeKey);
    if (!entry) {
      return false;
    }

    // Check TTL
    if (entry.metadata.expiresAt !== null) {
      const now = this.clock.now();
      if (now > entry.metadata.expiresAt) {
        // Entry expired - delete it
        await this.backend.delete(safeKey);
        return false;
      }
    }

    return true;
  }

  // ============================================================
  // List
  // ============================================================

  async list(options: ListOptions = {}): Promise<ListResult> {
    return this.backend.list(options);
  }

  // ============================================================
  // Clear
  // ============================================================

  async clear(): Promise<void> {
    await this.backend.clear();
  }

  // ============================================================
  // Close
  // ============================================================

  async close(): Promise<void> {
    await this.backend.close();
  }

  // ============================================================
  // Stats
  // ============================================================

  async getStats(): Promise<BackendStats | undefined> {
    return this.backend.getStats?.();
  }

  // ============================================================
  // TTL Cleanup
  // ============================================================

  async cleanupExpired(): Promise<number> {
    const now = this.clock.now();
    let cleaned = 0;

    const result = await this.backend.list({ includeMetadata: true });
    if (!result.entries) {
      return 0;
    }

    for (const entry of result.entries) {
      if (entry.metadata.expiresAt !== null && now > entry.metadata.expiresAt) {
        await this.backend.delete(entry.key);
        cleaned++;
      }
    }

    return cleaned;
  }

  // ============================================================
  // Getters
  // ============================================================

  getBackendName(): string {
    return this.backend.name;
  }

  getBackendType(): string {
    return this.backend.type;
  }
}
