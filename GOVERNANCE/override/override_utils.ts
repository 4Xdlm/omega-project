/**
 * PHASE H — OVERRIDE UTILITIES
 * Specification: HUMAN_OVERRIDE.md
 *
 * Shared utilities for ID generation, hash computation, validation.
 * All functions are pure (no I/O, no side effects).
 */

import * as crypto from 'crypto';
import type {
  OverrideEvent,
  OverrideType,
  OverrideValidationResult,
  ConditionValidation,
  OverrideStatus
} from './types.js';
import {
  OVERRIDE_TYPES,
  OVERRIDE_MAX_DAYS,
  APPROVAL_METHODS,
  CONDITION_NAMES
} from './types.js';

// ─────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generate override event ID.
 * Format: OVR_{TYPE}_{YYYYMMDD}_{NNN}
 * @param type - Override type
 * @param date - Event date
 * @param sequence - Sequence number
 * @returns Formatted event ID
 */
export function generateOverrideEventId(
  type: OverrideType,
  date: Date,
  sequence: number
): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const seqStr = String(sequence).padStart(3, '0');
  const typeCode = type.toUpperCase().substring(0, 3);

  return `OVR_${typeCode}_${dateStr}_${seqStr}`;
}

/**
 * Generate override ID.
 * Format: OVERRIDE_{TYPE}_{YYYYMMDDTHHMMSSZ}_{hash8}
 * @param type - Override type
 * @param date - Creation date
 * @param contentForHash - Content to hash for uniqueness
 * @returns Formatted override ID
 */
export function generateOverrideId(
  type: OverrideType,
  date: Date,
  contentForHash: string
): string {
  const ts = date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const hash = crypto
    .createHash('sha256')
    .update(contentForHash)
    .digest('hex')
    .slice(0, 8);
  const typeCode = type.toUpperCase();

  return `OVERRIDE_${typeCode}_${ts}_${hash}`;
}

/**
 * Generate override report ID.
 * Format: OVR_REPORT_{YYYYMMDDTHHMMSSZ}_{hash8}
 * @param date - Report generation date
 * @param contentForHash - Content to hash for uniqueness
 * @returns Formatted report ID
 */
export function generateOverrideReportId(
  date: Date,
  contentForHash: string
): string {
  const ts = date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const hash = crypto
    .createHash('sha256')
    .update(contentForHash)
    .digest('hex')
    .slice(0, 8);

  return `OVR_REPORT_${ts}_${hash}`;
}

// ─────────────────────────────────────────────────────────────
// HASH COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute SHA256 hash of content.
 * @param content - Content to hash
 * @returns Hex-encoded SHA256 hash
 */
export function computeContentHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}

/**
 * Compute override hash (CONDITION 4).
 * Hash is computed over the override content EXCLUDING the override_hash field.
 * @param override - Override event (without override_hash)
 * @returns SHA256 hash of override content
 */
export function computeOverrideHash(override: Omit<OverrideEvent, 'override_hash'>): string {
  const contentForHash = JSON.stringify({
    event_type: override.event_type,
    schema_version: override.schema_version,
    event_id: override.event_id,
    timestamp: override.timestamp,
    override_id: override.override_id,
    type: override.type,
    scope: override.scope,
    justification: override.justification,
    approval: override.approval,
    validity: override.validity,
    manifest_ref: override.manifest_ref,
    log_chain_prev_hash: override.log_chain_prev_hash
  });

  return computeContentHash(contentForHash);
}

/**
 * Verify override hash matches content.
 * @param override - Override event with hash
 * @returns true if hash is valid
 */
