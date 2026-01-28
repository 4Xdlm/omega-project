/**
 * OMEGA Memory System - Offset Map
 * Phase D3 - NASA-Grade L4
 *
 * Maps entry IDs to byte offsets in the ledger.
 * Part of the DERIVED PLANE - 100% rebuildable from FACT PLANE.
 *
 * INV-D3-05: Offset map couvre 100% des entrées
 */

import type { EntryId, ByteOffset, HashValue } from '../types.js';
import { toByteOffset } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// OFFSET MAP TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Offset map: EntryId -> ByteOffset
 * Immutable after construction.
 */
export type OffsetMap = ReadonlyMap<EntryId, ByteOffset>;

/**
 * Mutable builder for OffsetMap.
 */
export class OffsetMapBuilder {
  private readonly map: Map<EntryId, ByteOffset> = new Map();

  /**
   * Add an entry to the offset map.
   * @throws if duplicate ID detected
   */
  add(id: EntryId, offset: ByteOffset): void {
    if (this.map.has(id)) {
      throw new Error(`Duplicate entry ID in offset map: ${id}`);
    }
    this.map.set(id, offset);
  }

  /**
   * Get current size.
   */
  get size(): number {
    return this.map.size;
  }

  /**
   * Check if ID exists.
   */
  has(id: EntryId): boolean {
    return this.map.has(id);
  }

  /**
   * Build immutable OffsetMap.
   */
  build(): OffsetMap {
    return new Map(this.map);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFSET MAP OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get offset for an entry ID.
 * @returns offset or undefined if not found
 */
export function getOffset(map: OffsetMap, id: EntryId): ByteOffset | undefined {
  return map.get(id);
}

/**
 * Check if ID exists in offset map.
 */
export function hasEntry(map: OffsetMap, id: EntryId): boolean {
  return map.has(id);
}

/**
 * Get all entry IDs in the offset map.
 */
export function getAllEntryIds(map: OffsetMap): readonly EntryId[] {
  return Array.from(map.keys());
}

/**
 * Get count of entries in the offset map.
 */
export function getEntryCount(map: OffsetMap): number {
  return map.size;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize offset map to JSON-compatible object.
 * Keys are sorted for deterministic output.
 */
export function serializeOffsetMap(map: OffsetMap): Record<string, number> {
  const entries = Array.from(map.entries());
  entries.sort((a, b) => a[0].localeCompare(b[0]));

  const result: Record<string, number> = {};
  for (const [id, offset] of entries) {
    result[id] = offset;
  }
  return result;
}

/**
 * Deserialize offset map from JSON object.
 */
export function deserializeOffsetMap(obj: Record<string, number>): OffsetMap {
  const builder = new OffsetMapBuilder();
  for (const [id, offset] of Object.entries(obj)) {
    builder.add(id as EntryId, toByteOffset(offset));
  }
  return builder.build();
}
