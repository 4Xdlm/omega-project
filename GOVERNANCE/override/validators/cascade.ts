/**
 * PHASE H — CASCADE VALIDATOR
 * Specification: HUMAN_OVERRIDE.md — OVR-005
 *
 * OVR-005: No cascade
 * Un override ne peut pas autoriser un autre override.
 *
 * INV-H-05: No cascade (override cannot authorize override)
 */

import type { OverrideEvent } from '../types.js';

/**
 * Check if an override targets another override (cascade violation).
 * @param override - Override to check
 * @returns true if cascade detected
 */
export function isCascadeOverride(override: OverrideEvent): boolean {
  const { scope } = override;

  // Check if target_rule references an override
  if (scope.target_rule.startsWith('OVR') ||
      scope.target_rule.startsWith('OVERRIDE') ||
      scope.target_rule.toLowerCase().includes('override')) {
    return true;
  }

  // Check if target_component references an override path
  if (scope.target_component.toLowerCase().includes('override')) {
    return true;
  }

  // Check if target_verdict references an override event
  if (scope.target_verdict.startsWith('OVR') ||
      scope.target_verdict.startsWith('OVERRIDE')) {
    return true;
  }

  return false;
}

/**
 * Validate OVR-005: No cascade.
 * @param override - Override to validate
 * @returns Validation result with error if cascade detected
 */
export function validateNoCascade(override: OverrideEvent): {
  valid: boolean;
  error?: string;
} {
  if (isCascadeOverride(override)) {
    return {
      valid: false,
      error: `OVR-005 violation: Override ${override.override_id} targets another override (cascade not allowed)`
    };
  }

  return { valid: true };
}

/**
 * Find cascade violations in a list of overrides.
 * @param overrides - Overrides to check
 * @returns Array of override IDs with cascade violations
 */
export function findCascadeViolations(
  overrides: readonly OverrideEvent[]
): readonly string[] {
  return overrides
    .filter(isCascadeOverride)
    .map(o => o.override_id);
}
