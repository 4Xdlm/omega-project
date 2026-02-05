/**
 * PHASE H — RULE VALIDATORS
 * Specification: HUMAN_OVERRIDE.md
 *
 * Validates all 5 override rules:
 * OVR-001: No perpetual override
 * OVR-002: Single approver
 * OVR-003: Audit trail
 * OVR-004: Review before renewal
 * OVR-005: No cascade
 */

import type { OverrideEvent, OverrideRuleCode } from '../types.js';
import { OVERRIDE_MAX_DAYS } from '../types.js';
import { isCascadeOverride } from './cascade.js';

/**
 * Rule violation result.
 */
export interface RuleViolation {
  readonly rule: OverrideRuleCode;
  readonly override_id: string;
  readonly description: string;
}

/**
 * Validate OVR-001: No perpetual override.
 * Maximum 90 days, type-specific limits enforced.
 * @param override - Override to validate
 * @returns Violation if rule broken, null otherwise
 */
export function validateOVR001(override: OverrideEvent): RuleViolation | null {
  const { validity, type, override_id } = override;

  if (!validity.expires_at || validity.expires_at.trim() === '') {
    return {
      rule: 'OVR-001',
      override_id,
      description: 'No expiration date defined (perpetual override not allowed)'
    };
  }

  const effectiveDate = new Date(validity.effective_from);
  const expiresDate = new Date(validity.expires_at);
  const durationDays = Math.ceil(
    (expiresDate.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const maxDays = OVERRIDE_MAX_DAYS[type];

  if (durationDays > maxDays) {
    return {
      rule: 'OVR-001',
      override_id,
      description: `Duration ${durationDays} days exceeds maximum ${maxDays} days for type ${type}`
    };
  }

  if (durationDays > 90) {
    return {
      rule: 'OVR-001',
      override_id,
      description: `Duration ${durationDays} days exceeds absolute maximum of 90 days`
    };
  }

  return null;
}

/**
 * Validate OVR-002: Single approver.
 * Un override = un approbateur identifié.
 * @param override - Override to validate
 * @returns Violation if rule broken, null otherwise
 */
export function validateOVR002(override: OverrideEvent): RuleViolation | null {
  const { approval, override_id } = override;

  if (!approval.approver || approval.approver.trim() === '') {
    return {
      rule: 'OVR-002',
      override_id,
      description: 'No approver identified (single approver required)'
    };
  }

  // Check for multiple approvers (comma/semicolon separated)
  if (approval.approver.includes(',') || approval.approver.includes(';')) {
    return {
      rule: 'OVR-002',
      override_id,
      description: 'Multiple approvers detected (single approver required)'
    };
  }

  return null;
}

/**
 * Validate OVR-003: Audit trail.
 * Chaque override est loggé avec hash chain.
 * @param override - Override to validate
 * @returns Violation if rule broken, null otherwise
 */
export function validateOVR003(override: OverrideEvent): RuleViolation | null {
  const { override_hash, override_id } = override;

  if (!override_hash || override_hash.trim() === '') {
    return {
      rule: 'OVR-003',
      override_id,
      description: 'No override hash for audit trail'
    };
  }

  // Hash chain prev_hash is validated separately
  // Here we just ensure the hash exists

  return null;
}

/**
 * Validate OVR-004: Review before renewal.
 * @param override - Override to validate
 * @param existingOverrides - Existing overrides for renewal check
 * @returns Violation if rule broken, null otherwise
 */
export function validateOVR004(
  override: OverrideEvent,
  existingOverrides: readonly OverrideEvent[]
): RuleViolation | null {
  const { scope, justification, override_id } = override;

  // Find existing overrides for same scope
  const sameScope = existingOverrides.filter(
    o => o.scope.target_rule === scope.target_rule &&
         o.scope.target_component === scope.target_component &&
         o.override_id !== override_id
  );

  if (sameScope.length === 0) {
    return null; // Not a renewal
  }

  // This is a renewal - check for new justification
  const latestExisting = sameScope
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  if (justification.reason === latestExisting.justification.reason) {
    return {
      rule: 'OVR-004',
      override_id,
      description: 'Renewal requires new justification (same reason as previous override)'
    };
  }

  return null;
}

/**
 * Validate OVR-005: No cascade.
 * @param override - Override to validate
 * @returns Violation if rule broken, null otherwise
 */
export function validateOVR005(override: OverrideEvent): RuleViolation | null {
  if (isCascadeOverride(override)) {
    return {
      rule: 'OVR-005',
      override_id: override.override_id,
      description: 'Override targets another override (cascade not allowed)'
    };
  }

  return null;
}

/**
 * Validate all rules for an override.
 * @param override - Override to validate
 * @param existingOverrides - Existing overrides for renewal check
 * @returns Array of rule violations
 */
export function validateAllRules(
  override: OverrideEvent,
  existingOverrides: readonly OverrideEvent[] = []
): readonly RuleViolation[] {
  const violations: RuleViolation[] = [];

  const v001 = validateOVR001(override);
  if (v001) violations.push(v001);

  const v002 = validateOVR002(override);
  if (v002) violations.push(v002);

  const v003 = validateOVR003(override);
  if (v003) violations.push(v003);

  const v004 = validateOVR004(override, existingOverrides);
  if (v004) violations.push(v004);

  const v005 = validateOVR005(override);
  if (v005) violations.push(v005);

  return violations;
}
