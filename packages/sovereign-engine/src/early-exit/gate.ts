/**
 * OMEGA V2.3 — Early Exit Gate (Scaffolding STUB)
 *
 * Decides whether to skip remaining Best-of-N candidates based on
 * first candidate dispersion + history confidence.
 *
 * Status: SCAFFOLDING_NOT_PRODUCTION — Sprint V2.3 execution required
 * (calibration corpus + threshold tuning + integration K2 pipeline)
 */

import type {
  AxisScores,
  ChapterHistoryEntry,
  EarlyExitConfig,
  EarlyExitDecision,
} from './types.js';
import { DEFAULT_EARLY_EXIT_CONFIG } from './types.js';
import { compositeScore, computeAxisDispersion } from './dispersion.js';

export class EarlyExitGate {
  private readonly config: EarlyExitConfig;
  private readonly history: ChapterHistoryEntry[] = [];

  constructor(config: EarlyExitConfig = DEFAULT_EARLY_EXIT_CONFIG) {
    this.config = config;
  }

  /**
   * Decide if first candidate is confident enough to skip remaining.
   *
   * PRODUCTION LOGIC (Sprint V2.3 implementation):
   * 1. Compute axis dispersion (stdev across 5 axes)
   * 2. Compute composite score
   * 3. Check absolute floor (no axis below threshold)
   * 4. Check consensus with history window
   * 5. Decision: exit if (dispersion < threshold) AND (composite >= min) AND (no axis < floor)
   *
   * @param scores - First candidate scores
   * @returns Decision with reasoning
   */
  shouldExit(scores: AxisScores): EarlyExitDecision {
    const dispersion = computeAxisDispersion(scores);
    const composite = compositeScore(scores);

    // Check 1: composite must beat minimum
    if (composite < this.config.min_avg_score) {
      return {
        exit: false,
        reason: `Composite score ${composite.toFixed(2)} below min ${this.config.min_avg_score}`,
        confidence: 0,
        dispersion,
      };
    }

    // Check 2: no axis below absolute floor
    if (dispersion.min < this.config.absolute_floor) {
      return {
        exit: false,
        reason: `Min axis score ${dispersion.min.toFixed(2)} below floor ${this.config.absolute_floor}`,
        confidence: 0.3,
        dispersion,
      };
    }

    // Check 3: dispersion below threshold
    if (dispersion.stdev > this.config.threshold) {
      return {
        exit: false,
        reason: `Dispersion ${dispersion.stdev.toFixed(2)} above threshold ${this.config.threshold}`,
        confidence: 0.5,
        dispersion,
      };
    }

    // All gates passed → confident exit
    return {
      exit: true,
      reason: `Confident: composite=${composite.toFixed(2)}, stdev=${dispersion.stdev.toFixed(2)}, floor OK`,
      confidence: 1 - dispersion.stdev / this.config.threshold,
      dispersion,
    };
  }

  /**
   * Record a chapter outcome to history for future confidence calculations.
   */
  recordOutcome(entry: ChapterHistoryEntry): void {
    this.history.push(entry);
    // Keep only last 100 entries
    if (this.history.length > 100) {
      this.history.shift();
    }
  }

  /**
   * Get current skip rate from history (for monitoring).
   */
  getSkipRate(): number {
    if (this.history.length === 0) return 0;
    const skipped = this.history.filter(e => e.exited_early).length;
    return skipped / this.history.length;
  }

  /**
   * Check if gate is production-ready (Sprint V2.3 calibration complete).
   */
  static isProductionReady(): boolean {
    return false; // Sprint V2.3 production gate
  }
}
