/**
 * OMEGA V2.2 — Embeddings Similarity Utilities
 *
 * Pure functions for vector operations (no dependencies on model).
 * IMPLEMENTED (independent of transformers library).
 */

import type { ContinuityScore } from './types.js';
import { EmbeddingError } from './types.js';

/**
 * Compute cosine similarity between two vectors.
 *
 * Returns value in [-1, 1]. For embedding spaces, typically [0, 1].
 *
 * @param a - First vector
 * @param b - Second vector (must have same length as a)
 * @returns Cosine similarity
 * @throws EmbeddingError if vectors have different lengths
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
 * Compute cross-chunk continuity score.
 *
 * Average of cosine similarities between adjacent chunk embeddings.
 * Higher score = chunks are semantically continuous.
 *
 * @param embeddings - Array of chunk embeddings (in order)
 * @returns Continuity score in [0, 1] (or 0 if < 2 chunks)
 */
export function crossChunkContinuity(
  embeddings: readonly Float32Array[]
): ContinuityScore {
  if (embeddings.length < 2) {
    return {
      score: 0,
      pair_scores: [],
      chunk_count: embeddings.length,
    };
  }

  const pair_scores: number[] = [];
  for (let i = 0; i < embeddings.length - 1; i++) {
    const current = embeddings[i];
    const next = embeddings[i + 1];
    if (current && next) {
      // Clamp to [0, 1] for embedding space convention
      const sim = Math.max(0, cosineSimilarity(current, next));
      pair_scores.push(sim);
    }
  }

  const sum = pair_scores.reduce((acc, v) => acc + v, 0);
  const score = pair_scores.length > 0 ? sum / pair_scores.length : 0;

  return {
    score,
    pair_scores,
    chunk_count: embeddings.length,
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
