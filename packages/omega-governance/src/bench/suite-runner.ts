/**
 * OMEGA Governance — Suite Runner
 * Phase D.2 — Execute benchmark suite by reading existing run results
 *
 * Note: This does NOT execute the pipeline. It reads ProofPack results from
 * pre-existing runs and extracts metrics for benchmarking.
 */

import type { ProofPackData } from '../core/types.js';
import type { BenchRunResult } from './types.js';

/** Extract bench run result from a ProofPack */
export function extractBenchResult(
  data: ProofPackData,
  intentName: string,
  durationMs: number,
): BenchRunResult {
  const forgeScore = data.forgeReport?.metrics.composite_score ?? 0;
  const emotionScore = data.forgeReport?.metrics.emotion_score ?? 0;
  const qualityScore = data.forgeReport?.metrics.quality_score ?? 0;

  return {
    intent_name: intentName,
    run_id: data.runId,
    forge_score: forgeScore,
    emotion_score: emotionScore,
    quality_score: qualityScore,
    duration_ms: durationMs,
    verdict: data.manifest.verdict,
  };
}

/** Extract bench results from multiple ProofPacks for the same intent */
export function extractBenchResults(
  packs: readonly ProofPackData[],
  intentName: string,
  durations: readonly number[],
): readonly BenchRunResult[] {
  if (packs.length !== durations.length) {
    throw new Error('Packs and durations arrays must have the same length');
  }
  return packs.map((p, i) => extractBenchResult(p, intentName, durations[i]));
}
