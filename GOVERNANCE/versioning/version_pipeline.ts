/**
 * PHASE I — VERSION VALIDATION PIPELINE
 * Specification: VERSIONING_CONTRACT.md
 *
 * Orchestrates the full version validation workflow:
 * 1. Validate semantic versions
 * 2. Check bump type correctness
 * 3. Validate all 5 rules (VER-001 to VER-005)
 * 4. Build compatibility matrix
 * 5. Generate VERSION_REPORT
 *
 * INV-I-01 to INV-I-09: Version invariants
 * INV-I-10: NON-ACTUATING (report only)
 */

import type {
  VersionPipelineArgs,
  VersionReport,
  VersionContractEvent,
  Deprecation
} from './types.js';
import { buildVersionReport, GENERATOR } from './version_report.js';
import { isValidSemver, detectBumpType, isDowngrade } from './version_utils.js';

// ─────────────────────────────────────────────────────────────
// PIPELINE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Run the full version validation pipeline.
 *
 * Workflow:
 * 1. Validate semantic version format for each event
 * 2. Validate bump type matches actual change
 * 3. Check all 5 VER rules
 * 4. Build compatibility matrix
 * 5. Generate VERSION_REPORT
 *
 * INV-I-10: Pure function - no enforcement, report only.
 *
 * @param args - Pipeline inputs
 * @returns Complete VersionReport
 */
export function runVersionPipeline(args: VersionPipelineArgs): VersionReport {
  const { events, existingVersions, generatedAt, prevEventHash } = args;

  // Extract existing deprecations from previous versions context
  const existingDeprecations: Deprecation[] = [];
  // In a real scenario, deprecations would be loaded from a registry
  // For now, collect from events themselves
  for (const event of events) {
    existingDeprecations.push(...event.deprecations);
  }

  return buildVersionReport(
    events,
    existingDeprecations,
    generatedAt,
    prevEventHash
  );
}

/**
 * Validate a single version contract event.
 * Returns the validation portion of the report for one event.
 *
 * @param event - Version event to validate
 * @param existingDeprecations - Existing deprecations for VER-004 check
 * @param generatedAt - Timestamp for the validation
 * @returns Version report with single event
 */
export function validateSingleVersionEvent(
  event: VersionContractEvent,
  existingDeprecations: readonly Deprecation[] = [],
  generatedAt?: string
): VersionReport {
  return buildVersionReport(
    [event],
    existingDeprecations,
    generatedAt
  );
}

/**
 * Validate version transition.
 * Checks if transitioning from one version to another is valid.
 *
 * @param fromVersion - Current version
 * @param toVersion - Target version
 * @param bumpType - Intended bump type
 * @param hasBreakingChanges - Whether breaking changes are present
 * @returns Validation result with errors
 */
export function validateVersionTransition(
  fromVersion: string,
  toVersion: string,
  bumpType: 'major' | 'minor' | 'patch',
  hasBreakingChanges: boolean
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Import from version_utils (already imported at module level indirectly via report)

  // Validate semver format
  if (!isValidSemver(fromVersion)) {
    errors.push(`Invalid source version format: ${fromVersion}`);
  }
  if (!isValidSemver(toVersion)) {
    errors.push(`Invalid target version format: ${toVersion}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Check for downgrade
  if (isDowngrade(fromVersion, toVersion)) {
    errors.push('INV-I-09: Version downgrade not allowed');
  }

  // Validate bump type
  const detectedBump = detectBumpType(fromVersion, toVersion);
  if (detectedBump !== bumpType) {
    errors.push(`Bump type mismatch: expected ${detectedBump}, got ${bumpType}`);
  }

  // INV-I-02: Breaking changes require MAJOR bump
  if (hasBreakingChanges && bumpType !== 'major') {
    errors.push('INV-I-02: Breaking changes require MAJOR version bump');
  }

  // INV-I-03: MINOR/PATCH must be backward compatible
  if (!hasBreakingChanges && bumpType === 'major' && detectedBump !== 'major') {
    // Warning: MAJOR bump without breaking changes
    // This is allowed but unusual
  }

  return { valid: errors.length === 0, errors };
}

// Re-export for convenience
export { GENERATOR };
