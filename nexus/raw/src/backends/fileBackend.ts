/**
 * File Backend
 * Standard: NASA-Grade L4
 *
 * File-system based storage backend
 */

import { mkdir, readFile, writeFile, unlink, readdir, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type {
  RawBackend,
  RawEntry,
  EntryMetadata,
  ListOptions,
  ListResult,
  BackendStats,
  FileBackendConfig,
} from '../types.js';
import {
  RawStorageWriteError,
  RawStorageReadError,
  RawBackendInitError,
} from '../errors.js';
import { createSafePath, extractKey, getMetadataPath, isMetadataPath } from '../utils/paths.js';

// ============================================================
// File Backend Implementation
// ============================================================

export class FileBackend implements RawBackend {
  readonly name = 'file';
  readonly type = 'file' as const;

  private readonly config: FileBackendConfig;
  private initialized = false;

  constructor(config: FileBackendConfig) {
    this.config = config;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      await mkdir(this.config.rootDir, { recursive: true });
      this.initialized = true;
    } catch (error) {
      throw new RawBackendInitError('Failed to initialize file backend', {
        rootDir: this.config.rootDir,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async store(key: string, data: Buffer, metadata: EntryMetadata): Promise<void> {
    await this.ensureInitialized();

    const dataPath = createSafePath(this.config.rootDir, key);
    const metaPath = getMetadataPath(dataPath);

    try {
      // Ensure directory exists
      await mkdir(dirname(dataPath), { recursive: true });

      // Write data file atomically
      const tmpDataPath = `${dataPath}.tmp.${this.config.clock.now()}`;
      await writeFile(tmpDataPath, data);

      // Write metadata file
      const tmpMetaPath = `${metaPath}.tmp.${this.config.clock.now()}`;
      await writeFile(tmpMetaPath, JSON.stringify(metadata, null, 2));

      // Atomic rename (data first, then metadata)
      const { rename } = await import('node:fs/promises');
      await rename(tmpDataPath, dataPath);
      await rename(tmpMetaPath, metaPath);
    } catch (error) {
      throw new RawStorageWriteError('Failed to write file', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async retrieve(key: string): Promise<RawEntry | null> {
    await this.ensureInitialized();

    const dataPath = createSafePath(this.config.rootDir, key);
    const metaPath = getMetadataPath(dataPath);

    try {
      // Check if file exists
      if (!existsSync(dataPath)) {
        return null;
      }

      const [data, metaContent] = await Promise.all([
        readFile(dataPath),
        readFile(metaPath, 'utf-8'),
      ]);

      const metadata = JSON.parse(metaContent) as EntryMetadata;

      return Object.freeze({
        key,
        data,
        metadata,
      });
    } catch (error) {
      // File not found is not an error, just return null
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      throw new RawStorageReadError('Failed to read file', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureInitialized();

    const dataPath = createSafePath(this.config.rootDir, key);
    const metaPath = getMetadataPath(dataPath);

    try {
      if (!existsSync(dataPath)) {
        return false;
      }

      await Promise.all([
        unlink(dataPath).catch(() => {}),
        unlink(metaPath).catch(() => {}),
      ]);

      return true;
    } catch {
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureInitialized();

    const dataPath = createSafePath(this.config.rootDir, key);
    return existsSync(dataPath);
  }

  async list(options: ListOptions = {}): Promise<ListResult> {
    await this.ensureInitialized();

    const allKeys = await this.walkDirectory(this.config.rootDir);
    let keys = allKeys.sort(); // Deterministic order

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
      entries = [];
      for (const key of paginatedKeys) {
        const entry = await this.retrieve(key);
        if (entry) {
          entries.push(entry);
        }
      }
    }

    return Object.freeze({
      keys: Object.freeze(paginatedKeys),
      total,
      hasMore,
      entries: entries ? Object.freeze(entries) : undefined,
    });
  }

  private async walkDirectory(dir: string, prefix = ''): Promise<string[]> {
    const keys: string[] = [];

    try {
      const items = await readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

        if (item.isDirectory()) {
          const subKeys = await this.walkDirectory(
            `${dir}/${item.name}`,
            itemPath
          );
          keys.push(...subKeys);
        } else if (item.isFile() && !isMetadataPath(item.name)) {
          keys.push(itemPath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return keys;
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    try {
      await rm(this.config.rootDir, { recursive: true, force: true });
      await mkdir(this.config.rootDir, { recursive: true });
    } catch {
      // Ignore errors during clear
    }
  }

  async close(): Promise<void> {
    // No resources to clean up
  }

  async getStats(): Promise<BackendStats> {
    await this.ensureInitialized();

    const keys = await this.walkDirectory(this.config.rootDir);
    let totalSize = 0;
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    for (const key of keys) {
      const entry = await this.retrieve(key);
      if (entry) {
        totalSize += entry.data.length;

        const createdAt = entry.metadata.createdAt;
        if (oldestEntry === undefined || createdAt < oldestEntry) {
          oldestEntry = createdAt;
        }
        if (newestEntry === undefined || createdAt > newestEntry) {
          newestEntry = createdAt;
        }
      }
    }

    return Object.freeze({
      type: 'file' as const,
      entryCount: keys.length,
      totalSize,
      oldestEntry,
      newestEntry,
    });
  }
}
