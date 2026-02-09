/**
 * OMEGA Governance — Bench Types
 * Phase D.2 — Types for benchmark suite execution
 */

import type { GovConfig } from '../core/config.js';

export interface BenchSuite {
  readonly name: string;
  readonly intents: readonly BenchIntent[];
  readonly thresholds: BenchThresholds;
}

export interface BenchIntent {
  readonly name: string;
  readonly path: string;
  readonly description: string;
}

export interface BenchThresholds {
  readonly min_forge_score: number;
  readonly max_duration_ms: number;
  readonly max_variance: number;
}

export interface BenchRunResult {
  readonly intent_name: string;
  readonly run_id: string;
  readonly forge_score: number;
  readonly emotion_score: number;
  readonly quality_score: number;
  readonly duration_ms: number;
  readonly verdict: string;
}

export interface BenchAggregation {
  readonly intent_name: string;
  readonly run_count: number;
  readonly avg_forge_score: number;
  readonly min_forge_score: number;
  readonly max_forge_score: number;
  readonly variance: number;
  readonly avg_duration_ms: number;
}

export interface BenchReport {
  readonly suite_name: string;
  readonly total_runs: number;
  readonly aggregations: readonly BenchAggregation[];
  readonly threshold_checks: readonly ThresholdCheck[];
  readonly overall_pass: boolean;
  readonly config: GovConfig;
}

export interface ThresholdCheck {
  readonly check: string;
  readonly status: 'PASS' | 'FAIL';
  readonly value: number;
  readonly threshold: number;
  readonly message: string;
}
