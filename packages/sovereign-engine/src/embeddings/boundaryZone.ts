/**
 * OMEGA V2.2-B Option E — Boundary-zone embedding
 *
 * Innovation 2026-05-28: instead of embedding full chunks (which require
 * massive sub-chunking + pooling for long books — dilutes signal), embed
 * ONLY the boundary zones (last N words of chunk_i, first N words of
 * chunk_i+1) for each adjacent pair. Cosine between these two embeddings
 * = true continuity at the cut point, with zero pooling dilution.
 *
 * Each boundary zone is ≤500 words by default, well under nomic-embed-text
 * 2048-token cutoff (~1100 words). Fast path direct embedRaw().
 *
 * Cost: 2*(N-1) embeddings for N chunks (vs ~50*N with full-chunk pooling
 * on long books). Massive reduction + signal preserved.
 *
 * Aligned with V2.2-B B1 objective: detect good/bad V2.1 boundary candidates.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { cosineSimilarity } from './similarity.js';

/**
 * A pair of boundary-zone texts surrounding a chunk transition.
 */
export interface BoundaryZonePair {
  readonly boundary_index: number; // index between chunks (0 = between chunk 0 and 1)
  readonly end_of_left: string; // last `zone_words` words of chunk_i
  readonly start_of_right: string; // first `zone_words` words of chunk_i+1
  readonly left_word_count: number;
  readonly right_word_count: number;
}

/**
 * Boundary continuity score per cut point.
 */
export interface BoundaryScore {
  readonly boundary_index: number;
  readonly cosine: number; // [0, 1] post-clamp
  readonly left_word_count: number;
  readonly right_word_count: number;
}

/**
 * Aggregate boundary metrics for a book.
 */
export interface BookBoundaryMetrics {
  readonly boundary_count: number;
  readonly boundary_scores: readonly number[]; // per-boundary cosines
  readonly min_boundary: number; // weakest continuity = strongest rupture
  readonly mean_boundary: number;
  readonly max_boundary: number;
  readonly std_boundary: number;
  readonly range_boundary: number; // max - min intra-book
}

/**
 * Extract boundary zone texts from a chunk array.
 *
 * For each adjacent pair (chunk[i], chunk[i+1]):
 *   - end_of_left = last `zone_words` words of chunk[i].text
 *   - start_of_right = first `zone_words` words of chunk[i+1].text
 *
 * If a chunk has fewer than `zone_words` total words, returns all words.
 *
 * @param chunks Array of chunk objects with .text property (string)
 * @param zone_words Words per zone (default 250, ≤500 total per pair)
 * @returns Array of BoundaryZonePair (length = chunks.length - 1)
 */
export function extractBoundaryZones<T extends { readonly text: string }>(
  chunks: readonly T[],
  zone_words: number = 250
): BoundaryZonePair[] {
  if (zone_words <= 0) {
    throw new Error(`zone_words must be > 0, got ${zone_words}`);
  }
  const pairs: BoundaryZonePair[] = [];
  for (let i = 0; i < chunks.length - 1; i++) {
    const left = chunks[i]!.text;
    const right = chunks[i + 1]!.text;
    const leftWords = left.split(/\s+/).filter((w) => w.length > 0);
    const rightWords = right.split(/\s+/).filter((w) => w.length > 0);
    const endOfLeft = leftWords.slice(-zone_words).join(' ');
    const startOfRight = rightWords.slice(0, zone_words).join(' ');
    pairs.push({
      boundary_index: i,
      end_of_left: endOfLeft,
      start_of_right: startOfRight,
      left_word_count: Math.min(zone_words, leftWords.length),
      right_word_count: Math.min(zone_words, rightWords.length),
    });
  }
  return pairs;
}

/**
 * Compute boundary scores from embedded zone pairs.
 *
 * Each score = cosine(embed(end_of_left), embed(start_of_right)).
 * Clamped to [0, 1] per embedding-space convention.
 *
 * @param pairs Pre-embedded zone pairs (caller embeds and provides vectors)
 */
export function computeBoundaryScores(
  pairs: readonly {
    readonly boundary_index: number;
    readonly left_vector: Float32Array;
    readonly right_vector: Float32Array;
    readonly left_word_count: number;
    readonly right_word_count: number;
  }[]
): BoundaryScore[] {
  return pairs.map((p) => ({
    boundary_index: p.boundary_index,
    cosine: Math.max(0, cosineSimilarity(p.left_vector, p.right_vector)),
    left_word_count: p.left_word_count,
    right_word_count: p.right_word_count,
  }));
}

/**
 * Aggregate per-book boundary metrics from BoundaryScore array.
 */
export function aggregateBookBoundaries(scores: readonly BoundaryScore[]): BookBoundaryMetrics {
  if (scores.length === 0) {
    return {
      boundary_count: 0,
      boundary_scores: [],
      min_boundary: 0,
      mean_boundary: 0,
      max_boundary: 0,
      std_boundary: 0,
      range_boundary: 0,
    };
  }
  const cosines = scores.map((s) => s.cosine);
  const min_boundary = Math.min(...cosines);
  const max_boundary = Math.max(...cosines);
  const mean_boundary = cosines.reduce((a, b) => a + b, 0) / cosines.length;
  const std_boundary = Math.sqrt(
    cosines.map((c) => (c - mean_boundary) ** 2).reduce((a, b) => a + b, 0) / cosines.length
  );
  return {
    boundary_count: scores.length,
    boundary_scores: cosines,
    min_boundary,
    mean_boundary,
    max_boundary,
    std_boundary,
    range_boundary: max_boundary - min_boundary,
  };
}
