/**
 * PHASE I — VERSION UTILITIES
 * Specification: VERSIONING_CONTRACT.md
 *
 * Shared utilities for semantic version parsing, comparison, validation.
 * All functions are pure (no I/O, no side effects).
 */

import * as crypto from 'crypto';
import type {
  SemanticVersion,
  BumpType,
  VersionContractEvent,
  VersionValidationResult,
  CompatibilityStatus
} from './types.js';
import { BUMP_TYPES, COMPATIBILITY_TYPES } from './types.js';

// ─────────────────────────────────────────────────────────────
// SEMVER PARSING
// ─────────────────────────────────────────────────────────────

/**
 * Regex for semantic version parsing.
 * Supports: MAJOR.MINOR.PATCH[-prerelease][+build]
 */
const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;

/**
 * Parse a semantic version string.
 * @param version - Version string (e.g., "1.2.3", "1.0.0-alpha", "2.0.0+build123")
 * @returns Parsed SemanticVersion or null if invalid
 */
export function parseSemver(version: string): SemanticVersion | null {
  if (!version || typeof version !== 'string') {
    return null;
  }

  const match = SEMVER_REGEX.exec(version.trim());
  if (!match) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || undefined,
    build: match[5] || undefined
  };
}

/**
 * Format a SemanticVersion to string.
 * @param version - SemanticVersion object
 * @returns Formatted version string
 */
