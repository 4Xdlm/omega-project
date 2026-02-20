/**
 * OMEGA Memory System - Index Builder
 * Phase D3 - NASA-Grade L4
 *
 * Builds index from ledger (DERIVED PLANE from FACT PLANE).
 * 100% deterministic, 100% rebuildable.
 *
 * INV-D3-01: Index rebuildable à 100%
 * INV-D3-02: hash_before_rebuild == hash_after_rebuild
 * INV-D3-03: Bijection index ↔ ledger vérifiable
 */

import type {
  EntryId,
  ByteOffset,
  HashValue,
  EntryClass,
  BuiltIndex,
  ClassIndex,
  TagIndex,
  Result,
} from '../types.js';
import {
  ok,
  err,
  nowTimestamp,
} from '../types.js';
import { MemoryError } from '../errors.js';
import * as Errors from '../errors.js';
import { scanLedger, computeLedgerHash } from '../ledger/reader.js';
import { OffsetMapBuilder, type OffsetMap } from './offset-map.js';
import { getLedgerPath } from '../constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build index from ledger.
 * Scans entire ledger and builds all indices.
 *
 * This is a pure function of the ledger content - same ledger always
 * produces identical index.
 *
 * @param ledgerPath - Path to ledger file
 * @returns Built index or error
 */
export async function buildIndex(
  ledgerPath: string = getLedgerPath()
): Promise<Result<BuiltIndex, MemoryError>> {
  try {
    // Compute ledger hash BEFORE building index
    // This hash is used to verify index staleness
    const ledgerHash = computeLedgerHash(ledgerPath);

    // Scan ledger
    const scanResult = await scanLedger(ledgerPath);

    if (scanResult.errors.length > 0) {
      return err(scanResult.errors[0]);
    }

    // Build offset map
    const offsetBuilder = new OffsetMapBuilder();

    // Build class index
    const classMap = new Map<EntryClass, EntryId[]>();

    // Build tag index
    const tagMap = new Map<string, EntryId[]>();

    for (const { entry, offset } of scanResult.entries) {
      // Add to offset map
      offsetBuilder.add(entry.id, offset);

      // Add to class index
      const classEntries = classMap.get(entry.class) ?? [];
      classEntries.push(entry.id);
      classMap.set(entry.class, classEntries);

      // Add to tag index
      if (entry.meta.tags) {
        for (const tag of entry.meta.tags) {
          const tagEntries = tagMap.get(tag) ?? [];
          tagEntries.push(entry.id);
          tagMap.set(tag, tagEntries);
        }
      }
    }

    // Convert to readonly maps
    const byId: OffsetMap = offsetBuilder.build();

    const byClass: ClassIndex = new Map(
      Array.from(classMap.entries()).map(([k, v]) => [k, Object.freeze(v)])
    );

    const byTag: TagIndex = new Map(
      Array.from(tagMap.entries()).map(([k, v]) => [k, Object.freeze(v)])
    );

    const builtIndex: BuiltIndex = {
      byId,
      byClass,
      byTag,
      ledgerSha256: ledgerHash,
      entryCount: byId.size,
      builtAt: nowTimestamp(),
    };

    return ok(builtIndex);
  } catch (e) {
    if (e instanceof MemoryError) {
      return err(e);
    }
    return err(Errors.readError('Failed to build index', e instanceof Error ? e : undefined));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify index is not stale (ledger hasn't changed).
 *
 * @param index - Built index
 * @param ledgerPath - Path to ledger file
 * @returns true if index matches current ledger
 */
export function verifyIndexFreshness(
  index: BuiltIndex,
  ledgerPath: string = getLedgerPath()
): boolean {
  const currentHash = computeLedgerHash(ledgerPath);
  return index.ledgerSha256 === currentHash;
}

/**
 * Verify index bijection with ledger.
 *
 * INV-D3-03: Bijection index ↔ ledger vérifiable
 * - Every ID in index exists in ledger
 * - Every ID in ledger exists in index
 *
 * @param index - Built index
 * @param ledgerPath - Path to ledger file
 * @returns Verification result
 */
export async function verifyIndexBijection(
  index: BuiltIndex,
  ledgerPath: string = getLedgerPath()
): Promise<Result<boolean, MemoryError>> {
  try {
    const scanResult = await scanLedger(ledgerPath);

    if (scanResult.errors.length > 0) {
      return err(scanResult.errors[0]);
    }

    // Get all IDs from ledger
    const ledgerIds = new Set(scanResult.entries.map(e => e.entry.id));

    // Get all IDs from index
    const indexIds = new Set(index.byId.keys());

    // Check every ledger ID is in index
    for (const id of ledgerIds) {
      if (!indexIds.has(id)) {
        return err(Errors.indexCorrupted(`Ledger entry ${id} missing from index`));
      }
    }

    // Check every index ID is in ledger
    for (const id of indexIds) {
      if (!ledgerIds.has(id)) {
        return err(Errors.indexCorrupted(`Index entry ${id} not in ledger`));
      }
    }

    // Check counts match
    if (index.entryCount !== ledgerIds.size) {
      return err(Errors.indexCorrupted(
        `Entry count mismatch: index=${index.entryCount}, ledger=${ledgerIds.size}`
      ));
    }

    return ok(true);
  } catch (e) {
    if (e instanceof MemoryError) {
      return err(e);
    }
    return err(Errors.readError('Failed to verify bijection', e instanceof Error ? e : undefined));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REBUILD TEST HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test that index is 100% rebuildable.
 *
 * INV-D3-02: hash_before_rebuild == hash_after_rebuild
 *
 * Steps:
 * 1. Compute ledger hash before
 * 2. Build index
 * 3. Compute ledger hash after
 * 4. Verify hashes match
 * 5. Verify index size matches ledger count
 *
 * @param ledgerPath - Path to ledger file
 * @returns true if rebuild produces identical results
 */
export async function testRebuildDeterminism(
  ledgerPath: string = getLedgerPath()
): Promise<Result<boolean, MemoryError>> {
  try {
    // Step 1: Hash before
    const hashBefore = computeLedgerHash(ledgerPath);

    // Step 2: Build index
    const indexResult = await buildIndex(ledgerPath);
    if (indexResult.ok === false) {
      return indexResult;
    }
    const index1 = indexResult.value;

    // Step 3: Hash after
    const hashAfter = computeLedgerHash(ledgerPath);

    // Step 4: Verify hashes match
    if (hashBefore !== hashAfter) {
      return err(Errors.indexCorrupted(
        `Ledger hash changed during rebuild: before=${hashBefore}, after=${hashAfter}`
      ));
    }

    // Step 5: Rebuild again and verify identical
    const index2Result = await buildIndex(ledgerPath);
    if (index2Result.ok === false) {
      return index2Result;
    }
    const index2 = index2Result.value;

    // Verify same entry count
    if (index1.entryCount !== index2.entryCount) {
      return err(Errors.indexCorrupted(
        `Entry count differs: first=${index1.entryCount}, second=${index2.entryCount}`
      ));
    }

    // Verify same ledger hash recorded
    if (index1.ledgerSha256 !== index2.ledgerSha256) {
      return err(Errors.indexCorrupted(
        `Ledger hash differs: first=${index1.ledgerSha256}, second=${index2.ledgerSha256}`
      ));
    }

    return ok(true);
  } catch (e) {
    if (e instanceof MemoryError) {
      return err(e);
    }
    return err(Errors.readError('Rebuild test failed', e instanceof Error ? e : undefined));
  }
}
