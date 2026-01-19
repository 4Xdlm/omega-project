/**
 * Memory Backend
 * Standard: NASA-Grade L4
 *
 * In-memory storage backend for testing and caching
 */

import type {
  RawBackend,
  RawEntry,
  EntryMetadata,
  ListOptions,
  ListResult,
  BackendStats,
  MemoryBackendConfig,
} from '../types.js';
import { RawStorageQuotaError } from '../errors.js';

// ============================================================
// Memory Backend Implementation
// ============================================================

export class MemoryBackend implements RawBackend {
  readonly name = 'memory';
  readonly type = 'memory' as const;

  private readonly entries: Map<string, RawEntry> = new Map();
  private readonly config: MemoryBackendConfig;
  private totalSize = 0;

  constructor(config: MemoryBackendConfig) {
    this.config = config;
  }

  async store(key: string, data: Buffer, metadata: EntryMetadata): Promise<void> {
    // Check quota
    const existing = this.entries.get(key);
    const existingSize = existing?.data.length ?? 0;
    const newSize = this.totalSize - existingSize + data.length;

    if (this.config.maxSize && newSize > this.config.maxSize) {
      throw new RawStorageQuotaError('Memory quota exceeded', {
        maxSize: this.config.maxSize,
        currentSize: this.totalSize,
        requestedSize: data.length,
      });
    }

    const entry: RawEntry = Object.freeze({
      key,
      data,
      metadata,
    });

    this.entries.set(key, entry);
    this.totalSize = newSize;
  }

  async retrieve(key: string): Promise<RawEntry | null> {
    const entry = this.entries.get(key);
    return entry ?? null;
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.entries.get(key);
    if (!entry) {
      return false;
    }

    this.totalSize -= entry.data.length;
    this.entries.delete(key);
    return true;
  }

  async exists(key: string): Promise<boolean> {
    return this.entries.has(key);
  }

  async list(options: ListOptions = {}): Promise<ListResult> {
    let keys = [...this.entries.keys()].sort(); // Deterministic order

    // Apply prefix filter
    if (options.prefix) {
      keys = keys.filter((key) => key.startsWith(options.prefix!));
    }

    const total = keys.length;

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? keys.length;
    const paginatedKeys = keys.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    // Include entries if requested
    let entries: RawEntry[] | undefined;
    if (options.includeMetadata) {
      entries = paginatedKeys
        .map((key) => this.entries.get(key)!)
        .filter(Boolean);
    }

    return Object.freeze({
      keys: Object.freeze(paginatedKeys),
      total,
      hasMore,
      entries: entries ? Object.freeze(entries) : undefined,
    });
  }

  async clear(): Promise<void> {
    this.entries.clear();
    this.totalSize = 0;
  }

  async close(): Promise<void> {
    // No resources to clean up
  }

  async getStats(): Promise<BackendStats> {
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    for (const entry of this.entries.values()) {
      const createdAt = entry.metadata.createdAt;
      if (oldestEntry === undefined || createdAt < oldestEntry) {
        oldestEntry = createdAt;
      }
      if (newestEntry === undefined || createdAt > newestEntry) {
        newestEntry = createdAt;
      }
    }

    return Object.freeze({
      type: 'memory' as const,
      entryCount: this.entries.size,
      totalSize: this.totalSize,
      oldestEntry,
      newestEntry,
    });
  }
}