export function formatSemver(version: SemanticVersion): string {
  let result = `${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) {
    result += `-${version.prerelease}`;
  }
  if (version.build) {
    result += `+${version.build}`;
  }
  return result;
}

/**
 * Validate a semantic version string.
 * @param version - Version string to validate
 * @returns true if valid semantic version
 */
export function isValidSemver(version: string): boolean {
  return parseSemver(version) !== null;
}

// ─────────────────────────────────────────────────────────────
// VERSION COMPARISON
// ─────────────────────────────────────────────────────────────

/**
 * Compare two semantic versions.
 * @param a - First version
 * @param b - Second version
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareSemver(a: SemanticVersion, b: SemanticVersion): -1 | 0 | 1 {
  // Compare major
  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1;
  }

  // Compare minor
  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1;
  }

  // Compare patch
  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1;
  }

  // Compare prerelease (no prerelease > prerelease)
  if (a.prerelease && !b.prerelease) {
    return -1;
  }
  if (!a.prerelease && b.prerelease) {
    return 1;
  }
  if (a.prerelease && b.prerelease) {
    return a.prerelease < b.prerelease ? -1 : a.prerelease > b.prerelease ? 1 : 0;
  }

  return 0;
}

/**
 * Compare two version strings.
 * @param a - First version string
 * @param b - Second version string
 * @returns -1, 0, or 1; null if either is invalid
 */
export function compareVersionStrings(a: string, b: string): -1 | 0 | 1 | null {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);

  if (!parsedA || !parsedB) {
    return null;
  }

  return compareSemver(parsedA, parsedB);
}

// ─────────────────────────────────────────────────────────────
// BUMP DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * Determine the bump type between two versions.
 * @param previous - Previous version
 * @param current - Current version
 * @returns BumpType or null if downgrade/same/invalid
 */
export function detectBumpType(previous: string, current: string): BumpType | null {
  const prev = parseSemver(previous);
  const curr = parseSemver(current);

  if (!prev || !curr) {
    return null;
  }

  // Check for downgrade
  if (compareSemver(curr, prev) <= 0) {
    return null; // Downgrade or same version
  }

  // Determine bump type
  if (curr.major > prev.major) {
    return 'major';
  }
  if (curr.minor > prev.minor) {
    return 'minor';
  }
  if (curr.patch > prev.patch) {
    return 'patch';
  }

  return null;
}

/**
 * Check if version transition is a downgrade.
 * INV-I-09: Downgrade prevention
 * @param previous - Previous version
 * @param current - Current version
 * @returns true if downgrade detected
 */
export function isDowngrade(previous: string, current: string): boolean {
  const comparison = compareVersionStrings(current, previous);
  return comparison !== null && comparison < 0;
}

// ─────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generate version event ID.
 * Format: VER_{TYPE}_{YYYYMMDD}_{NNN}
 */
export function generateVersionEventId(
  bumpType: BumpType,
  date: Date,
  sequence: number
): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const seqStr = String(sequence).padStart(3, '0');
  const typeCode = bumpType.toUpperCase().substring(0, 3);

  return `VER_${typeCode}_${dateStr}_${seqStr}`;
}

/**
 * Generate version report ID.
 * Format: VER_REPORT_{YYYYMMDDTHHMMSSZ}_{hash8}
 */
export function generateVersionReportId(
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

  return `VER_REPORT_${ts}_${hash}`;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate a version contract event.
 * @param event - Event to validate
 * @returns Validation result
 */
export function validateVersionEvent(event: VersionContractEvent): VersionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check event structure
  if (event.event_type !== 'version_contract_event') {
    errors.push('event_type must be "version_contract_event"');
  }
  if (event.schema_version !== '1.0.0') {
    errors.push('schema_version must be "1.0.0"');
  }

  // INV-I-01: Validate semver format
  const semverValid = isValidSemver(event.version.current) && isValidSemver(event.version.previous);
  if (!semverValid) {
    errors.push('INV-I-01: Invalid semantic version format');
  }

  // Validate bump type
  const detectedBump = detectBumpType(event.version.previous, event.version.current);
  const bumpValid = detectedBump === event.version.bump_type;
  if (!bumpValid && semverValid) {
    errors.push(`Bump type mismatch: expected ${detectedBump}, got ${event.version.bump_type}`);
  }

  // INV-I-09: Check for downgrade
  if (isDowngrade(event.version.previous, event.version.current)) {
    errors.push('INV-I-09: Downgrade detected - version must increase');
  }

  // INV-I-02: MAJOR bump required for breaking changes
  const hasBreakingChanges = event.breaking_changes.length > 0 ||
                              event.compatibility.type === 'breaking' ||
                              !event.compatibility.backward_compatible;

  if (hasBreakingChanges && event.version.bump_type !== 'major') {
    errors.push('INV-I-02: Breaking changes require MAJOR version bump');
  }

  // INV-I-03: Backward compatible by default
  if (event.version.bump_type !== 'major' && !event.compatibility.backward_compatible) {
    errors.push('INV-I-03: MINOR/PATCH must be backward compatible');
  }

  // Validate compatibility status
  const compatibilityValid = validateCompatibilityStatus(event.compatibility, event.version.bump_type);
  if (!compatibilityValid.valid) {
    errors.push(...compatibilityValid.errors);
  }

  // Rules validation handled separately
  const rulesValid = errors.length === 0;

  return {
    valid: errors.length === 0,
    semver_valid: semverValid,
    bump_valid: bumpValid,
    compatibility_valid: compatibilityValid.valid,
    rules_valid: rulesValid,
    errors,
    warnings
  };
}

/**
 * Validate compatibility status consistency.
 */
function validateCompatibilityStatus(
  status: CompatibilityStatus,
  bumpType: BumpType
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // If backward_compatible is false, type should be 'breaking'
  if (!status.backward_compatible && status.type !== 'breaking') {
    errors.push('Compatibility type should be "breaking" when not backward compatible');
  }

  // If type is 'backward', all flags should be true
  if (status.type === 'backward') {
    if (!status.backward_compatible || !status.api_compatible || !status.schema_compatible) {
      errors.push('Backward compatibility type requires all compatibility flags to be true');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────
// WINDOW COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute window from version event timestamps.
 */
export function computeWindow(
  events: readonly VersionContractEvent[]
): { from: string; to: string; events_count: number } {
  if (events.length === 0) {
    const now = new Date().toISOString();
    return { from: now, to: now, events_count: 0 };
  }

  const timestamps = events.map(e => e.timestamp).sort();
  return {
    from: timestamps[0],
    to: timestamps[timestamps.length - 1],
    events_count: events.length
  };
}

// ─────────────────────────────────────────────────────────────
// HASH COMPUTATION
// ─────────────────────────────────────────────────────────────

/**
 * Compute SHA256 hash of content.
 */
export function computeContentHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content)
    .digest('hex');
}
