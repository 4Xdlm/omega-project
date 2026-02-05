/**
 * BASELINE REGISTRY TESTS — Phase F Non-Regression
 * Tests for the baseline registry module functions.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * INV-REGR-001: Snapshot immutability
 * INV-REGR-005: Regression test mandatory
 */

import { describe, it, expect } from 'vitest';
import {
  createBaselineRegistry,
  getActiveBaselines,
  findBaselineByVersion,
  findBaselineByCommit,
  findBaselineByTag,
  validateBaseline,
  isBaselineApplicable,
  compareBaselines
} from '../../../governance/regression/index.js';
import type { SealedBaseline } from '../../../governance/regression/index.js';

// ─────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────

const VALID_TEST_RESULTS = {
  total_tests: 150,
  passed: 148,
  failed: 2,
  skipped: 0,
  duration_ms: 5000,
  assertions_count: 450,
  output_hash: 'bd8dc999cad0b938a0e5ae7182bb7d6d1a30c424847dc32c03f8e525c1522659',
  test_files: ['test1.ts', 'test2.ts']
};

const BASELINE_SEALED_V1: SealedBaseline = {
  baseline_id: 'BL-001',
  version: '1.0.0',
  commit: 'abc1234567890',
  tag: 'v1.0.0',
  sealed_at: '2026-01-15T10:00:00.000Z',
  manifest_sha256: '22b96d37e9439dd9e775bac63ffe94e427de0bbf54247766b5e534f06d80aa09',
  test_results: VALID_TEST_RESULTS,
  proof_ref: 'nexus/proof/phase-f/BL-001.json',
  seal_status: 'SEALED'
};

const BASELINE_SEALED_V2: SealedBaseline = {
  baseline_id: 'BL-002',
  version: '2.0.0',
  commit: 'def4567890abc',
  tag: 'v2.0.0',
  sealed_at: '2026-02-01T12:00:00.000Z',
  manifest_sha256: '33c96d37e9439dd9e775bac63ffe94e427de0bbf54247766b5e534f06d80aa10',
  test_results: { ...VALID_TEST_RESULTS, total_tests: 175, passed: 175, failed: 0 },
  proof_ref: 'nexus/proof/phase-f/BL-002.json',
  seal_status: 'SEALED'
};

const BASELINE_PENDING: SealedBaseline = {
  baseline_id: 'BL-003',
  version: '3.0.0-beta',
  commit: 'ghi7890abcdef',
  tag: 'v3.0.0-beta',
  sealed_at: '2026-02-03T08:00:00.000Z',
  manifest_sha256: '44d96d37e9439dd9e775bac63ffe94e427de0bbf54247766b5e534f06d80aa11',
  test_results: { ...VALID_TEST_RESULTS, total_tests: 0 },
  proof_ref: 'nexus/proof/phase-f/BL-003.json',
  seal_status: 'PENDING'
};

// ─────────────────────────────────────────────────────────────
// REGISTRY CREATION TESTS
// ─────────────────────────────────────────────────────────────

describe('createBaselineRegistry', () => {
  it('creates frozen registry from baseline array', () => {
    const registry = createBaselineRegistry([BASELINE_SEALED_V1, BASELINE_SEALED_V2]);

    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.keys(registry)).toHaveLength(2);
    expect(registry['BL-001']).toEqual(BASELINE_SEALED_V1);
    expect(registry['BL-002']).toEqual(BASELINE_SEALED_V2);
  });

  it('handles empty array', () => {
    const registry = createBaselineRegistry([]);

    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.keys(registry)).toHaveLength(0);
  });

  it('deduplicates by baseline_id (last wins)', () => {
    const duplicate: SealedBaseline = {
      ...BASELINE_SEALED_V1,
      version: '1.0.1' // different version, same baseline_id
    };

    const registry = createBaselineRegistry([BASELINE_SEALED_V1, duplicate]);

    expect(Object.keys(registry)).toHaveLength(1);
    expect(registry['BL-001'].version).toBe('1.0.1');
  });
});

// ─────────────────────────────────────────────────────────────
// FINDING BASELINES TESTS
// ─────────────────────────────────────────────────────────────

describe('getActiveBaselines', () => {
  it('returns only SEALED baselines', () => {
    const registry = createBaselineRegistry([
      BASELINE_SEALED_V1,
      BASELINE_SEALED_V2,
      BASELINE_PENDING
    ]);

    const active = getActiveBaselines(registry);

    expect(active).toHaveLength(2);
    expect(active.every(b => b.seal_status === 'SEALED')).toBe(true);
  });

  it('sorts by sealed_at timestamp', () => {
    const registry = createBaselineRegistry([
      BASELINE_SEALED_V2, // later timestamp
      BASELINE_SEALED_V1  // earlier timestamp
    ]);

    const active = getActiveBaselines(registry);

    expect(active[0].baseline_id).toBe('BL-001'); // earlier first
    expect(active[1].baseline_id).toBe('BL-002'); // later second
  });
});

