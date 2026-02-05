/**
 * PHASE H — OVERRIDE VALIDATION PIPELINE
 * Specification: HUMAN_OVERRIDE.md
 *
 * Orchestrates the full override validation workflow:
 * 1. Validate 5 conditions per override
 * 2. Check all 5 rules (OVR-001 to OVR-005)
 * 3. Compute summary
 * 4. Generate OVERRIDE_REPORT
 *
 * INV-H-01: 5 mandatory conditions (ALL required)
 * INV-H-02: Expiration enforced (max 90 days)
 * INV-H-03: Single approver required
 * INV-H-04: Hash chain maintained
 * INV-H-05: No cascade
 * INV-H-06: NON-ACTUATING (report only)
 */

import type {
  OverridePipelineArgs,
  OverrideReport,
  OverrideEvent
} from './types.js';
import { buildOverrideReport, GENERATOR } from './override_report.js';

// ─────────────────────────────────────────────────────────────
// PIPELINE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Run the full override validation pipeline.
 *
 * Workflow:
 * 1. Validate 5 conditions for each override
 * 2. Check all 5 OVR rules
 * 3. Aggregate results
 * 4. Generate OVERRIDE_REPORT
 *
 * INV-H-06: Pure function - no enforcement, report only.
 *
 * @param args - Pipeline inputs
 * @returns Complete OverrideReport
 */
export function runOverridePipeline(args: OverridePipelineArgs): OverrideReport {
  const { overrides, existingOverrides, generatedAt, prevEventHash } = args;

  return buildOverrideReport(
    overrides,
    existingOverrides ?? [],
    generatedAt,
    prevEventHash
  );
}

/**
 * Validate a single override event.
 * Returns the validation portion of the report for one override.
 *
 * @param override - Override to validate
 * @param existingOverrides - Existing overrides for renewal check
 * @param generatedAt - Timestamp for the validation
 * @returns Override report with single override
 */
export function validateSingleOverride(
  override: OverrideEvent,
  existingOverrides: readonly OverrideEvent[] = [],
  generatedAt?: string
): OverrideReport {
  return runOverridePipeline({
    overrides: [override],
    existingOverrides,
    generatedAt
  });
}

// Re-export for convenience
export { GENERATOR };
