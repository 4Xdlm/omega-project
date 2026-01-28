/**
 * OMEGA Memory System - Write API (STUB)
 * Phase D2 - NASA-Grade L4
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   D-WRITE-BLOCK RULE (PHASE D)                                                ║
 * ║                                                                               ║
 * ║   All WRITE operations are BLOCKED until Sentinel is implemented.            ║
 * ║   Every function in this file:                                                ║
 * ║   - EXISTS as a signature only                                                ║
 * ║   - THROWS MemoryError with code PERMISSION_DENIED                            ║
 * ║   - NEVER writes any byte to the FACT PLANE                                   ║
 * ║                                                                               ║
 * ║   This is NOT a temporary limitation - it is a SECURITY GATE.                 ║
 * ║   Write operations require Sentinel authorization (Phase C).                  ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { MemoryEntry, EntryId, Result } from '../types.js';
import { MemoryError } from '../errors.js';
import { MEMORY_ERROR_CODES } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE BLOCKED ERROR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Error thrown when any write operation is attempted in Phase D.
 * This is a security boundary - not a bug.
 */
export function createWriteBlockedError(operation: string): MemoryError {
  return new MemoryError(
    MEMORY_ERROR_CODES.AUTHORITY_DENIED,
    `WRITE_BLOCKED_UNTIL_SENTINEL: Operation "${operation}" denied. ` +
    `Write operations require Sentinel authorization (not implemented in Phase D). ` +
    `This is a security boundary, not a bug.`,
    {
      lineNumber: null,
      entryId: null,
      cause: null,
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE API INTERFACE (STUB)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Memory Write API - STUB for Phase D.
 *
 * All methods throw PERMISSION_DENIED.
 * Will be implemented in Phase C when Sentinel is available.
 */
export interface MemoryWriteApi {
  /**
   * Create a new entry in the ledger.
   * STUB: throws PERMISSION_DENIED in Phase D.
   *
   * @param entry - Entry data (id and hash will be computed)
   * @returns Never - always throws
   */
  create(entry: Omit<MemoryEntry, 'id'>): Promise<never>;

  /**
   * Append data to existing entry (if entry type supports it).
   * STUB: throws PERMISSION_DENIED in Phase D.
   *
   * @param id - Entry ID to append to
   * @param data - Data to append
   * @returns Never - always throws
   */
  append(id: EntryId, data: unknown): Promise<never>;

  /**
   * Seal an entry (mark as immutable).
   * STUB: throws PERMISSION_DENIED in Phase D.
   *
   * @param id - Entry ID to seal
   * @returns Never - always throws
   */
  seal(id: EntryId): Promise<never>;

  /**
   * Create a superseding entry (correction).
   * STUB: throws PERMISSION_DENIED in Phase D.
   *
   * @param originalId - ID of entry being superseded
   * @param entry - New entry data
   * @returns Never - always throws
   */
  supersede(originalId: EntryId, entry: Omit<MemoryEntry, 'id'>): Promise<never>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE API IMPLEMENTATION (STUB - ALL DENY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a MemoryWriteApi instance.
 *
 * In Phase D, all operations throw PERMISSION_DENIED.
 * This is intentional and enforces the Sentinel boundary.
 */
export function createMemoryWriteApi(): MemoryWriteApi {
  return {
    async create(_entry: Omit<MemoryEntry, 'id'>): Promise<never> {
      throw createWriteBlockedError('create');
    },

    async append(_id: EntryId, _data: unknown): Promise<never> {
      throw createWriteBlockedError('append');
    },

    async seal(_id: EntryId): Promise<never> {
      throw createWriteBlockedError('seal');
    },

    async supersede(_originalId: EntryId, _entry: Omit<MemoryEntry, 'id'>): Promise<never> {
      throw createWriteBlockedError('supersede');
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE BLOCKED ASSERTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sentinel status for Phase D.
 * Used by governance layer to check if writes are allowed.
 */
export const SENTINEL_STATUS = 'NOT_IMPLEMENTED' as const;

/**
 * Check if writes are currently blocked.
 * In Phase D, this always returns true.
 */
export function isWriteBlocked(): boolean {
  return SENTINEL_STATUS === 'NOT_IMPLEMENTED';
}

/**
 * Assert that writes are blocked.
 * Throws if Sentinel is somehow marked as implemented (should never happen in Phase D).
 */
export function assertWriteBlocked(): void {
  if (!isWriteBlocked()) {
    throw new Error(
      'INVARIANT VIOLATION: SENTINEL_STATUS is not NOT_IMPLEMENTED in Phase D. ' +
      'This indicates a critical configuration error.'
    );
  }
}
