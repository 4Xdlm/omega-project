/**
 * OMEGA Memory System - Index Persistence
 * Phase D3 - NASA-Grade L4
 *
 * Save/load index to/from DERIVED PLANE.
 * Index files are NOT canonical - purely for performance.
 * Can be deleted and rebuilt at any time.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import type {
  BuiltIndex,
  ClassIndex,
  TagIndex,
  EntryId,
  ByteOffset,
  EntryClass,
  HashValue,
  Timestamp,
  Result,
  IndexMeta,
} from '../types.js';
import {
  ok,
  err,
  toByteOffset,
  toHashValue,
  toTimestamp,
  toEntryId,
} from '../types.js';
import { MemoryError } from '../errors.js';
import * as Errors from '../errors.js';
import { getIndexDir, INDEX_FILES } from '../constants.js';
import {
  serializeOffsetMap,
  deserializeOffsetMap,
  type OffsetMap,
} from './offset-map.js';
import { stableJSON } from '../hash.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZED INDEX TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SerializedIndexMeta {
  ledgerSha256: string;
  entryCount: number;
  builtAt: string;
}

interface SerializedClassIndex {
  [className: string]: string[];
}

interface SerializedTagIndex {
  [tag: string]: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAVE INDEX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save built index to disk.
 *
 * Saves to multiple files for efficient partial loading:
 * - by_id.offset.json: ID -> offset map
 * - by_class.ids.json: class -> ID list
 * - by_tag.ids.json: tag -> ID list
 * - index.meta.json: metadata (hash, count, timestamp)
 *
 * @param index - Built index to save
 * @param indexDir - Directory to save to (defaults to derived plane)
 */
export function saveIndex(
  index: BuiltIndex,
  indexDir: string = getIndexDir()
): Result<void, MemoryError> {
  try {
    // Ensure directory exists
    if (!existsSync(indexDir)) {
      mkdirSync(indexDir, { recursive: true });
    }

    // Save offset map
    const offsetData = serializeOffsetMap(index.byId);
    writeFileSync(
      join(indexDir, INDEX_FILES.BY_ID),
      stableJSON(offsetData),
      'utf8'
    );

    // Save class index
    const classData: SerializedClassIndex = {};
    for (const [cls, ids] of index.byClass) {
      classData[cls] = [...ids];
    }
    writeFileSync(
      join(indexDir, INDEX_FILES.BY_CLASS),
      stableJSON(classData),
      'utf8'
    );

    // Save tag index
    const tagData: SerializedTagIndex = {};
    for (const [tag, ids] of index.byTag) {
      tagData[tag] = [...ids];
    }
    writeFileSync(
      join(indexDir, INDEX_FILES.BY_TAG),
      stableJSON(tagData),
      'utf8'
    );

    // Save metadata
    const metaData: SerializedIndexMeta = {
      ledgerSha256: index.ledgerSha256,
      entryCount: index.entryCount,
      builtAt: index.builtAt,
    };
    writeFileSync(
      join(indexDir, INDEX_FILES.META),
      stableJSON(metaData),
      'utf8'
    );

    return ok(undefined);
  } catch (e) {
    return err(Errors.writeError(
      `Failed to save index to ${indexDir}`,
      e instanceof Error ? e : undefined
    ));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD INDEX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load built index from disk.
 *
 * @param indexDir - Directory to load from
 * @returns Loaded index or error
 */
export function loadIndex(
  indexDir: string = getIndexDir()
): Result<BuiltIndex, MemoryError> {
  try {
    // Check all files exist
    const requiredFiles = [
      INDEX_FILES.BY_ID,
      INDEX_FILES.BY_CLASS,
      INDEX_FILES.BY_TAG,
      INDEX_FILES.META,
    ];

    for (const file of requiredFiles) {
      const path = join(indexDir, file);
      if (!existsSync(path)) {
        return err(Errors.fileNotFound(path));
      }
    }

    // Load offset map
    const offsetRaw = readFileSync(join(indexDir, INDEX_FILES.BY_ID), 'utf8');
    const offsetData = JSON.parse(offsetRaw) as Record<string, number>;
    const byId = deserializeOffsetMap(offsetData);

    // Load class index
    const classRaw = readFileSync(join(indexDir, INDEX_FILES.BY_CLASS), 'utf8');
    const classData = JSON.parse(classRaw) as SerializedClassIndex;
    const byClass: ClassIndex = new Map(
      Object.entries(classData).map(([cls, ids]) => [
        cls as EntryClass,
        Object.freeze(ids as EntryId[]),
      ])
    );

    // Load tag index
    const tagRaw = readFileSync(join(indexDir, INDEX_FILES.BY_TAG), 'utf8');
    const tagData = JSON.parse(tagRaw) as SerializedTagIndex;
    const byTag: TagIndex = new Map(
      Object.entries(tagData).map(([tag, ids]) => [
        tag,
        Object.freeze(ids as EntryId[]),
      ])
    );

    // Load metadata
    const metaRaw = readFileSync(join(indexDir, INDEX_FILES.META), 'utf8');
    const metaData = JSON.parse(metaRaw) as SerializedIndexMeta;

    const index: BuiltIndex = {
      byId,
      byClass,
      byTag,
      ledgerSha256: toHashValue(metaData.ledgerSha256),
      entryCount: metaData.entryCount,
      builtAt: toTimestamp(metaData.builtAt),
    };

    return ok(index);
  } catch (e) {
    if (e instanceof MemoryError) {
      return err(e);
    }
    return err(Errors.readError(
      `Failed to load index from ${indexDir}`,
      e instanceof Error ? e : undefined
    ));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDEX EXISTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if index exists on disk.
 */
export function indexExists(indexDir: string = getIndexDir()): boolean {
  return existsSync(join(indexDir, INDEX_FILES.META));
}

/**
 * Load just the index metadata (for staleness checks).
 */
export function loadIndexMeta(
  indexDir: string = getIndexDir()
): Result<IndexMeta, MemoryError> {
  try {
    const metaPath = join(indexDir, INDEX_FILES.META);
    if (!existsSync(metaPath)) {
      return err(Errors.fileNotFound(metaPath));
    }

    const metaRaw = readFileSync(metaPath, 'utf8');
    const metaData = JSON.parse(metaRaw) as SerializedIndexMeta;

    return ok({
      ledgerSha256: toHashValue(metaData.ledgerSha256),
      entryCount: metaData.entryCount,
      builtAt: toTimestamp(metaData.builtAt),
    });
  } catch (e) {
    if (e instanceof MemoryError) {
      return err(e);
    }
    return err(Errors.readError(
      `Failed to load index metadata`,
      e instanceof Error ? e : undefined
    ));
  }
}
