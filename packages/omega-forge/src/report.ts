/**
 * OMEGA Forge — Report Generation
 * Phase C.5 — ForgeReport with metrics, benchmark, prescriptions
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  ForgeReport, ForgeMetrics, ForgeProfile,
  Prescription, F5InvariantId, F5Verdict, F5Config,
  TrajectoryAnalysis, LawComplianceReport, QualityEnvelope,
  DeadZone,
} from './types.js';
import { hashF5Config } from './config.js';

/** Build forge metrics from analysis results */
export function buildForgeMetrics(
  trajectory: TrajectoryAnalysis,
  laws: LawComplianceReport,
  quality: QualityEnvelope,
  deadZones: readonly DeadZone[],
  prescriptions: readonly Prescription[],
  emotionScore: number,
  compositeScore: number,
): ForgeMetrics {
  const m = quality.metrics;
  return {
    total_paragraphs: trajectory.paragraph_states.length,
    emotion_coverage: trajectory.paragraph_states.length > 0 ? 1 : 0,
    trajectory_compliance: trajectory.compliant_ratio,
    avg_cosine_distance: trajectory.avg_cosine_distance,
    avg_euclidean_distance: trajectory.avg_euclidean_distance,
    forced_transitions: laws.forced_transitions,
    feasibility_failures: laws.feasibility_failures,
    law4_violations: laws.law4_violations,
    flux_balance_error: laws.flux_conservation.balance_error,
    M1: m.M1_contradiction_rate,
    M2: m.M2_canon_compliance,
    M3: m.M3_coherence_span,
    M4: m.M4_arc_maintenance,
    M5: m.M5_memory_integrity,
    M6: m.M6_style_emergence,
    M7: m.M7_author_fingerprint,
    M8: m.M8_sentence_necessity,
    M9: m.M9_semantic_density,
    M10: m.M10_reading_levels,
    M11: m.M11_discomfort_index,
    M12: m.M12_superiority_index,
    emotion_score: emotionScore,
    quality_score: quality.quality_score,
    composite_score: compositeScore,
    dead_zones_count: deadZones.length,
    prescriptions_count: prescriptions.length,
    critical_prescriptions: prescriptions.filter((p) => p.priority === 'CRITICAL').length,
  };
}

/** Build the forge report */
export function buildForgeReport(
  forgeId: string,
  inputHash: string,
  verdict: F5Verdict,
  metrics: ForgeMetrics,
  benchmark: ForgeProfile,
  prescriptions: readonly Prescription[],
  invariantsChecked: readonly F5InvariantId[],
  invariantsPassed: readonly F5InvariantId[],
  invariantsFailed: readonly F5InvariantId[],
  config: F5Config,
  timestamp: string,
): ForgeReport {
  const configHash = hashF5Config(config);

  const reportData = {
    forge_id: forgeId,
    input_hash: inputHash,
    verdict,
    composite: metrics.composite_score,
    config_hash: configHash,
  };
  const reportHash = sha256(canonicalize(reportData));

  return {
    forge_id: forgeId,
    input_hash: inputHash,
    verdict,
    metrics,
    benchmark,
    prescriptions_summary: prescriptions,
    invariants_checked: invariantsChecked,
    invariants_passed: invariantsPassed,
    invariants_failed: invariantsFailed,
    config_hash: configHash,
    report_hash: reportHash,
    timestamp_deterministic: timestamp,
  };
}

/** Generate markdown report */
export function forgeReportToMarkdown(report: ForgeReport): string {
  const lines: string[] = [
    `# OMEGA Forge Report`,
    ``,
    `**Forge ID**: ${report.forge_id}`,
    `**Verdict**: ${report.verdict}`,
    `**Composite Score**: ${report.metrics.composite_score.toFixed(4)}`,
    `**Timestamp**: ${report.timestamp_deterministic}`,
    ``,
    `## Metrics`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Emotion Score | ${report.metrics.emotion_score.toFixed(4)} |`,
    `| Quality Score | ${report.metrics.quality_score.toFixed(4)} |`,
    `| Trajectory Compliance | ${report.metrics.trajectory_compliance.toFixed(4)} |`,
    `| Forced Transitions | ${report.metrics.forced_transitions} |`,
    `| Dead Zones | ${report.metrics.dead_zones_count} |`,
    `| Prescriptions | ${report.metrics.prescriptions_count} (${report.metrics.critical_prescriptions} critical) |`,
    ``,
    `## Invariants`,
    ``,
    `- Checked: ${report.invariants_checked.length}`,
    `- Passed: ${report.invariants_passed.length}`,
    `- Failed: ${report.invariants_failed.length}`,
    ``,
    `## Hashes`,
    ``,
    `- Input: ${report.input_hash}`,
    `- Config: ${report.config_hash}`,
    `- Report: ${report.report_hash}`,
  ];

  return lines.join('\n');
}
