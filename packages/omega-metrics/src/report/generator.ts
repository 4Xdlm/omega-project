/**
 * OMEGA Metrics — Report Generator
 * Phase R-METRICS — Creates MetricsReport from run artifacts
 */

import type { MetricsReport, MetricEvidence, MetricConfig, RunArtifacts, GlobalScore } from '../types.js';
import { computeStructuralMetrics } from '../metrics/structural.js';
import { computeSemanticMetrics } from '../metrics/semantic.js';
import { computeDynamicMetrics } from '../metrics/dynamic.js';
import { computeGlobalScore } from '../score/global.js';
import { hashArtifacts, hashReport } from '../hasher.js';

export const DEFAULT_METRIC_CONFIG: MetricConfig = {
  MIN_BEATS_PER_SCENE: 2,
  MAX_BEATS_PER_SCENE: 12,
  SEED_BLOOM_MAX_DISTANCE: 0.7,
  MAX_TENSION_PLATEAU: 3,
  MAX_TENSION_DROP: 3,
  MIN_CONFLICT_TYPES: 2,
};

/**
 * Generate a full metrics report for a single run
 */
export function generateReport(
  artifacts: RunArtifacts,
  sourceDir: string,
  timestamp: string,
  replayArtifacts?: RunArtifacts | null,
  otherRunArtifacts?: RunArtifacts | null,
  config: MetricConfig = DEFAULT_METRIC_CONFIG,
): MetricsReport {
  const { plan, intent, run_id } = artifacts;

  // Compute structural metrics
  const structural = computeStructuralMetrics(plan, config);

  // Compute semantic metrics
  const semantic = computeSemanticMetrics(plan, intent);

  // Prepare dynamic comparison data
  const runSummary = {
    artifacts_hash: '', // will be set below
    plan_hash: plan.plan_hash || '',
    arc_themes: plan.arcs.map(a => a.theme),
    scene_count: plan.scene_count,
    beat_count: plan.beat_count,
    arc_count: plan.arcs.length,
    final_emotion: plan.emotion_trajectory.length > 0
      ? plan.emotion_trajectory[plan.emotion_trajectory.length - 1].emotion
      : '',
  };

  const replaySummary = replayArtifacts ? {
    artifacts_hash: '',
    plan_hash: replayArtifacts.plan.plan_hash || '',
    scene_count: replayArtifacts.plan.scene_count,
    beat_count: replayArtifacts.plan.beat_count,
    arc_count: replayArtifacts.plan.arcs.length,
  } : null;

  const otherSummary = otherRunArtifacts ? {
    plan_hash: otherRunArtifacts.plan.plan_hash || '',
    arc_themes: otherRunArtifacts.plan.arcs.map(a => a.theme),
    scene_count: otherRunArtifacts.plan.scene_count,
    beat_count: otherRunArtifacts.plan.beat_count,
    arc_count: otherRunArtifacts.plan.arcs.length,
    final_emotion: otherRunArtifacts.plan.emotion_trajectory.length > 0
      ? otherRunArtifacts.plan.emotion_trajectory[otherRunArtifacts.plan.emotion_trajectory.length - 1].emotion
      : '',
  } : null;

  // Compute dynamic metrics
  const dynamic = computeDynamicMetrics(runSummary, replaySummary, otherSummary);

  // Compute global score
  const structuralTyped = {
    arc_completeness: structural.arc_completeness,
    scene_completeness: structural.scene_completeness,
    beat_coverage: structural.beat_coverage,
    seed_integrity: structural.seed_integrity,
    tension_monotonicity: structural.tension_monotonicity,
    conflict_diversity: structural.conflict_diversity,
    causal_depth: structural.causal_depth,
    structural_entropy: structural.structural_entropy,
  };

  const score = computeGlobalScore(structuralTyped, semantic, dynamic);

  // Build evidence
  const evidence: MetricEvidence[] = [];
  for (const [key, value] of Object.entries(structural)) {
    evidence.push({ metric: `structural.${key}`, value, detail: `S-metric ${key}` });
  }
  for (const [key, value] of Object.entries(semantic)) {
    if (typeof value === 'number') {
      evidence.push({ metric: `semantic.${key}`, value, detail: `M-metric ${key}` });
    }
  }
  for (const [key, value] of Object.entries(dynamic)) {
    if (value !== null) {
      evidence.push({ metric: `dynamic.${key}`, value, detail: `D-metric ${key}` });
    } else {
      evidence.push({ metric: `dynamic.${key}`, value: 0, detail: `SKIP — insufficient data` });
    }
  }

  // Build report (without hash first)
  const report: Record<string, unknown> = {
    report_version: '1.0.0' as const,
    run_id,
    source_dir: sourceDir,
    artifacts_hash: '', // placeholder
    timestamp,
    metrics: {
      structural: structuralTyped,
      semantic,
      dynamic,
    },
    score,
    evidence,
    report_hash: '',
  };

  // Try to compute artifacts hash (may fail if paths unavailable)
  try {
    report.artifacts_hash = hashArtifacts(sourceDir, run_id);
  } catch {
    report.artifacts_hash = 'unavailable';
  }

  // Compute report hash
  report.report_hash = hashReport(report);

  return report as unknown as MetricsReport;
}
