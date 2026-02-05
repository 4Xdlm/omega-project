/**
 * PHASE I — COMPATIBILITY VALIDATOR
 * Specification: VERSIONING_CONTRACT.md
 *
 * Validates compatibility between versions and builds compatibility matrix.
 */

import type {
  VersionContractEvent,
  CompatibilityMatrix,
  CompatibilityMatrixEntry,
  CompatibilityCellStatus
} from '../types.js';
import { parseSemver, compareSemver } from '../version_utils.js';

// ─────────────────────────────────────────────────────────────
// COMPATIBILITY DETERMINATION
// ─────────────────────────────────────────────────────────────

/**
 * Determine compatibility status between two versions.
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @param events - Version events for context
 * @returns Compatibility cell status
 */
export function determineCompatibility(
  fromVersion: string,
  toVersion: string,
  events: readonly VersionContractEvent[]
): { status: CompatibilityCellStatus; notes: string } {
  const from = parseSemver(fromVersion);
  const to = parseSemver(toVersion);

  if (!from || !to) {
    return { status: 'incompatible', notes: 'Invalid version format' };
  }

  const comparison = compareSemver(from, to);

  // Same version - always compatible
  if (comparison === 0) {
    return { status: 'compatible', notes: 'Same version' };
  }

  // Upgrade path
  if (comparison < 0) {
    return determineUpgradeCompatibility(from, to, events);
  }

  // Downgrade path
  return determineDowngradeCompatibility(from, to, events);
}

/**
 * Determine compatibility for upgrade path.
 */
function determineUpgradeCompatibility(
  from: { major: number; minor: number; patch: number },
  to: { major: number; minor: number; patch: number },
  events: readonly VersionContractEvent[]
): { status: CompatibilityCellStatus; notes: string } {
  // Same MAJOR version - generally compatible
  if (from.major === to.major) {
    // Same MINOR - patch upgrades are always compatible
    if (from.minor === to.minor) {
      return { status: 'compatible', notes: 'Patch upgrade (backward compatible)' };
    }
    // Different MINOR within same MAJOR
    return { status: 'compatible', notes: 'Minor upgrade (backward compatible)' };
  }

  // Different MAJOR version - check for breaking changes
  // Find events between versions
  const relevantEvents = events.filter(e => {
    const eventVersion = parseSemver(e.version.current);
    if (!eventVersion) return false;
    return eventVersion.major > from.major && eventVersion.major <= to.major;
  });

  const hasBreakingChanges = relevantEvents.some(
    e => e.breaking_changes.length > 0 || !e.compatibility.backward_compatible
  );

  const hasMigrationPath = relevantEvents.some(e => e.migration_path !== null);

  if (hasBreakingChanges) {
    if (hasMigrationPath) {
      return { status: 'migration_required', notes: 'Major upgrade requires migration' };
    }
    return { status: 'incompatible', notes: 'Breaking changes without migration path' };
  }

  return { status: 'compatible', notes: 'Major upgrade (no breaking changes detected)' };
}

/**
 * Determine compatibility for downgrade path.
 */
function determineDowngradeCompatibility(
  from: { major: number; minor: number; patch: number },
  to: { major: number; minor: number; patch: number },
  events: readonly VersionContractEvent[]
): { status: CompatibilityCellStatus; notes: string } {
  // Same MAJOR version
  if (from.major === to.major) {
    // Same MINOR - patch downgrade might work
    if (from.minor === to.minor) {
      return { status: 'partial', notes: 'Patch downgrade (may lose fixes)' };
    }
    // Different MINOR within same MAJOR
    return { status: 'partial', notes: 'Minor downgrade (may lose features)' };
  }

  // Different MAJOR - generally incompatible for downgrade
  return { status: 'incompatible', notes: 'Major downgrade not supported' };
}

// ─────────────────────────────────────────────────────────────
// COMPATIBILITY MATRIX
// ─────────────────────────────────────────────────────────────

/**
 * Build compatibility matrix from version events.
 * @param versions - List of versions to include in matrix
 * @param events - Version events for context
 * @returns Compatibility matrix
 */
export function buildCompatibilityMatrix(
  versions: readonly string[],
  events: readonly VersionContractEvent[]
): CompatibilityMatrix {
  const entries: CompatibilityMatrixEntry[] = [];

  // Sort versions
  const sortedVersions = [...versions].sort((a, b) => {
    const parsedA = parseSemver(a);
    const parsedB = parseSemver(b);
    if (!parsedA || !parsedB) return 0;
    return compareSemver(parsedA, parsedB);
  });

  // Build matrix entries
  for (const fromVersion of sortedVersions) {
    for (const toVersion of sortedVersions) {
      const { status, notes } = determineCompatibility(fromVersion, toVersion, events);
      entries.push({
        from_version: fromVersion,
        to_version: toVersion,
        status,
        notes
      });
    }
  }

  return {
    versions: sortedVersions,
    entries
  };
}

/**
 * Get compatibility status between two specific versions.
 * @param matrix - Compatibility matrix
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns Matrix entry or null if not found
 */
export function getCompatibilityEntry(
  matrix: CompatibilityMatrix,
  fromVersion: string,
  toVersion: string
): CompatibilityMatrixEntry | null {
  return matrix.entries.find(
    e => e.from_version === fromVersion && e.to_version === toVersion
  ) ?? null;
}

/**
 * Check if upgrade path exists between versions.
 * @param matrix - Compatibility matrix
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns true if upgrade is possible
 */
export function isUpgradePathAvailable(
  matrix: CompatibilityMatrix,
  fromVersion: string,
  toVersion: string
): boolean {
  const entry = getCompatibilityEntry(matrix, fromVersion, toVersion);
  if (!entry) return false;

  return entry.status === 'compatible' || entry.status === 'migration_required';
}
