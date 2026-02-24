/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — VALIDATION RUNNER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/validation-runner.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Phase VALIDATION — Offline Mock Runner
 *
 * runExperiment(): for each case × N runs, generate prose → runSovereignPipeline
 * → collect RunResult → compute ExperimentSummary
 *
 * INV-VAL-01: seed = SHA256(exp_id + case_id + run_index)
 * INV-VAL-02: sealed + rejected + failed === total_runs ALWAYS
 * INV-VAL-06: same config + same corpus → same summary_hash
 * INV-VAL-07: baseline.value = null → mean_improvement = null
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import { runSovereignPipeline, runSovereignPipelineAsync } from '../pipeline/sovereign-pipeline.js';
import type { ForgePacket } from '../types.js';
import type { SScoreV2 } from '../oracle/s-oracle-v2.js';
import type { OfflineSovereignLoopResult } from '../pitch/sovereign-loop.js';
import type { LLMJudge } from '../oracle/llm-judge.js';
import type {
  LLMProvider,
  ValidationConfig,
  RunResult,
  ExperimentSummary,
} from './validation-types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EMPTY STUBS — for EXECUTION_FAIL results
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_SSCORE: SScoreV2 = {
  axes: [],
  composite: 0,
  emotion_weight_ratio: 0,
  verdict: 'REJECT',
  s_score_hash: sha256(canonicalize({ axes: [], composite: 0 })),
  scored_at: '',
};

const EMPTY_LOOP: OfflineSovereignLoopResult = {
  final_prose: '',
  nb_passes: 0,
  loop_trace: [],
  was_corrected: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export async function runExperiment(
  experimentId: string,
  cases: readonly ForgePacket[],
  provider: LLMProvider,
  config: ValidationConfig,
  judge?: LLMJudge,
): Promise<ExperimentSummary> {
  const runsPerCase = Math.ceil(config.run_count_per_experiment / cases.length);
  const runs: RunResult[] = [];

  for (const packet of cases) {
    for (let runIndex = 0; runIndex < runsPerCase; runIndex++) {
      // INV-VAL-01: deterministic seed
      const seed = sha256(experimentId + packet.packet_id + String(runIndex));
      const prose = await provider.generateDraft(packet, seed);

      let run: RunResult;

      try {
        // Use async pipeline with LLM judges if judge is provided
        const result = judge
          ? await runSovereignPipelineAsync(prose, packet, judge, seed)
          : runSovereignPipeline(prose, packet);

        const verdict: 'SEAL' | 'REJECT' = result.verdict;

        // Compute run_hash from deterministic fields only
        const hashable = {
          experiment_id: experimentId,
          case_id: packet.packet_id,
          run_index: runIndex,
          seed,
          verdict,
          composite: result.s_score_final.composite,
          pipeline_hash: result.pipeline_hash,
          model_id: provider.model_id,
        };

        run = {
          run_index: runIndex,
          experiment_id: experimentId,
          case_id: packet.packet_id,
          seed,
          prose_generated: prose,
          s_score_initial: result.s_score_initial,
          sovereign_loop: result.sovereign_loop,
          s_score_final: result.s_score_final,
          verdict,
          model_id: provider.model_id,
          run_hash: sha256(canonicalize(hashable)),
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        const hashable = {
          experiment_id: experimentId,
          case_id: packet.packet_id,
          run_index: runIndex,
          seed,
          verdict: 'EXECUTION_FAIL',
          composite: 0,
          pipeline_hash: '',
          model_id: provider.model_id,
        };

        run = {
          run_index: runIndex,
          experiment_id: experimentId,
          case_id: packet.packet_id,
          seed,
          prose_generated: prose,
          s_score_initial: EMPTY_SSCORE,
          sovereign_loop: EMPTY_LOOP,
          s_score_final: EMPTY_SSCORE,
          verdict: 'EXECUTION_FAIL',
          error: errorMessage,
          model_id: provider.model_id,
          run_hash: sha256(canonicalize(hashable)),
        };
      }

      runs.push(run);
    }
  }

  return computeSummary(experimentId, runs, provider.model_id, config);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeSummary(
  experimentId: string,
  runs: readonly RunResult[],
  modelId: string,
  config: ValidationConfig,
): ExperimentSummary {
  const totalRuns = runs.length;
  const sealedRuns = runs.filter((r) => r.verdict === 'SEAL');
  const rejectedRuns = runs.filter((r) => r.verdict === 'REJECT');
  const failedRuns = runs.filter((r) => r.verdict === 'EXECUTION_FAIL');

  const sealedCount = sealedRuns.length;
  const rejectedCount = rejectedRuns.length;
  const failedCount = failedRuns.length;

  // INV-VAL-02: strict accounting
  if (sealedCount + rejectedCount + failedCount !== totalRuns) {
    throw new Error(
      `INV-VAL-02 VIOLATION: sealed(${sealedCount}) + rejected(${rejectedCount}) + failed(${failedCount}) !== total(${totalRuns})`,
    );
  }

  const rejectRate = totalRuns > 0 ? rejectedCount / totalRuns : 0;

  // Percentage with composite >= 92
  const aboveThreshold = runs.filter(
    (r) => r.verdict !== 'EXECUTION_FAIL' && r.s_score_final.composite >= 92,
  ).length;
  const pctAbove92 = totalRuns > 0 ? aboveThreshold / totalRuns : 0;

  // Mean S-Score for sealed runs
  const meanSScoreSealed =
    sealedCount > 0
      ? sealedRuns.reduce((sum, r) => sum + r.s_score_final.composite, 0) / sealedCount
      : 0;

  // Corr 14D distribution: tension_14d axis raw scores from all non-failed runs
  const corr14d: number[] = [];
  for (const run of runs) {
    if (run.verdict !== 'EXECUTION_FAIL') {
      const tensionAxis = run.s_score_final.axes.find((a) => a.name === 'tension_14d');
      if (tensionAxis) {
        corr14d.push(tensionAxis.raw);
      }
    }
  }

  const meanCorr14d =
    corr14d.length > 0 ? corr14d.reduce((a, b) => a + b, 0) / corr14d.length : 0;

  // INV-VAL-07: baseline null propagation
  const baselineValue = config.baseline.value;
  const meanImprovement =
    baselineValue !== null && baselineValue !== undefined
      ? meanSScoreSealed - baselineValue
      : null;

  // Build hashable summary (deterministic fields only — no timestamps)
  const hashable = {
    experiment_id: experimentId,
    mode: config.mode,
    total_runs: totalRuns,
    sealed_count: sealedCount,
    rejected_count: rejectedCount,
    failed_count: failedCount,
    reject_rate: rejectRate,
    pct_above_92: pctAbove92,
    mean_s_score_sealed: meanSScoreSealed,
    mean_corr_14d: meanCorr14d,
    model_id: modelId,
    baseline_value: baselineValue,
    mean_improvement: meanImprovement,
    run_hashes: runs.map((r) => r.run_hash),
  };

  return {
    experiment_id: experimentId,
    mode: config.mode,
    total_runs: totalRuns,
    sealed_count: sealedCount,
    rejected_count: rejectedCount,
    failed_count: failedCount,
    reject_rate: rejectRate,
    pct_above_92: pctAbove92,
    mean_s_score_sealed: meanSScoreSealed,
    mean_improvement: meanImprovement,
    corr_14d_distribution: corr14d,
    mean_corr_14d: meanCorr14d,
    baseline: {
      value: baselineValue,
      mean_improvement: meanImprovement,
    },
    model_id: modelId,
    runs,
    summary_hash: sha256(canonicalize(hashable)),
  };
}
