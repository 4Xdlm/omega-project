/**
 * OMEGA Integrated Scorer V3 — R4-d
 *
 * Combines:
 *   1. MultiStageScorerV3 (Ridge + R3 confidence + R8 tipping) → LOCAL score
 *   2. ARC Scorer (progression + stability + closure) → ARC score
 *   3. Dual Scale (0.43 × LOCAL + 0.57 × ARC) → final score
 *
 * This module is the CALIBRATED scorer for P2-01.
 * It does NOT replace the S-Oracle (macro-axes) — it runs in parallel
 * as a diagnostic and validation signal.
 *
 * Dependencies:
 *   - R4-b: R3 confidence modulation (DONE)
 *   - R4-c: R8 tipping points (DONE)
 *   - P2-00: ARC scorer (DONE)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { MultiStageScorerV3, type V3Score } from './multi-stage-scorer-v3.js';
import { pushScoreAndComputeArc, resetArc, setClosureTarget, computeArcFromScores, type ArcScore } from './arc-scorer.js';
import type { ScoringOptions } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface IntegratedV3Result {
  /** LOCAL score from Ridge + R3 + R8 (0-100) */
  readonly local: V3Score;
  /** ARC score from arc-scorer (progression + stability + closure) */
  readonly arc: ArcScore;
  /** Dual-weighted composite: W_LOCAL × local.final + W_ARC × arc.arc_composite */
  readonly dual_score: number;
  /** Number of chunks scored so far (ARC window) */
  readonly chunk_count: number;
  /** Scoring mode flags */
  readonly flags: {
    readonly r3_modulated: boolean;
    readonly r8_tipping_active: boolean;
    readonly arc_active: boolean;
  };
}

// Dual Scale weights (from dual-scale.ts SSOT)
const W_LOCAL = 0.43;
const W_ARC = 0.57;

// ═══════════════════════════════════════════════════════════════════════
// INTEGRATED SCORER
// ═══════════════════════════════════════════════════════════════════════

export class IntegratedScorerV3 {
  private readonly scorer: MultiStageScorerV3;
  private readonly scores: number[];
  private closureTarget: number;

  /**
   * @param closureTarget Seal threshold for ARC closure signal (default 88 = LITTERAIRE)
   * @param useR3 Enable R3 confidence modulation (default true)
   * @param useR8 Enable R8 tipping points (default true)
   */
  constructor(closureTarget = 88, useR3 = true, useR8 = true) {
    this.scorer = new MultiStageScorerV3(useR3, useR8);
    this.scores = [];
    this.closureTarget = closureTarget;
  }

  /**
   * Score a chunk and accumulate ARC state.
   * Call once per chunk (750w) in sequence.
   *
   * @param features Text features for this chunk
   * @param options Scoring options (wordCount, text, etc.)
   * @returns Integrated result with LOCAL + ARC + dual_score
   */
  scoreChunk(
    features: Record<string, number>,
    options: ScoringOptions,
  ): IntegratedV3Result {
    // 1. LOCAL score via V3 Ridge + R3 + R8
    const local = this.scorer.score(features, options);

    // 2. Push LOCAL final into ARC scorer (stateful)
    const arc = pushScoreAndComputeArc(local.final);
    this.scores.push(local.final);

    // 3. Dual Scale composite
    const dualScore = Math.round(
      (W_LOCAL * local.final + W_ARC * arc.arc_composite) * 100,
    ) / 100;

    return {
      local,
      arc,
      dual_score: dualScore,
      chunk_count: this.scores.length,
      flags: {
        r3_modulated: local.r3_modulated,
        r8_tipping_active: local.r8_tipping.total_evaluated > 0,
        arc_active: true,
      },
    };
  }

  /**
   * Stateless scoring: compute LOCAL + ARC from a sequence of feature vectors.
   * Does NOT modify internal state.
   *
   * @param featureSequence Array of feature dicts (one per chunk, in order)
   * @param options Shared scoring options
   * @returns Integrated result for the LAST chunk, with full ARC context
   */
  scoreSequence(
    featureSequence: ReadonlyArray<Record<string, number>>,
    options: ScoringOptions,
  ): IntegratedV3Result | null {
    if (featureSequence.length === 0) return null;

    const localScores: number[] = [];
    let lastLocal: V3Score | undefined;

    for (const features of featureSequence) {
      lastLocal = this.scorer.score(features, options);
      localScores.push(lastLocal.final);
    }

    // Stateless ARC computation
    const arc = computeArcFromScores(localScores, this.closureTarget);
    const dualScore = Math.round(
      (W_LOCAL * lastLocal!.final + W_ARC * arc.arc_composite) * 100,
    ) / 100;

    return {
      local: lastLocal!,
      arc,
      dual_score: dualScore,
      chunk_count: localScores.length,
      flags: {
        r3_modulated: lastLocal!.r3_modulated,
        r8_tipping_active: lastLocal!.r8_tipping.total_evaluated > 0,
        arc_active: true,
      },
    };
  }

  /**
   * Reset ARC state for a new run.
   */
  reset(): void {
    this.scores.length = 0;
    resetArc();
  }

  /**
   * Update closure target (e.g., when changing quality profile).
   */
  setClosureTarget(target: number): void {
    this.closureTarget = target;
    setClosureTarget(target);
  }

  /**
   * Get accumulated LOCAL scores (for external analysis).
   */
  getScores(): readonly number[] {
    return this.scores;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTS (re-export for convenience)
// ═══════════════════════════════════════════════════════════════════════

export { W_LOCAL, W_ARC };
export type { V3Score, ArcScore };
