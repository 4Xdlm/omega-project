/**
 * OMEGA V2.1 — Cost Function for ChunkBoundaryOptimizer
 *
 * Computes the cost of a candidate chunk configuration:
 *   cost = w1 * arc_breakage + w2 * length_variance + w3 * discontinuity
 *
 * Lower cost = better chunk boundaries.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { Chunk, ChunkWeights, EmotionalArc } from '../types.js';
import { featureDistance } from '../detector/features.js';

/**
 * Compute arc breakage cost.
 *
 * Counts how many arcs are split across chunk boundaries.
 * Normalized to [0, 1].
 *
 * @param chunks - Candidate chunks (sentence ranges)
 * @param arcs - Detected emotional arcs
 * @returns Cost in [0, 1] (higher = worse)
 */
export function computeArcBreakage(
  chunks: readonly Chunk[],
  arcs: readonly EmotionalArc[]
): number {
  if (arcs.length === 0 || chunks.length <= 1) return 0;

  let brokenArcs = 0;
  for (const arc of arcs) {
    // Count chunks containing any sentence from this arc
    const chunksContainingArc = chunks.filter((c) =>
      c.arcs.some((a) => a.start_idx === arc.start_idx && a.end_idx === arc.end_idx)
    );
    if (chunksContainingArc.length > 1) brokenArcs++;
  }

  return brokenArcs / arcs.length;
}

/**
 * Compute length variance cost.
 *
 * Measures how much chunks deviate from target_size in word count.
 * Normalized using coefficient of variation (stdev / mean).
 *
 * @param chunks - Candidate chunks
 * @param target_size - Target words per chunk
 * @returns Cost in [0, ∞), typically [0, 2]
 */
export function computeLengthVariance(
  chunks: readonly Chunk[],
  target_size: number
): number {
  if (chunks.length === 0 || target_size <= 0) return 0;

  const wordCounts = chunks.map((c) => c.metadata.word_count);
  const mean = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;

  if (mean === 0) return 0;

  // Variance from target_size (not from mean)
  let variance = 0;
  for (const wc of wordCounts) {
    variance += (wc - target_size) ** 2;
  }
  variance /= wordCounts.length;

  const stdev = Math.sqrt(variance);
  return stdev / target_size; // coefficient relative to target
}

/**
 * Compute narrative discontinuity cost.
 *
 * Sum of feature distances between adjacent chunk ending and next chunk start.
 * High distance = abrupt narrative shift between chunks.
 *
 * @param chunks - Candidate chunks
 * @param arcs - Detected emotional arcs (mapped to chunks)
 * @returns Cost in [0, ∞), normalized by chunk count
 */
export function computeDiscontinuity(chunks: readonly Chunk[]): number {
  if (chunks.length < 2) return 0;

  let totalDiscontinuity = 0;
  let pairCount = 0;

  for (let i = 0; i < chunks.length - 1; i++) {
    const current = chunks[i];
    const next = chunks[i + 1];
    if (!current || !next) continue;

    // Use last arc of current chunk vs first arc of next chunk
    const lastArcCurrent = current.arcs[current.arcs.length - 1];
    const firstArcNext = next.arcs[0];

    if (lastArcCurrent && firstArcNext) {
      const distance = featureDistance(lastArcCurrent.features, firstArcNext.features);
      totalDiscontinuity += distance;
      pairCount++;
    }
  }

  return pairCount > 0 ? totalDiscontinuity / pairCount : 0;
}

/**
 * Compute total cost score for a chunk configuration.
 *
 * @param chunks - Candidate chunks
 * @param arcs - Detected emotional arcs
 * @param weights - Cost weights (w1, w2, w3)
 * @param target_size - Target words per chunk
 * @returns Total cost (lower is better)
 */
export function computeTotalCost(
  chunks: readonly Chunk[],
  arcs: readonly EmotionalArc[],
  weights: ChunkWeights,
  target_size: number
): number {
  const arcBreakage = computeArcBreakage(chunks, arcs);
  const lengthVariance = computeLengthVariance(chunks, target_size);
  const discontinuity = computeDiscontinuity(chunks);

  return (
    weights.arc_breakage * arcBreakage +
    weights.length_variance * lengthVariance +
    weights.discontinuity * discontinuity
  );
}

/**
 * Component breakdown of cost (for debugging/logging).
 */
export interface CostBreakdown {
  readonly arc_breakage: number;
  readonly length_variance: number;
  readonly discontinuity: number;
  readonly total: number;
}

export function computeCostBreakdown(
  chunks: readonly Chunk[],
  arcs: readonly EmotionalArc[],
  weights: ChunkWeights,
  target_size: number
): CostBreakdown {
  const arc_breakage = computeArcBreakage(chunks, arcs);
  const length_variance = computeLengthVariance(chunks, target_size);
  const discontinuity = computeDiscontinuity(chunks);

  return {
    arc_breakage,
    length_variance,
    discontinuity,
    total:
      weights.arc_breakage * arc_breakage +
      weights.length_variance * length_variance +
      weights.discontinuity * discontinuity,
  };
}
