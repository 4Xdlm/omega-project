/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA LOOM — PUBLIC EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Phase: R1 — Loom v1 Minimal
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Types (contrat gelé)
export type {
  LoomBookId,
  LoomSceneId,
  LoomCharacterEntry,
  LoomThreadEntry,
  LoomSceneEntry,
  LoomMotifEntry,
  LoomArcEntry,
  LoomContext,
  LoomSceneReference,
  LoomRetrievalMetadata,
  LoomReadInput,
  LoomWriteInput,
  LoomWriteReceipt,
  LoomAdapter,
  LoomStoreStats,
  LoomEnrichedContinuity,
} from './loom-types.js';

// Config
export { getLoomConfig, resolveLoomConfig, resetLoomConfig } from './loom-config.js';
export type { LoomConfig } from './loom-config.js';

// Adapters
export { NullLoomAdapter, InMemoryLoomAdapter, EMPTY_LOOM_CONTEXT } from './loom-adapter.js';

// Reader
export { enrichPacketWithLoom, mergeContinuity, buildLoomReadInput } from './loom-reader.js';

// Writer
export { updateLoomFromSealedProse } from './loom-writer.js';
export type { LoomWriteContext } from './loom-writer.js';

// ChromaDB Adapter (R2+ — quand plateforme stabilisée)
export { ChromaLoomAdapter, createChromaLoomAdapter } from './loom-chromadb-adapter.js';

// JSON File Adapter (R1 — backend réel par défaut)
export { JsonFileLoomAdapter, createJsonFileLoomAdapter } from './jsonfile-loom-adapter.js';

// Backend ID type
export type { LoomBackendId } from './loom-types.js';
