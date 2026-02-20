/**
 * OMEGA Memory System - API Barrel Export
 * Phase D2 - NASA-Grade L4
 */

export {
  type MemoryReadApi,
  createMemoryReadApi,
} from './read-api.js';

export {
  type MemoryWriteApi,
  createMemoryWriteApi,
  createWriteBlockedError,
  SENTINEL_STATUS,
  isWriteBlocked,
  assertWriteBlocked,
} from './write-api.js';
