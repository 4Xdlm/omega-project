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