export function verifyOverrideHash(override: OverrideEvent): boolean {
  const expectedHash = computeOverrideHash(override);
  return override.override_hash === expectedHash;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate CONDITION 1: Justification written.
 * @param override - Override to validate
 * @returns Condition validation result
 */
export function validateCondition1(override: OverrideEvent): ConditionValidation {
  const { justification } = override;

  if (!justification) {
    return {
      condition: 1,
      name: CONDITION_NAMES[1],
      valid: false,
      error: 'Justification is missing'
    };
  }

  if (!justification.reason || justification.reason.trim() === '') {
    return {
      condition: 1,
      name: CONDITION_NAMES[1],
      valid: false,
      error: 'Justification reason is empty'
    };
  }

  if (justification.reason.trim().length < 10) {
    return {
      condition: 1,
      name: CONDITION_NAMES[1],
      valid: false,
      error: 'Justification reason is too short (min 10 chars)'
    };
  }

  return {
    condition: 1,
    name: CONDITION_NAMES[1],
    valid: true
  };
}

/**
 * Validate CONDITION 2: Human signature.
 * @param override - Override to validate
 * @returns Condition validation result
 */
export function validateCondition2(override: OverrideEvent): ConditionValidation {
  const { approval } = override;

  if (!approval) {
    return {
      condition: 2,
      name: CONDITION_NAMES[2],
      valid: false,
      error: 'Approval is missing'
    };
  }

  if (!approval.approver || approval.approver.trim() === '') {
    return {
      condition: 2,
      name: CONDITION_NAMES[2],
      valid: false,
      error: 'Approver identity is missing'
    };
  }

  if (!approval.approver_role || approval.approver_role.trim() === '') {
    return {
      condition: 2,
      name: CONDITION_NAMES[2],
      valid: false,
      error: 'Approver role is missing'
    };
  }

  if (!approval.approved_at || approval.approved_at.trim() === '') {
    return {
      condition: 2,
      name: CONDITION_NAMES[2],
      valid: false,
      error: 'Approval timestamp is missing'
    };
  }

  if (!APPROVAL_METHODS.includes(approval.approval_method)) {
    return {
      condition: 2,
      name: CONDITION_NAMES[2],
      valid: false,
      error: `Invalid approval method: ${approval.approval_method}`
    };
  }

  return {
    condition: 2,
    name: CONDITION_NAMES[2],
    valid: true
  };
}

/**
 * Validate CONDITION 3: Expiration defined.
 * @param override - Override to validate
 * @returns Condition validation result
 */
export function validateCondition3(override: OverrideEvent): ConditionValidation {
  const { validity, type } = override;

  if (!validity) {
    return {
      condition: 3,
      name: CONDITION_NAMES[3],
      valid: false,
      error: 'Validity is missing'
    };
  }

  if (!validity.effective_from || validity.effective_from.trim() === '') {
    return {
      condition: 3,
      name: CONDITION_NAMES[3],
      valid: false,
      error: 'Effective from date is missing'
    };
  }

  if (!validity.expires_at || validity.expires_at.trim() === '') {
    return {
      condition: 3,
      name: CONDITION_NAMES[3],
      valid: false,
      error: 'Expiration date is missing'
    };
  }

  // Validate expiration is within type maximum
  const effectiveDate = new Date(validity.effective_from);
  const expiresDate = new Date(validity.expires_at);
  const durationDays = Math.ceil(
    (expiresDate.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const maxDays = OVERRIDE_MAX_DAYS[type];
  if (durationDays > maxDays) {
    return {
      condition: 3,
      name: CONDITION_NAMES[3],
      valid: false,
      error: `Duration ${durationDays} days exceeds maximum ${maxDays} days for ${type}`
    };
  }

  if (durationDays <= 0) {
    return {
      condition: 3,
      name: CONDITION_NAMES[3],
      valid: false,
      error: 'Expiration must be after effective date'
    };
  }

  return {
    condition: 3,
    name: CONDITION_NAMES[3],
    valid: true
  };
}

/**
 * Validate CONDITION 4: Hash calculated.
 * @param override - Override to validate
 * @returns Condition validation result
 */
export function validateCondition4(override: OverrideEvent): ConditionValidation {
  if (!override.override_hash || override.override_hash.trim() === '') {
    return {
      condition: 4,
      name: CONDITION_NAMES[4],
      valid: false,
      error: 'Override hash is missing'
    };
  }

  // Verify hash is valid SHA256 (64 hex chars)
  if (!/^[a-f0-9]{64}$/i.test(override.override_hash)) {
    return {
      condition: 4,
      name: CONDITION_NAMES[4],
      valid: false,
      error: 'Override hash is not valid SHA256 format'
    };
  }

  // Verify hash matches content
  if (!verifyOverrideHash(override)) {
    return {
      condition: 4,
      name: CONDITION_NAMES[4],
      valid: false,
      error: 'Override hash does not match content'
    };
  }

  return {
    condition: 4,
    name: CONDITION_NAMES[4],
    valid: true
  };
}

/**
 * Validate CONDITION 5: Manifest reference.
 * @param override - Override to validate
 * @returns Condition validation result
 */
export function validateCondition5(override: OverrideEvent): ConditionValidation {
  const { manifest_ref } = override;

  if (!manifest_ref) {
    return {
      condition: 5,
      name: CONDITION_NAMES[5],
      valid: false,
      error: 'Manifest reference is missing'
    };
  }

  if (!manifest_ref.tag || manifest_ref.tag.trim() === '') {
    return {
      condition: 5,
      name: CONDITION_NAMES[5],
      valid: false,
      error: 'Git tag is missing'
    };
  }

  if (!manifest_ref.manifest_sha256 || manifest_ref.manifest_sha256.trim() === '') {
    return {
      condition: 5,
      name: CONDITION_NAMES[5],
      valid: false,
      error: 'Manifest SHA256 is missing'
    };
  }

  // Verify manifest hash is valid SHA256 format
  if (!/^[a-f0-9]{64}$/i.test(manifest_ref.manifest_sha256)) {
    return {
      condition: 5,
      name: CONDITION_NAMES[5],
      valid: false,
      error: 'Manifest SHA256 is not valid format'
    };
  }

  return {
    condition: 5,
    name: CONDITION_NAMES[5],
    valid: true
  };
}

/**
 * Validate all 5 conditions for an override.
 * INV-H-01: All 5 conditions must be valid.
 * @param override - Override to validate
 * @returns Full validation result
 */
export function validateOverrideConditions(override: OverrideEvent): OverrideValidationResult {
  const conditions: ConditionValidation[] = [
    validateCondition1(override),
    validateCondition2(override),
    validateCondition3(override),
    validateCondition4(override),
    validateCondition5(override)
  ];

  const allValid = conditions.every(c => c.valid);
  const errors = conditions
    .filter(c => !c.valid)
    .map(c => c.error!)
    .filter(Boolean);

  return {
    valid: allValid,
    conditions,
    rule_violations: [],
    errors
  };
}

// ─────────────────────────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Determine override status based on validity and current time.
 * @param override - Override event
 * @param currentTime - Current timestamp for comparison
 * @returns Override status
 */
export function getOverrideStatus(
  override: OverrideEvent,
  currentTime: string
): OverrideStatus {
  const validation = validateOverrideConditions(override);

  if (!validation.valid) {
    return 'invalid';
  }

  const now = new Date(currentTime);
  const expiresAt = new Date(override.validity.expires_at);
  const effectiveFrom = new Date(override.validity.effective_from);

  if (now > expiresAt) {
    return 'expired';
  }

  if (now < effectiveFrom) {
    return 'active'; // Not yet effective, but valid
  }

  return 'active';
}

/**
 * Check if override is expiring soon (within 24 hours).
 * @param override - Override event
 * @param currentTime - Current timestamp for comparison
 * @returns true if expiring within 24 hours
 */
export function isExpiringSoon(
  override: OverrideEvent,
  currentTime: string
): boolean {
  const now = new Date(currentTime);
  const expiresAt = new Date(override.validity.expires_at);
  const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
}

// ─────────────────────────────────────────────────────────────
// WINDOW COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute window from override timestamps.
 * @param overrides - Array of overrides
 * @returns Window with from, to, and count
 */
export function computeWindow(
  overrides: readonly OverrideEvent[]
): { from: string; to: string; overrides_count: number } {
  if (overrides.length === 0) {
    const now = new Date().toISOString();
    return { from: now, to: now, overrides_count: 0 };
  }

  const timestamps = overrides.map(o => o.timestamp).sort();
  return {
    from: timestamps[0],
    to: timestamps[timestamps.length - 1],
    overrides_count: overrides.length
  };
}
