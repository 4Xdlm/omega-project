/**
 * @fileoverview SENTINEL module type definitions.
 * @module @omega/decision-engine/sentinel/types
 */

import type {
  BuildVerdict,
  RuntimeEvent,
  RuntimeSnapshot,
  SentinelStats,
} from '../types/index.js';

/**
 * SENTINEL interface - observes verdicts in READ-ONLY mode.
 * INV-SENTINEL-01: Never modifies input verdicts.
 */
export interface Sentinel {
  /**
   * Observes a build verdict and generates a runtime event.
   * @param verdict - The verdict to observe
   * @returns Generated runtime event
   */
  observeVerdict(verdict: BuildVerdict): RuntimeEvent;

  /**
   * Gets current state snapshot.
   * @returns Current runtime snapshot
   */
  getSnapshot(): RuntimeSnapshot;

  /**
   * Gets observation statistics.
   * @returns Current statistics
   */
  getStats(): SentinelStats;

  /**
   * Resets the sentinel state.
   */
  reset(): void;
}

/**
 * Options for creating a Sentinel instance.
 */
export interface SentinelOptions {
  /** Clock function for timestamps (default: Date.now) */
  readonly clock?: () => number;
  /** ID generator function */
  readonly idGenerator?: () => string;
}

/**
 * Internal observation record.
 */
export interface ObservationRecord {
  /** Event generated */
  readonly event: RuntimeEvent;
  /** Observation latency in ms */
  readonly latencyMs: number;
}
