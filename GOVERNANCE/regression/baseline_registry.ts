/**
 * BASELINE REGISTRY — Manage sealed baselines (READ-ONLY)
 *
 * INV-REGR-001: Snapshot immutability
 * INV-REGR-005: Regression test mandatory
 *
 * This module is NON-ACTUATING. It reads baseline data only.
 */

import type {
  SealedBaseline,
  ValidationResult,
  SealStatus
} from './types.js';

// ─────────────────────────────────────────────────────────────
// BASELINE REGISTRY TYPE
// ─────────────────────────────────────────────────────────────

/** All registered baselines - readonly frozen record */
export type BaselineRegistry = Readonly<Record<string, SealedBaseline>>;

// ─────────────────────────────────────────────────────────────
// REGISTRY FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Create baseline registry from array of sealed baselines.
 * Pure function - no I/O.
 * @param baselines - Array of sealed baselines
 * @returns Immutable registry keyed by baseline_id
 */
export function createBaselineRegistry(
  baselines: readonly SealedBaseline[]
): BaselineRegistry {
  const registry: Record<string, SealedBaseline> = {};

  for (const baseline of baselines) {
    if (baseline.baseline_id) {
      registry[baseline.baseline_id] = baseline;
    }
  }

  return Object.freeze(registry);
}

/**
 * Get all active (SEALED) baselines from registry.
 * @param registry - Baseline registry
 * @returns Array of sealed baselines, sorted by version
 */
export function getActiveBaselines(
  registry: BaselineRegistry
): readonly SealedBaseline[] {
  const baselines = Object.values(registry)
    .filter(b => b.seal_status === 'SEALED');

  return baselines.sort(compareBaselines);
}

/**
 * Find baseline by version string.
 * @param registry - Baseline registry
 * @param version - Semantic version to find
 * @returns Baseline if found, null otherwise
 */
export function findBaselineByVersion(
  registry: BaselineRegistry,
  version: string
): SealedBaseline | null {
  for (const baseline of Object.values(registry)) {
    if (baseline.version === version) {
      return baseline;
    }
  }
  return null;
}

/**
 * Find baseline by commit hash (prefix match).
 * @param registry - Baseline registry
 * @param commit - Full or partial commit hash
 * @returns Baseline if found, null otherwise
 */
export function findBaselineByCommit(
  registry: BaselineRegistry,
  commit: string
): SealedBaseline | null {
  const commitLower = commit.toLowerCase();

  for (const baseline of Object.values(registry)) {
    if (baseline.commit.toLowerCase().startsWith(commitLower)) {
      return baseline;
    }
  }
  return null;
}

/**
 * Find baseline by tag.
 * @param registry - Baseline registry
 * @param tag - Git tag to find
 * @returns Baseline if found, null otherwise
 */
export function findBaselineByTag(
  registry: BaselineRegistry,
  tag: string
): SealedBaseline | null {
  for (const baseline of Object.values(registry)) {
    if (baseline.tag === tag) {
      return baseline;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate a sealed baseline structure.
 * @param baseline - Baseline to validate
 * @returns Validation result with errors if invalid
 */
export function validateBaseline(
  baseline: SealedBaseline
): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!baseline.baseline_id || baseline.baseline_id.trim() === '') {
    errors.push('baseline_id is required');
  }
  if (!baseline.version || baseline.version.trim() === '') {
    errors.push('version is required');
  }
  if (!baseline.commit || baseline.commit.length < 7) {
    errors.push('commit must be at least 7 characters');
  }
  if (!baseline.tag || baseline.tag.trim() === '') {
    errors.push('tag is required');
  }
  if (!baseline.sealed_at || baseline.sealed_at.trim() === '') {
    errors.push('sealed_at is required');
  }
  if (!baseline.manifest_sha256 || baseline.manifest_sha256.length < 64) {
    errors.push('manifest_sha256 must be 64 characters');
  }
  if (!baseline.proof_ref || baseline.proof_ref.trim() === '') {
    errors.push('proof_ref is required');
  }

  // Seal status validation
  if (!['SEALED', 'PENDING', 'UNKNOWN'].includes(baseline.seal_status)) {
    errors.push('seal_status must be SEALED, PENDING, or UNKNOWN');
  }

  // Test results validation
  if (!baseline.test_results) {
    errors.push('test_results is required');
  } else {
    if (typeof baseline.test_results.total_tests !== 'number' || baseline.test_results.total_tests < 0) {
      errors.push('test_results.total_tests must be non-negative number');
    }
    if (typeof baseline.test_results.passed !== 'number' || baseline.test_results.passed < 0) {
      errors.push('test_results.passed must be non-negative number');
    }
    if (typeof baseline.test_results.failed !== 'number' || baseline.test_results.failed < 0) {
      errors.push('test_results.failed must be non-negative number');
    }
    if (typeof baseline.test_results.assertions_count !== 'number' || baseline.test_results.assertions_count < 0) {
      errors.push('test_results.assertions_count must be non-negative number');
    }
    if (!baseline.test_results.output_hash || baseline.test_results.output_hash.trim() === '') {
      errors.push('test_results.output_hash is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if a baseline is applicable for regression testing.
 * A baseline is applicable if it is SEALED and has valid test results.
 * @param baseline - Baseline to check
 * @returns true if applicable for regression testing
 */
export function isBaselineApplicable(
  baseline: SealedBaseline
): boolean {
  // Must be SEALED
  if (baseline.seal_status !== 'SEALED') {
    return false;
  }

  // Must have valid test results
  if (!baseline.test_results) {
    return false;
  }

  // Must have at least one test
  if (baseline.test_results.total_tests < 1) {
    return false;
  }

  return true;
}

/**
 * Compare two baselines for chronological ordering.
 * Orders by sealed_at timestamp, then by version.
 * @param a - First baseline
 * @param b - Second baseline
 * @returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareBaselines(
  a: SealedBaseline,
  b: SealedBaseline
): number {
  // First compare by sealed_at timestamp
  const dateA = new Date(a.sealed_at).getTime();
  const dateB = new Date(b.sealed_at).getTime();

  if (dateA !== dateB) {
    return dateA - dateB;
  }

  // Then by version string
  return a.version.localeCompare(b.version);
}

/**
 * Get registry statistics.
 * @param registry - Baseline registry
 * @returns Statistics about the registry
 */
export function getRegistryStats(
  registry: BaselineRegistry
): {
  readonly total: number;
  readonly sealed: number;
  readonly pending: number;
  readonly unknown: number;
  readonly applicable: number;
} {
  const baselines = Object.values(registry);

  return {
    total: baselines.length,
    sealed: baselines.filter(b => b.seal_status === 'SEALED').length,
    pending: baselines.filter(b => b.seal_status === 'PENDING').length,
    unknown: baselines.filter(b => b.seal_status === 'UNKNOWN').length,
    applicable: baselines.filter(isBaselineApplicable).length
  };
}
