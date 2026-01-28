/**
 * OMEGA Memory System - Index Module
 * Phase D3 - NASA-Grade L4
 *
 * Barrel export for index functionality.
 */

// Offset Map
export {
  type OffsetMap,
  OffsetMapBuilder,
  getOffset,
  hasEntry,
  getAllEntryIds,
  getEntryCount,
  serializeOffsetMap,
  deserializeOffsetMap,
} from './offset-map.js';

// Index Builder
export {
  buildIndex,
  verifyIndexFreshness,
  verifyIndexBijection,
  testRebuildDeterminism,
} from './index-builder.js';

// Index Persistence
export {
  saveIndex,
  loadIndex,
  indexExists,
  loadIndexMeta,
} from './index-persistence.js';
