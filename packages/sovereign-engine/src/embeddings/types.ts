/**
 * OMEGA V2.2 — Embeddings Sémantiques Types
 *
 * Sprint V2.2 scaffolding (2026-05-26) — Pre-implementation interfaces
 * Reference ADR : Claude-Workspace/OMEGA/outputs/ADR_V2.2_EMBEDDINGS_2026-05-26.md
 *
 * V2.2-B.2.1 (2026-05-28): ContinuityScore enriched with min_pair_score,
 * std_pair_score, first_last_score for boundary detection on long books.
 * Background: mean continuity metric saturates ~0.95 on sub-chunked long
 * books, hiding semantic ruptures. Enriched metrics preserve discrimination.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

export type EmbeddingModel =
  | 'paraphrase-multilingual-MiniLM-L12-v2'
  | 'all-MiniLM-L6-v2'
  | 'nomic-embed-text'
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
  readonly computed_at: number;
  readonly cache_hit: boolean;
}

/**
 * Continuity metrics across chunk embeddings.
 *
 * Legacy field `score` (V2.2-B.0/B.1) = mean of clamped cosines between
 * adjacent pairs. Empirically saturates ~0.95 on long books with massive
 * sub-chunking.
 *
 * V2.2-B.2.1 enriched metrics:
 * - `min_pair_score`: max rupture detection (preserved across N pairs).
 * - `std_pair_score`: narrative heterogeneity (stddev of adjacent sims).
 * - `first_last_score`: global boundary (cosine of first vs last chunk).
 */
export interface ContinuityScore {
  readonly score: number;
  readonly pair_scores: readonly number[];
  readonly chunk_count: number;
  readonly min_pair_score?: number;
  readonly std_pair_score?: number;
  readonly first_last_score?: number;
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
