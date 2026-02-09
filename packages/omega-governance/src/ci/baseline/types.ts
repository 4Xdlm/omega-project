/**
 * OMEGA Governance — Baseline Types
 * Phase F — Types for baseline management
 */

export interface BaselineRegistry {
  readonly version: string;
  readonly baselines: readonly BaselineEntry[];
  readonly updated_at: string;
}

export interface BaselineEntry {
  readonly version: string;
  readonly path: string;
  readonly created_at: string;
  readonly manifest_hash: string;
  readonly certified: boolean;
  readonly intents: readonly string[];
}

export interface BaselineManifest {
  readonly version: string;
  readonly created_at: string;
  readonly intents: readonly BaselineIntentEntry[];
  readonly thresholds: BaselineThresholds;
  readonly hash: string;
}

export interface BaselineIntentEntry {
  readonly name: string;
  readonly intent_hash: string;
  readonly expected_run_id?: string;
}

export interface BaselineThresholds {
  readonly min_forge_score: number;
  readonly max_duration_ms: number;
  readonly max_variance: number;
}
