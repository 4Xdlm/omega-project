/**
 * OMEGA V2.1 — Chunking Adaptatif Main Entry
 *
 * Sprint V2.1 scaffolding (2026-05-26) — STUB IMPLEMENTATION
 * Production implementation requires Sprint V2.1 dedicated execution.
 *
 * Status: SCAFFOLDING_NOT_PRODUCTION
 */

import type { Chunk, ChunkConfig } from './types.js';
import { ChunkingError, DEFAULT_ADAPTIVE_CONFIG } from './types.js';

/**
 * Adaptive chunking entry point.
 *
 * STUB — Sprint V2.1 implementation pending.
 * Will use EmotionalArcDetector + ChunkBoundaryOptimizer.
 *
 * @param text - Chapter raw text
 * @param config - Chunking configuration (defaults to adaptive)
 * @returns Array of adaptive chunks
 * @throws ChunkingError if input invalid or implementation pending
 */
export function chunkAdaptive(
  text: string,
  _config: ChunkConfig = DEFAULT_ADAPTIVE_CONFIG
): readonly Chunk[] {
  if (!text || text.trim().length === 0) {
    throw new ChunkingError('Input text is empty', 'EMPTY_INPUT');
  }

  // SCAFFOLDING ONLY — production logic Sprint V2.1
  throw new ChunkingError(
    'chunkAdaptive() not yet implemented — Sprint V2.1 execution pending. ' +
      'Fall back to chunkFixed() until V2.1 sealed.',
    'NOT_IMPLEMENTED',
    { sprint: 'V2.1', adr: 'ADR_V2.1_CHUNKING_ADAPTATIF_2026-05-26.md' }
  );
}

/**
 * Convenience helper to detect if adaptive mode is production-ready.
 * Used by K2 pipeline to fallback to fixed mode if false.
 */
export function isAdaptiveModeReady(): boolean {
  return false; // Sprint V2.1 production gate
}