describe('findBaselineByVersion', () => {
  it('finds matching baseline', () => {
    const registry = createBaselineRegistry([BASELINE_SEALED_V1, BASELINE_SEALED_V2]);

    const found = findBaselineByVersion(registry, '2.0.0');

    expect(found).not.toBeNull();
    expect(found?.baseline_id).toBe('BL-002');
  });

  it('returns null for missing version', () => {
    const registry = createBaselineRegistry([BASELINE_SEALED_V1]);

    const found = findBaselineByVersion(registry, '9.9.9');

    expect(found).toBeNull();
  });
});

describe('findBaselineByCommit', () => {
  it('matches commit prefix', () => {
    const registry = createBaselineRegistry([BASELINE_SEALED_V1, BASELINE_SEALED_V2]);

    // Match with prefix
    const found = findBaselineByCommit(registry, 'abc1234');

    expect(found).not.toBeNull();
    expect(found?.baseline_id).toBe('BL-001');
  });

  it('matches case-insensitively', () => {
    const registry = createBaselineRegistry([BASELINE_SEALED_V1]);

    const found = findBaselineByCommit(registry, 'ABC1234');

    expect(found).not.toBeNull();
    expect(found?.baseline_id).toBe('BL-001');
  });
});

describe('findBaselineByTag', () => {
  it('finds matching tag', () => {
    const registry = createBaselineRegistry([BASELINE_SEALED_V1, BASELINE_SEALED_V2]);

    const found = findBaselineByTag(registry, 'v2.0.0');

    expect(found).not.toBeNull();
    expect(found?.baseline_id).toBe('BL-002');
  });

  it('returns null for missing tag', () => {
    const registry = createBaselineRegistry([BASELINE_SEALED_V1]);

    const found = findBaselineByTag(registry, 'v99.0.0');

    expect(found).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// VALIDATION TESTS
// ─────────────────────────────────────────────────────────────

describe('validateBaseline', () => {
  it('passes for valid baseline', () => {
    const result = validateBaseline(BASELINE_SEALED_V1);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails for missing baseline_id', () => {
    const invalid = { ...BASELINE_SEALED_V1, baseline_id: '' };

    const result = validateBaseline(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('baseline_id is required');
  });

  it('fails for short commit', () => {
    const invalid = { ...BASELINE_SEALED_V1, commit: 'abc' };

    const result = validateBaseline(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('commit must be at least 7 characters');
  });

  it('fails for invalid seal_status', () => {
    const invalid = { ...BASELINE_SEALED_V1, seal_status: 'INVALID' as any };

    const result = validateBaseline(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('seal_status must be SEALED, PENDING, or UNKNOWN');
  });
});

describe('isBaselineApplicable', () => {
  it('returns true for SEALED baseline with tests', () => {
    const result = isBaselineApplicable(BASELINE_SEALED_V1);

    expect(result).toBe(true);
  });

  it('returns false for PENDING baseline', () => {
    const result = isBaselineApplicable(BASELINE_PENDING);

    expect(result).toBe(false);
  });

  it('returns false for SEALED baseline with zero tests', () => {
    const noTests: SealedBaseline = {
      ...BASELINE_SEALED_V1,
      test_results: { ...VALID_TEST_RESULTS, total_tests: 0 }
    };

    const result = isBaselineApplicable(noTests);

    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// COMPARISON TESTS
// ─────────────────────────────────────────────────────────────

describe('compareBaselines', () => {
  it('orders by sealed_at timestamp', () => {
    const result = compareBaselines(BASELINE_SEALED_V1, BASELINE_SEALED_V2);

    expect(result).toBeLessThan(0); // V1 is earlier, so should come first

    const reverseResult = compareBaselines(BASELINE_SEALED_V2, BASELINE_SEALED_V1);
    expect(reverseResult).toBeGreaterThan(0);
  });

  it('returns zero for same timestamp and version', () => {
    const result = compareBaselines(BASELINE_SEALED_V1, BASELINE_SEALED_V1);

    expect(result).toBe(0);
  });

  it('uses version as tiebreaker for same timestamp', () => {
    const sameTime: SealedBaseline = {
      ...BASELINE_SEALED_V2,
      sealed_at: BASELINE_SEALED_V1.sealed_at,
      version: '1.5.0'
    };

    const result = compareBaselines(BASELINE_SEALED_V1, sameTime);

    // '1.0.0'.localeCompare('1.5.0') < 0
    expect(result).toBeLessThan(0);
  });
});
