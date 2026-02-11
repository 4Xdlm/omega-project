/**
 * OMEGA Metrics — Global Score Calculator
 * Phase R-METRICS — Weighted aggregate with hard fails
 */

import type {
  StructuralMetrics, SemanticMetrics, DynamicMetrics,
  GlobalScore, WeightConfig, ThresholdConfig,
} from '../types.js';
import { DEFAULT_WEIGHTS } from './weights.js';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  pass: 0.90,
  warn: 0.80,
  fail_below: 0.80,
  hard_fails: {
    canon_violation_count_must_equal: 0,
    intra_intent_stability_must_gte: 0.999,
  },
};

/**
 * Compute weighted average for a category, handling null (SKIP) values.
 * Redistributes weight from SKIP metrics to non-SKIP metrics.
 */
function weightedAverage(
  values: Record<string, number | null>,
  weights: Record<string, number>,
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue; // SKIP
    const w = weights[key] ?? 0;
    weightedSum += value * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return 0;

  // Redistribute: normalize by actual total weight (not 1.0)
  return weightedSum / totalWeight;
}

/**
 * Compute global score from all metrics
 */
export function computeGlobalScore(
  structural: StructuralMetrics,
  semantic: SemanticMetrics,
  dynamic: DynamicMetrics,
  weights: WeightConfig = DEFAULT_WEIGHTS,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS,
): GlobalScore {
  // Category scores
  const structuralScore = weightedAverage(
    { ...structural } as unknown as Record<string, number | null>,
    weights.structural as unknown as Record<string, number>,
  );

  // Semantic: exclude canon_violation_count from weighted average (it's a hard fail metric)
  const semanticValues: Record<string, number | null> = {
    intent_theme_coverage: semantic.intent_theme_coverage,
    theme_fidelity: semantic.theme_fidelity,
    canon_respect: semantic.canon_respect,
    emotion_trajectory_alignment: semantic.emotion_trajectory_alignment,
    constraint_satisfaction: semantic.constraint_satisfaction,
  };
  const semanticScore = weightedAverage(
    semanticValues,
    weights.semantic as unknown as Record<string, number>,
  );

  const dynamicScore = weightedAverage(
    { ...dynamic } as unknown as Record<string, number | null>,
    weights.dynamic as unknown as Record<string, number>,
  );

  // Check if dynamic has any non-SKIP metrics
  const hasDynamic = Object.values(dynamic).some(v => v !== null);

  // Global weighted score with category-level SKIP redistribution
  let global: number;
  if (hasDynamic) {
    global =
      structuralScore * weights.category.structural +
      semanticScore * weights.category.semantic +
      dynamicScore * weights.category.dynamic;
  } else {
    // Redistribute dynamic weight to structural + semantic
    const redistTotal = weights.category.structural + weights.category.semantic;
    global =
      structuralScore * (weights.category.structural / redistTotal) +
      semanticScore * (weights.category.semantic / redistTotal);
  }

  // Check hard fails
  const hardFails: string[] = [];

  if (semantic.canon_violation_count > thresholds.hard_fails.canon_violation_count_must_equal) {
    hardFails.push(`canon_violation_count=${semantic.canon_violation_count} (must be ${thresholds.hard_fails.canon_violation_count_must_equal})`);
  }

  if (dynamic.intra_intent_stability !== null &&
      dynamic.intra_intent_stability < thresholds.hard_fails.intra_intent_stability_must_gte) {
    hardFails.push(`intra_intent_stability=${dynamic.intra_intent_stability} (must be >= ${thresholds.hard_fails.intra_intent_stability_must_gte})`);
  }

  // Determine status
  let status: 'PASS' | 'WARN' | 'FAIL';
  if (hardFails.length > 0) {
    status = 'FAIL';
  } else if (global >= thresholds.pass) {
    status = 'PASS';
  } else if (global >= thresholds.warn) {
    status = 'WARN';
  } else {
    status = 'FAIL';
  }

  return {
    structural: Math.round(structuralScore * 10000) / 10000,
    semantic: Math.round(semanticScore * 10000) / 10000,
    dynamic: Math.round(dynamicScore * 10000) / 10000,
    global: Math.round(global * 10000) / 10000,
    status,
    hard_fails: hardFails,
  };
}
