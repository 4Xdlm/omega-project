/**
 * OMEGA Memory System - Read API
 * Phase D2 - NASA-Grade L4
 *
 * Read-only operations on the memory ledger.
 * All operations are memory-bounded and streaming.
 * NO WRITE OPERATIONS - see write-api.ts (stub).
 */

import type {
  MemoryEntry,
  EntryId,
  HashValue,
  QueryOptions,
  QueryResult,
  IntegrityReport,
  Result,
  ByteOffset,
  BuiltIndex,
} from '../types.js';
import {
  ok,
  err,
  isOk,
  toEntryId,
} from '../types.js';
import { MemoryError } from '../errors.js';
import * as Errors from '../errors.js';
import {
  scanLedger,
  readLineAtOffset,
  verifyHashChain,
  computeLedgerHash,
  countEntries,
  getAllIds,
} from '../ledger/reader.js';
import { getLedgerPath, DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT } from '../constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// READ API INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Memory Read API - read-only operations on the ledger.
 * All operations are Result-based for explicit error handling.
 */
export interface MemoryReadApi {
  /**
   * Get entry by ID.
   * Uses index if available, falls back to scan.
   */
  getById(id: EntryId): Promise<Result<MemoryEntry, MemoryError>>;

  /**
   * Query entries with filters and pagination.
   * Memory-bounded, streaming implementation.
   */
  query(options?: QueryOptions): Promise<Result<QueryResult, MemoryError>>;

  /**
   * Verify ledger integrity (hash chain, no duplicates).
   */
  verifyIntegrity(): Promise<Result<IntegrityReport, MemoryError>>;

  /**
   * Get ledger hash for staleness checks.
   */
  getLedgerHash(): Result<HashValue, MemoryError>;

  /**
   * Count total entries without full parse.
   */
  countEntries(): Promise<Result<number, MemoryError>>;

  /**
   * Get all entry IDs (for index building).
   */
  getAllIds(): Promise<Result<readonly EntryId[], MemoryError>>;

  /**
   * Check if entry exists by ID.
   */
  exists(id: EntryId): Promise<Result<boolean, MemoryError>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// READ API IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a MemoryReadApi instance.
 *
 * @param ledgerPath - Path to ledger file (defaults to canonical path)
 * @param index - Optional pre-built index for fast lookups
 */
export function createMemoryReadApi(
  ledgerPath: string = getLedgerPath(),
  index?: BuiltIndex
): MemoryReadApi {

  return {
    async getById(id: EntryId): Promise<Result<MemoryEntry, MemoryError>> {
      try {
        // If index available, use offset lookup
        if (index) {
          const offset = index.byId.get(id);
          if (offset === undefined) {
            return err(Errors.entryNotFound(id));
          }
          return readLineAtOffset(offset, ledgerPath);
        }

        // Fallback: scan ledger
        const scanResult = await scanLedger(ledgerPath);

        for (const { entry } of scanResult.entries) {
          if (entry.id === id) {
            return ok(entry);
          }
        }

        return err(Errors.entryNotFound(id));
      } catch (e) {
        if (e instanceof MemoryError) {
          return err(e);
        }
        return err(Errors.readError(`Failed to get entry ${id}`, e instanceof Error ? e : undefined));
      }
    },

    async query(options: QueryOptions = {}): Promise<Result<QueryResult, MemoryError>> {
      try {
        const limit = Math.min(options.limit ?? DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT);
        const offset = options.offset ?? 0;

        const scanResult = await scanLedger(ledgerPath);

        if (scanResult.errors.length > 0) {
          return err(scanResult.errors[0]);
        }

        // Filter entries
        let filtered = scanResult.entries.map(se => se.entry);

        if (options.class) {
          filtered = filtered.filter(e => e.class === options.class);
        }

        if (options.author) {
          filtered = filtered.filter(e => e.author === options.author);
        }

        if (options.scope) {
          filtered = filtered.filter(e => e.scope === options.scope);
        }

        if (options.tags && options.tags.length > 0) {
          const requiredTags = new Set(options.tags);
          filtered = filtered.filter(e => {
            const entryTags = e.meta.tags ?? [];
            return Array.from(requiredTags).every(t => entryTags.includes(t));
          });
        }

        if (options.fromTs) {
          filtered = filtered.filter(e => e.ts_utc >= options.fromTs!);
        }

        if (options.toTs) {
          filtered = filtered.filter(e => e.ts_utc <= options.toTs!);
        }

        // Paginate
        const total = filtered.length;
        const paged = filtered.slice(offset, offset + limit);

        return ok({
          entries: paged,
          total,
          hasMore: offset + paged.length < total,
        });
      } catch (e) {
        if (e instanceof MemoryError) {
          return err(e);
        }
        return err(Errors.readError('Query failed', e instanceof Error ? e : undefined));
      }
    },

    async verifyIntegrity(): Promise<Result<IntegrityReport, MemoryError>> {
      try {
        const report = await verifyHashChain(ledgerPath);
        return ok(report);
      } catch (e) {
        if (e instanceof MemoryError) {
          return err(e);
        }
        return err(Errors.readError('Integrity verification failed', e instanceof Error ? e : undefined));
      }
    },

    getLedgerHash(): Result<HashValue, MemoryError> {
      try {
        const hash = computeLedgerHash(ledgerPath);
        return ok(hash);
      } catch (e) {
        if (e instanceof MemoryError) {
          return err(e);
        }
        return err(Errors.readError('Failed to compute ledger hash', e instanceof Error ? e : undefined));
      }
    },

    async countEntries(): Promise<Result<number, MemoryError>> {
      try {
        const count = await countEntries(ledgerPath);
        return ok(count);
      } catch (e) {
        if (e instanceof MemoryError) {
          return err(e);
        }
        return err(Errors.readError('Failed to count entries', e instanceof Error ? e : undefined));
      }
    },

    async getAllIds(): Promise<Result<readonly EntryId[], MemoryError>> {
      try {
        const ids = await getAllIds(ledgerPath);
        return ok(ids);
      } catch (e) {
        if (e instanceof MemoryError) {
          return err(e);
        }
        return err(Errors.readError('Failed to get all IDs', e instanceof Error ? e : undefined));
      }
    },

    async exists(id: EntryId): Promise<Result<boolean, MemoryError>> {
      try {
        // Fast path with index
        if (index) {
          return ok(index.byId.has(id));
        }

        // Slow path: scan
        const ids = await getAllIds(ledgerPath);
        return ok(ids.includes(id));
      } catch (e) {
        if (e instanceof MemoryError) {
          return err(e);
        }
        return err(Errors.readError(`Failed to check existence of ${id}`, e instanceof Error ? e : undefined));
      }
    },
  };
}
