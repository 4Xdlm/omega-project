/**
 * PHASE E — DRIFT DETECTION PIPELINE
 * Specification: PHASE_E_SPECIFICATION v1.2
 *
 * Orchestrates the full drift detection workflow:
 * COLLECT → DETECT → SCORE → GENERATE REPORT
 *
 * INV-E-01: Read-only (no BUILD code access)
 * INV-E-02: Zero side effects (pure function, no I/O)
 * INV-E-03: No BUILD recalculation
 * INV-E-06: Non-actuating (returns report, does nothing else)
 * INV-E-08: DRIFT_REPORT requires trigger_events
 */

import type {
  ObservationSources,
  Baseline,
  DriftResult,
  DriftReport,
  DriftDetectorFn,
  DriftClassification
} from './types.js';
import { classifyScore, getRecommendation, getEscalationTarget } from './scoring.js';
import { generateReportId, buildSummary, computeWindow, validateDriftReport } from './drift_utils.js';
import { detectSemanticDrift } from './detectors/semantic_drift.js';
import { detectOutputDrift } from './detectors/output_drift.js';
import { detectFormatDrift } from './detectors/format_drift.js';
import { detectTemporalDrift } from './detectors/temporal_drift.js';
import { detectPerformanceDrift } from './detectors/performance_drift.js';
import { detectVarianceDrift } from './detectors/variance_drift.js';
import { detectToolingDrift } from './detectors/tooling_drift.js';
import { detectContractDrift } from './detectors/contract_drift.js';

/** Generator identifier per spec */
const GENERATOR = 'Phase E Drift Detector v1.0';

/** All 8 detectors in taxonomy order */
const ALL_DETECTORS: readonly DriftDetectorFn[] = [
  detectSemanticDrift,
  detectOutputDrift,
  detectFormatDrift,
  detectTemporalDrift,
  detectPerformanceDrift,
  detectVarianceDrift,
  detectToolingDrift,
  detectContractDrift
] as const;

/**
 * Pipeline arguments.
 * INV-E-08: triggerEvents must be non-empty.
 */
export interface PipelineArgs {
  readonly observations: ObservationSources;
  readonly baseline: Baseline;
  readonly triggerEvents: readonly string[];
  readonly generatedAt?: string;
}

/**
 * Run the full drift detection pipeline.
 *
 * Workflow:
 * 1. Validate inputs (INV-E-08: trigger_events non-empty)
 * 2. Run all 8 detectors sequentially (determinism)
 * 3. Collect results
 * 4. Build summary and classification
 * 5. Generate DRIFT_REPORT
 *
 * INV-E-02: Pure function — no I/O, no side effects.
 * INV-E-06: Non-actuating — returns data only.
 *
 * @param args - Pipeline inputs
 * @returns Complete DriftReport
 * @throws Error if trigger_events is empty (INV-E-08)
 */
export function runDriftPipeline(args: PipelineArgs): DriftReport {
  const { observations, baseline, triggerEvents, generatedAt } = args;

  // INV-E-08: DRIFT_REPORT requires trigger_events
  if (!triggerEvents || triggerEvents.length === 0) {
    throw new Error('INV-E-08: trigger_events must be non-empty');
  }

  // Run all 8 detectors sequentially (deterministic order)
  const detectedDrifts: DriftResult[] = [];
  for (const detector of ALL_DETECTORS) {
    const result = detector(observations, baseline);
    if (result !== null) {
      detectedDrifts.push(result);
    }
  }

  // Build summary
  const summary = buildSummary(detectedDrifts);

  // Determine overall classification
  const overallClassification = summary.highest_score > 0
    ? classifyScore(summary.highest_score)
    : 'STABLE' as DriftClassification;

  // Compute observation window from all timestamps
  const allTimestamps = extractAllTimestamps(observations);
  const window = computeWindow(allTimestamps);

  // Generate report
  const now = generatedAt ?? new Date().toISOString();
  const reportId = generateReportId(new Date(now), JSON.stringify(detectedDrifts));

  const report: DriftReport = {
    report_id: reportId,
    version: '1.0',
    baseline_ref: baseline.sha256,
    window,
    trigger_events: triggerEvents,
    detected_drifts: detectedDrifts,
    summary,
    recommendation: getRecommendation(overallClassification),
    escalation_target: getEscalationTarget(overallClassification),
    notes: 'No automatic action taken. Awaiting human decision.',
    generated_at: now,
    generator: GENERATOR
  };

  // Self-validate the report
  const validation = validateDriftReport(report);
  if (!validation.valid) {
    throw new Error(`DRIFT_REPORT validation failed: ${validation.errors.join('; ')}`);
  }

  return report;
}

/**
 * Run pipeline with a custom set of detectors (for testing).
 * Same guarantees as runDriftPipeline.
 */
export function runDriftPipelineWithDetectors(
  args: PipelineArgs,
  detectors: readonly DriftDetectorFn[]
): DriftReport {
  const { observations, baseline, triggerEvents, generatedAt } = args;

  if (!triggerEvents || triggerEvents.length === 0) {
    throw new Error('INV-E-08: trigger_events must be non-empty');
  }

  const detectedDrifts: DriftResult[] = [];
  for (const detector of detectors) {
    const result = detector(observations, baseline);
    if (result !== null) {
      detectedDrifts.push(result);
    }
  }

  const summary = buildSummary(detectedDrifts);
  const overallClassification = summary.highest_score > 0
    ? classifyScore(summary.highest_score)
    : 'STABLE' as DriftClassification;

  const allTimestamps = extractAllTimestamps(observations);
  const window = computeWindow(allTimestamps);

  const now = generatedAt ?? new Date().toISOString();
  const reportId = generateReportId(new Date(now), JSON.stringify(detectedDrifts));

  const report: DriftReport = {
    report_id: reportId,
    version: '1.0',
    baseline_ref: baseline.sha256,
    window,
    trigger_events: triggerEvents,
    detected_drifts: detectedDrifts,
    summary,
    recommendation: getRecommendation(overallClassification),
    escalation_target: getEscalationTarget(overallClassification),
    notes: 'No automatic action taken. Awaiting human decision.',
    generated_at: now,
    generator: GENERATOR
  };

  const validation = validateDriftReport(report);
  if (!validation.valid) {
    throw new Error(`DRIFT_REPORT validation failed: ${validation.errors.join('; ')}`);
  }

  return report;
}

function extractAllTimestamps(observations: ObservationSources): string[] {
  const timestamps: string[] = [];

  for (const snap of observations.snapshots) {
    timestamps.push(snap.timestamp_utc);
  }
  for (const entry of observations.logEntries) {
    timestamps.push(entry.timestamp_utc);
  }
  for (const event of observations.runtimeEvents) {
    timestamps.push(event.timestamp_utc);
  }

  return timestamps;
}
