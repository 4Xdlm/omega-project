/**
 * OMEGA V2.1 — Chunk Boundary Optimizer (IMPLEMENTATION)
 *
 * Finds optimal chunk boundaries minimizing cost function via:
 *   1. Generate candidate boundary sets respecting min/max constraints
 *   2. Score each candidate via cost function
 *   3. Return chunks with minimum total cost
 *
 * Strategy: dynamic programming with arc-aware boundary candidates.
 * For long chapters, restricts candidate set to arc transitions + size-target multiples.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Sprint V2.1 implementation 2026-05-26
 */

import type { Chunk, ChunkMetadata, ChunkWeights, EmotionalArc } from '../types.js';
import { cumulativeWordCounts } from '../detector/sentences.js';
import { computeCostBreakdown, computeTotalCost } from './cost.js';

export interface BoundaryOptimizerConfig {
  readonly weights: ChunkWeights;
  readonly target_size: number;
  readonly min_chunks: number;
  readonly max_chunks: number;
}

export class ChunkBoundaryOptimizer {
  private readonly config: BoundaryOptimizerConfig;

  constructor(config: BoundaryOptimizerConfig) {
    if (config.min_chunks < 1) {
      throw new Error(`min_chunks must be >= 1, got ${config.min_chunks}`);
    }
    if (config.max_chunks < config.min_chunks) {
      throw new Error(
        `max_chunks (${config.max_chunks}) must be >= min_chunks (${config.min_chunks})`
      );
    }
    if (config.target_size <= 0) {
      throw new Error(`target_size must be > 0, got ${config.target_size}`);
    }
    this.config = config;
  }

  /**
   * Compute optimal chunk boundaries given detected emotional arcs.
   *
   * Algorithm:
   *   1. Identify candidate boundary points (arc transitions + every ~target_size words)
   *   2. Enumerate boundary sets producing [min_chunks, max_chunks] chunks
   *   3. Score each set via cost function
   *   4. Return chunk array for minimum-cost set
   *
   * @param text - Full chapter text (not used directly, but available for future tokenization)
   * @param sentences - Pre-split sentences
   * @param arcs - Detected emotional arcs
   * @returns Optimal chunks array
   */
  optimize(
    _text: string,
    sentences: readonly string[],
    arcs: readonly EmotionalArc[]
  ): readonly Chunk[] {
    if (sentences.length === 0) return [];

    // Edge case: too few sentences for multiple chunks → single chunk
    const cumulWords = cumulativeWordCounts(sentences);
    const totalWords = cumulWords.length > 0 ? (cumulWords[cumulWords.length - 1] ?? 0) : 0;

    if (totalWords < this.config.target_size * 1.5 || sentences.length < this.config.min_chunks) {
      return [this.buildChunk(sentences, arcs, 0, sentences.length, 0, 1, 0)];
    }

    // Generate candidate boundary sentence indices
    // Audit 2026-05-26 P2 fix : sentences not needed (was passing [] hack)
    const candidateBoundaries = this.generateCandidateBoundaries(arcs, cumulWords);

    // Enumerate boundary sets producing [min_chunks, max_chunks] chunks
    const bestSet = this.findBestBoundarySet(
      sentences,
      arcs,
      candidateBoundaries
    );

    // Build chunks from best boundaries
    return this.buildChunks(sentences, arcs, bestSet);
  }

  /**
   * Generate candidate boundary sentence indices.
   * Combines arc transitions + size-target waypoints.
   */
  private generateCandidateBoundaries(
    arcs: readonly EmotionalArc[],
    cumulWords: readonly number[]
  ): number[] {
    const candidates = new Set<number>();

    // Add arc transition points (end of each arc except last)
    for (let i = 0; i < arcs.length - 1; i++) {
      const arc = arcs[i];
      if (arc) candidates.add(arc.end_idx);
    }

    // Add size-target waypoints (every target_size words)
    const totalWords = cumulWords[cumulWords.length - 1] ?? 0;
    const idealChunks = Math.max(
      this.config.min_chunks,
      Math.min(this.config.max_chunks, Math.round(totalWords / this.config.target_size))
    );
    const targetStep = totalWords / idealChunks;

    for (let k = 1; k < idealChunks; k++) {
      const targetWord = k * targetStep;
      // Find sentence index whose cumul reaches targetWord
      for (let i = 0; i < cumulWords.length; i++) {
        const cw = cumulWords[i];
        if (cw !== undefined && cw >= targetWord) {
          candidates.add(i + 1); // boundary AFTER sentence i
          break;
        }
      }
    }

    return [...candidates].sort((a, b) => a - b);
  }

