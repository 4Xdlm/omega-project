/**
 * PHASE G — MISUSE DETECTION PIPELINE
 * Specification: ABUSE_CASES.md
 *
 * Orchestrates the full misuse detection workflow:
 * COLLECT → DETECT (all 5 cases) → AGGREGATE → GENERATE REPORT
 *
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure function, no I/O)
 */

import type {
  MisuseObservationSources,
  MisuseReport,
  MisuseDetectorFn,
  MisusePipelineArgs,
  MisuseEvent
} from './types.js';

import {
  detectPromptInjection,
  detectThresholdGaming,
  detectOverrideAbuse,
  detectLogTampering,
  detectReplayAttack
} from './detectors/index.js';

import { buildMisuseReport, GENERATOR } from './misuse_report.js';

// ─────────────────────────────────────────────────────────────
// DETECTOR REGISTRY
// ─────────────────────────────────────────────────────────────

/** All 5 detectors in case order (deterministic) */
const ALL_DETECTORS: readonly MisuseDetectorFn[] = [
  detectPromptInjection,   // CASE-001
  detectThresholdGaming,   // CASE-002
  detectOverrideAbuse,     // CASE-003
  detectLogTampering,      // CASE-004
  detectReplayAttack       // CASE-005
] as const;

// ─────────────────────────────────────────────────────────────
// PIPELINE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Run the full misuse detection pipeline.
 *
 * Workflow:
 * 1. Run all 5 detectors sequentially (determinism)
 * 2. Collect all misuse events
 * 3. Build summary
 * 4. Generate MISUSE_REPORT
 *
 * INV-G-03: Pure function - no I/O, no side effects.
 * INV-G-01, INV-G-02: All events are non-actuating.
 *
 * @param args - Pipeline inputs
 * @returns Complete MisuseReport
 */
export function runMisusePipeline(args: MisusePipelineArgs): MisuseReport {
  return runMisusePipelineWithDetectors(args, ALL_DETECTORS);
}

/**
 * Run pipeline with custom detectors (for testing).
 * Same guarantees as runMisusePipeline.
 * @param args - Pipeline inputs
 * @param detectors - Custom detector array
 * @returns Complete MisuseReport
 */
export function runMisusePipelineWithDetectors(
  args: MisusePipelineArgs,
  detectors: readonly MisuseDetectorFn[]
): MisuseReport {
  const { observations, generatedAt, prevEventHash } = args;

  // Collect all misuse events from all detectors
  const allEvents: MisuseEvent[] = [];
  let chainHash = prevEventHash ?? null;

  // Run each detector sequentially (determinism)
  for (const detector of detectors) {
    const events = detector(observations, chainHash);
    allEvents.push(...events);

    // Update chain hash for next detector
    if (events.length > 0) {
      chainHash = events[events.length - 1].event_id;
    }
  }

  // Build and return the report
  return buildMisuseReport(
    allEvents,
    observations,
    generatedAt,
    prevEventHash
  );
}

// Re-export for convenience
export { GENERATOR };
export { ALL_DETECTORS };
