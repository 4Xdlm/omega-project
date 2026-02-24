/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — VALIDATION TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/validation-types.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Phase VALIDATION — Offline Mock Runner
 * 0 logic — types only.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket } from '../types.js';
import type { SScoreV2 } from '../oracle/s-oracle-v2.js';
import type { OfflineSovereignLoopResult } from '../pitch/sovereign-loop.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationConfig {
  readonly mode: 'offline' | 'real';
  readonly llm_provider: {
    readonly name: 'claude';
    readonly mode: 'offline' | 'real';
    readonly model_lock: string;
  };
  readonly run_count_per_experiment: number;
  readonly seed_strategy: 'sha256';
  readonly thresholds: {
    readonly target_reject_rate_min: number;
    readonly target_reject_rate_max: number;
    readonly target_s_score: number;
    readonly target_corr_14d: number;
    readonly target_mean_improvement: number;
  };
  readonly baseline: {
    readonly source_commit: string | null;
    readonly mode: string | null;
    readonly corpus: string | null;
    readonly value: number | null;
  };
  readonly paths: {
    readonly inputs_dir: string;
    readonly outputs_dir: string;
    readonly reports_dir: string;
    readonly logs_dir: string;
  };
  readonly experiment_criteria?: Record<string, ExperimentCriteria>;
}

export interface ExperimentCriteria {
  readonly primary_axis: string;
  readonly primary_axis_min: number;
  readonly composite_min: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LLM PROVIDER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface LLMProvider {
  generateDraft(packet: ForgePacket, seed: string): Promise<string>;
  judgeLLMAxis(prose: string, axis: string, seed: string): Promise<number>;
  readonly model_id: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface RunResult {
  readonly run_index: number;
  readonly experiment_id: string;
  readonly case_id: string;
  readonly seed: string;
  readonly prose_generated: string;
  readonly s_score_initial: SScoreV2;
  readonly sovereign_loop: OfflineSovereignLoopResult;
  readonly s_score_final: SScoreV2;
  readonly verdict: 'SEAL' | 'REJECT' | 'EXECUTION_FAIL';
  readonly error?: string;
  readonly model_id: string;
  readonly run_hash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPERIMENT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExperimentSummary {
  readonly experiment_id: string;
  readonly mode: 'offline' | 'real';
  readonly total_runs: number;
  readonly sealed_count: number;
  readonly rejected_count: number;
  readonly failed_count: number;
  readonly reject_rate: number;
  readonly pct_above_92: number;
  readonly mean_s_score_sealed: number;
  readonly mean_improvement: number | null;
  readonly corr_14d_distribution: readonly number[];
  readonly mean_corr_14d: number;
  readonly baseline: {
    readonly value: number | null;
    readonly mean_improvement: number | null;
  };
  readonly model_id: string;
  readonly runs: readonly RunResult[];
  readonly summary_hash: string;
}
