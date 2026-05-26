/**
 * OMEGA V2.2 — Embeddings Sémantiques Types
 *
 * Sprint V2.2 scaffolding (2026-05-26) — Pre-implementation interfaces
 * Reference ADR : Claude-Workspace/OMEGA/outputs/ADR_V2.2_EMBEDDINGS_2026-05-26.md
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

export type EmbeddingModel =
  | 'paraphrase-multilingual-MiniLM-L12-v2'
  | 'all-MiniLM-L6-v2'
  | 'nomic-embed-text' // Ollama local model — V2.2 PIVOT 2026-05-26
  | 'custom';

export interface EmbedderConfig {
  readonly model: EmbeddingModel;
  readonly dimensions: number;
  readonly cache_dir: string;
  readonly batch_size: number;
  readonly use_cache: boolean;
}

export const DEFAULT_EMBEDDER_CONFIG: EmbedderConfig = {
  model: 'paraphrase-multilingual-MiniLM-L12-v2',
  dimensions: 384,
  cache_dir: '.omega-cache/embeddings',
  batch_size: 32,
  use_cache: true,
};

export interface EmbeddingResult {
  readonly text: string;
  readonly vector: Float32Array;
  readonly model: EmbeddingModel;
  readonly dimensions: number;
  readonly computed_at: number; // timestamp ms
  readonly cache_hit: boolean;
}

export interface ContinuityScore {
  readonly score: number; // 0-1, higher = more continuous
  readonly pair_scores: readonly number[]; // cosine sim per adjacent pair
  readonly chunk_count: number;
}

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}
