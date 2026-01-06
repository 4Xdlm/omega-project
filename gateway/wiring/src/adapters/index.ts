// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — ADAPTERS INDEX
// Version: 1.0.0
// Date: 06 janvier 2026
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Memory Adapter ───────────────────────────────────────────────────────────
export type {
  MemoryStack,
  MemoryWritePayload,
  MemoryReadLatestPayload,
  MemoryReadByHashPayload,
  MemoryListKeysPayload,
  MemoryWriteResponse,
  MemoryReadLatestResponse,
  MemoryReadByHashResponse,
  MemoryListKeysResponse,
  MemorySchema,
} from './memory_adapter.js';

export {
  MemoryAdapter,
  MEMORY_SCHEMAS,
  createMemoryAdapter,
} from './memory_adapter.js';

// ─── Query Adapter ────────────────────────────────────────────────────────────
export type {
  QueryEngine,
  QuerySearchPayload,
  QueryFindPayload,
  QueryAggregatePayload,
  QueryAnalyzePayload,
  QuerySearchResponse,
  QueryAggregateResponse,
  QueryAnalyzeResponse,
  QueryAdapterConfig,
  QuerySchema,
} from './query_adapter.js';

export {
  QueryAdapter,
  QUERY_SCHEMAS,
  createQueryAdapter,
} from './query_adapter.js';