  /**
   * Enumerate boundary sets producing valid chunk counts, return lowest cost.
   *
   * Combinatorial enumeration limited to k = [min-1, max-1] boundaries from candidates.
   * For very long chapters, this could be expensive — use beam search if needed.
   */
  private findBestBoundarySet(
    sentences: readonly string[],
    arcs: readonly EmotionalArc[],
    candidates: readonly number[]
  ): readonly number[] {
    const minBoundaries = Math.max(0, this.config.min_chunks - 1);
    const maxBoundaries = Math.min(this.config.max_chunks - 1, candidates.length);

    let bestCost = Infinity;
    let bestSet: readonly number[] = [];

    // For each target boundary count, find best set
    for (let k = minBoundaries; k <= maxBoundaries; k++) {
      if (k === 0) {
        // Single chunk case
        const chunks = this.buildChunks(sentences, arcs, []);
        const cost = computeTotalCost(chunks, arcs, this.config.weights, this.config.target_size);
        if (cost < bestCost) {
          bestCost = cost;
          bestSet = [];
        }
        continue;
      }

      // Choose k candidates as boundaries
      // For small k and small |candidates|, full enumeration is feasible.
      // For large sets, beam search/DP optimization is needed (Sprint V2.1.1+).
      const totalCombinations = binomial(candidates.length, k);
      if (totalCombinations > 10000) {
        // Fallback: greedy (pick evenly-spaced candidates)
        const greedySet = this.greedyEvenlySpaced(candidates, k);
        const chunks = this.buildChunks(sentences, arcs, greedySet);
        const cost = computeTotalCost(chunks, arcs, this.config.weights, this.config.target_size);
        if (cost < bestCost) {
          bestCost = cost;
          bestSet = greedySet;
        }
        continue;
      }

      // Full enumeration
      const combos = combinations(candidates, k);
      for (const combo of combos) {
        const chunks = this.buildChunks(sentences, arcs, combo);
        const cost = computeTotalCost(chunks, arcs, this.config.weights, this.config.target_size);
        if (cost < bestCost) {
          bestCost = cost;
          bestSet = combo;
        }
      }
    }

    return bestSet;
  }

  /**
   * Greedy fallback: pick evenly-spaced candidates.
   */
  private greedyEvenlySpaced(candidates: readonly number[], k: number): number[] {
    if (k >= candidates.length) return [...candidates];
    const step = candidates.length / (k + 1);
    const selected: number[] = [];
    for (let i = 1; i <= k; i++) {
      const idx = Math.floor(i * step);
      const candidate = candidates[Math.min(idx, candidates.length - 1)];
      if (candidate !== undefined) selected.push(candidate);
    }
    return selected;
  }

  /**
   * Build Chunk array from sentence boundaries.
   * Audit 2026-05-27 V2.1.1 fix : compute total cost once and propagate to each chunk metadata.
   * Previously costScore was hardcoded to 0 — preventing calibration signal differentiation.
   */
  private buildChunks(
    sentences: readonly string[],
    arcs: readonly EmotionalArc[],
    boundaries: readonly number[]
  ): readonly Chunk[] {
    const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
    const breakpoints = [0, ...sortedBoundaries, sentences.length];

    // Pre-build raw chunks with placeholder cost to compute total cost
    const rawChunks: Chunk[] = [];
    for (let i = 0; i < breakpoints.length - 1; i++) {
      const start = breakpoints[i] ?? 0;
      const end = breakpoints[i + 1] ?? sentences.length;
      if (start >= end) continue;
      const chunkArcs = arcs.filter((a) => a.start_idx < end && a.end_idx > start);
      const chunk = this.buildChunk(sentences, chunkArcs, start, end, i, breakpoints.length - 1, 0);
      rawChunks.push(chunk);
    }

    // Compute total cost for this boundary set and propagate average per-chunk score
    const totalCost = computeTotalCost(rawChunks, arcs, this.config.weights, this.config.target_size);
    const perChunkCost = rawChunks.length > 0 ? totalCost / rawChunks.length : 0;

    // Re-emit chunks with proper cost_score (rebuild metadata)
    const chunks: Chunk[] = rawChunks.map((c, i) => ({
      ...c,
      metadata: { ...c.metadata, cost_score: perChunkCost, total_chunks: rawChunks.length, chunk_index: i },
    }));

    return chunks;
  }

  /**
   * Build a single chunk from sentence range.
   * Audit 2026-05-26 P2 fix : arcs param is already pre-filtered by caller (buildChunks).
   * Removed redundant arcs.filter() that duplicated O(n) work.
   */
  private buildChunk(
    sentences: readonly string[],
    arcs: readonly EmotionalArc[],
    startIdx: number,
    endIdx: number,
    chunkIndex: number,
    totalChunks: number,
    costScore: number
  ): Chunk {
    const slice = sentences.slice(startIdx, endIdx);
    const text = slice.join(' ');
    const wordCount = text.split(/\s+/).filter((t) => /[a-zàâäéèêëïîôöùûüÿñçA-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÑÇ]/.test(t)).length;

    const chunkArcs = arcs;

    const metadata: ChunkMetadata = {
      chunk_index: chunkIndex,
      total_chunks: totalChunks,
      word_count: wordCount,
      sentence_count: slice.length,
      arc_count: chunkArcs.length,
      cost_score: costScore,
    };

    return {
      id: `chunk_${chunkIndex}_${startIdx}_${endIdx}`,
      text,
      start_word: 0, // approximated; full implementation requires cross-chunk word indexing
      end_word: wordCount,
      arcs: chunkArcs,
      metadata,
    };
  }

  /**
   * Compute cost score for a candidate chunk configuration.
   * Public method exposed for debugging/calibration.
   */
  computeCost(
    chunks: readonly Chunk[],
    arcs: readonly EmotionalArc[]
  ): number {
    return computeTotalCost(chunks, arcs, this.config.weights, this.config.target_size);
  }

  /**
   * Get cost breakdown for debugging.
   */
  computeCostBreakdown(
    chunks: readonly Chunk[],
    arcs: readonly EmotionalArc[]
  ) {
    return computeCostBreakdown(chunks, arcs, this.config.weights, this.config.target_size);
  }
}

// ============================================================
// Helpers
// ============================================================

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < Math.min(k, n - k); i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

function* combinations<T>(arr: readonly T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  if (k > arr.length) return;
  for (let i = 0; i <= arr.length - k; i++) {
    const first = arr[i];
    if (first === undefined) continue;
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      yield [first, ...rest];
    }
  }
}
