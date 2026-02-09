/**
 * OMEGA Governance — Replay Types
 * Phase F — Types for deterministic replay engine
 *
 * INV-F-02: Replay uses the SAME seed as the original run.
 */

export interface ReplayResult {
  readonly baseline_run_id: string;
  readonly replay_run_id: string;
  readonly seed: string;
  readonly identical: boolean;
  readonly differences: readonly ReplayDifference[];
  readonly manifest_match: boolean;
  readonly merkle_match: boolean;
  readonly duration_ms: number;
}

export interface ReplayDifference {
  readonly path: string;
  readonly type: 'HASH_MISMATCH' | 'MISSING_IN_BASELINE' | 'MISSING_IN_REPLAY' | 'CONTENT_DIFF';
  readonly baseline_hash?: string;
  readonly replay_hash?: string;
  readonly message: string;
}

export interface ReplayOptions {
  readonly seed: string;
  readonly timeout_ms: number;
}
