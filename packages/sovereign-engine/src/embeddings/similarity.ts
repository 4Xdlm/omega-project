/**
 * OMEGA V2.2 — Embeddings Similarity Utilities
 *
 * Pure functions for vector operations (no dependencies on model).
 *
 * V2.2-B.2.1 (2026-05-28): crossChunkContinuity() enriched with
 * min_pair_score, std_pair_score, first_last_score for boundary
 * detection on long books where mean saturates ~0.95.
 */

import type { ContinuityScore } from './types.js';
import { EmbeddingError } from './types.js';

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new EmbeddingError(
      `Vector dimension mismatch: ${a.length} vs ${b.length}`,
      'DIMENSION_MISMATCH',
      { a_len: a.length, b_len: b.length }
    );
  }
  if (a.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compute cross-chunk continuity score (V2.2-B.2.1 enriched).
 *
 * Primary score: mean of cosine similarities between adjacent chunk embeddings.
 * V2.2-B.2.1 enriched:
 * - min_pair_score: smallest adjacent cosine (max rupture detected)
 * - std_pair_score: stddev of pair_scores (narrative heterogeneity)
 * - first_last_score: cosine(first_emb, last_emb) — global boundary
 */
export function crossChunkContinuity(
  embeddings: readonly Float32Array[]
): ContinuityScore {
  if (embeddings.length < 2) {
    return {
      score: 0,
      pair_scores: [],
      chunk_count: embeddings.length,
      min_pair_score: 0,
      std_pair_score: 0,
      first_last_score: 0,
    };
  }
  const pair_scores: number[] = [];
  for (let i = 0; i < embeddings.length - 1; i++) {
    const current = embeddings[i];
    const next = embeddings[i + 1];
    if (current && next) {
      const sim = Math.max(0, cosineSimilarity(current, next));
      pair_scores.push(sim);
    }
  }
  const sum = pair_scores.reduce((acc, v) => acc + v, 0);
  const score = pair_scores.length > 0 ? sum / pair_scores.length : 0;
  const min_pair_score = pair_scores.length > 0 ? Math.min(...pair_scores) : 0;
  const std_pair_score =
    pair_scores.length > 0
      ? Math.sqrt(
          pair_scores.map((s) => (s - score) ** 2).reduce((a, b) => a + b, 0) /
            pair_scores.length
        )
      : 0;
  const first = embeddings[0];
  const last = embeddings[embeddings.length - 1];
  const first_last_score =
    first && last ? Math.max(0, cosineSimilarity(first, last)) : 0;
  return {
    score,
    pair_scores,
    chunk_count: embeddings.length,
    min_pair_score,
    std_pair_score,
    first_last_score,
  };
}

/**
 * L2 norm of a vector.
 */
export function l2Norm(v: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    const x = v[i] ?? 0;
    sum += x * x;
  }
  return Math.sqrt(sum);
}

/**
 * Normalize vector to unit L2 norm.
 */
export function normalize(v: Float32Array): Float32Array {
  const norm = l2Norm(v);
  if (norm === 0) {
    return new Float32Array(v.length);
  }
  const result = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    result[i] = (v[i] ?? 0) / norm;
  }
  return result;
}
