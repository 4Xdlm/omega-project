/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — LIVE RUNTIME TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: runtime/live-types.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Types for LIVE5-STABILITY standalone CLI.
 * All readonly, no optional fields without defaults.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface LiveConfig {
  readonly runPath: string; // Path to golden run directory (relative OK)
  readonly outPath: string; // Output directory for LIVE results
  readonly count: number; // Number of runs (e.g., 5)
  readonly judgeStable: boolean; // If true: temperature=0, structured JSON
  readonly sceneIndex: number; // Which scene from the plan to run (default 0 = first)
  readonly apiKey: string; // ANTHROPIC_API_KEY
  readonly model: string; // Model to use (default: claude-sonnet-4-20250514)
}

export interface RunIdRecord {
  readonly run_index: number;
  readonly run_path_rel: string;
  readonly out_path_rel: string;
  readonly scene_id: string;
  readonly seed_symbol_mapper: string;
  readonly seed_draft: string;
  readonly symbol_map_sha256: string;
  readonly prompt_sha256: string;
  readonly judge_config: {
    readonly temperature: number;
    readonly top_p: number;
    readonly max_tokens: number;
    readonly structured: boolean;
    readonly model: string;
  };
  readonly language: 'fr' | 'en';
  readonly judge_language: 'fr' | 'en';
  readonly engine_version: string;
  readonly timestamp_utc: string;
  readonly s_score_composite: number;
  readonly s_score_verdict: string;
  readonly macro_axes: Record<string, number>;
}

export interface LiveRunResult {
  readonly run_index: number;
  readonly success: boolean;
  readonly run_id_record: RunIdRecord | null;
  readonly error: string | null;
}

export interface LiveSummary {
  readonly live_id: string;
  readonly total_runs: number;
  readonly successful_runs: number;
  readonly failed_runs: number;
  readonly s_scores: readonly number[];
  readonly s_score_min: number;
  readonly s_score_max: number;
  readonly s_score_range: number;
  readonly s_score_mean: number;
  readonly verdicts: readonly string[];
  readonly all_seal: boolean;
  readonly gate_pass: boolean;
  readonly gate_criteria: {
    readonly required_seal_rate: string;
    readonly required_range_max: number;
    readonly actual_range: number;
  };
}

export interface AnthropicProviderConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly judgeStable: boolean;
  readonly draftTemperature: number;
  readonly judgeTemperature: number;
  readonly judgeTopP: number;
  readonly judgeMaxTokens: number;
}
