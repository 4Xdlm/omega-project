/**
 * MATRIX BUILDER TESTS — Phase F Non-Regression
 * Tests for the matrix builder module functions.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * INV-REGR-005: Regression test mandatory
 */

import { describe, it, expect } from 'vitest';
import {
  buildRegressionMatrix,
  computeSummary,
  determineOverallStatus,
  requiresHumanDecision,
  validateMatrix,
  generateEventId,
  GENERATOR,
  type RegressionCheckResult,
  type CandidateVersion,
  type RegressionMatrix,
  type RegressionFinding,
} from '../../../governance/regression/index.js';

// ─────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────

const PASSING_ENTRY: RegressionCheckResult = {
  check_id: 'CHK_001',
  baseline_id: 'BL_001',
  baseline_version: 'v1.0.0',
  candidate_version: 'v1.1.0',
  status: 'PASS',
  tests_total: 100,
  tests_passed: 100,
  tests_failed: 0,
  tests_waived: 0,
  regressions_detected: [],
  waiver_refs: [],
  failure_refs: [],
};

const FAILING_ENTRY: RegressionCheckResult = {
  check_id: 'CHK_002',
  baseline_id: 'BL_002',
  baseline_version: 'v1.0.0',
  candidate_version: 'v1.1.0',
  status: 'FAIL',
  tests_total: 100,
  tests_passed: 95,
  tests_failed: 5,
  tests_waived: 0,
  regressions_detected: [
    {
      finding_id: 'FIND_001',
      type: 'TEST_FAILURE_INCREASE',
      description: 'Test failures increased from 0 to 5',
      baseline_value: '0',
      observed_value: '5',
      severity: 'major',
      evidence: ['test-results.json'],
    },
  ],
  waiver_refs: [],
  failure_refs: ['test1.ts', 'test2.ts'],
};

const WAIVED_ENTRY: RegressionCheckResult = {
  check_id: 'CHK_003',
  baseline_id: 'BL_003',
  baseline_version: 'v1.0.0',
  candidate_version: 'v1.1.0',
  status: 'WAIVED',
  tests_total: 100,
  tests_passed: 98,
  tests_failed: 2,
  tests_waived: 2,
  regressions_detected: [],
  waiver_refs: ['WAIVER_001'],
  failure_refs: [],
};

const CRITICAL_REGRESSION_ENTRY: RegressionCheckResult = {
  check_id: 'CHK_004',
  baseline_id: 'BL_004',
  baseline_version: 'v1.0.0',
  candidate_version: 'v1.1.0',
  status: 'PASS',
  tests_total: 100,
  tests_passed: 100,
  tests_failed: 0,
  tests_waived: 0,
  regressions_detected: [
    {
      finding_id: 'FIND_002',
      type: 'API_COMPATIBILITY_BREAK',
      description: 'Breaking API change detected',
      baseline_value: 'v1 API',
      observed_value: 'v2 API',
      severity: 'critical',
      evidence: ['api-diff.json'],
    },
  ],
  waiver_refs: [],
  failure_refs: [],
};

const TEST_CANDIDATE: CandidateVersion = {
  version: 'v1.1.0',
  commit: 'abc1234567890',
  branch: 'feature/test',
  test_results: {
    total_tests: 100,
    passed: 100,
    failed: 0,
    skipped: 0,
    duration_ms: 5000,
    assertions_count: 300,
    output_hash: 'a'.repeat(64),
    test_files: ['test1.ts', 'test2.ts'],
  },
};

const FIXED_TIMESTAMP = '2026-02-04T10:00:00.000Z';

// ─────────────────────────────────────────────────────────────
// buildRegressionMatrix TESTS
// ─────────────────────────────────────────────────────────────

describe('buildRegressionMatrix', () => {
  it('builds valid matrix from entries', () => {
    const matrix = buildRegressionMatrix(
      [PASSING_ENTRY],
      TEST_CANDIDATE,
      FIXED_TIMESTAMP
    );

    expect(matrix.event_type).toBe('regression_result');
    expect(matrix.schema_version).toBe('1.0.0');
    expect(matrix.entries).toHaveLength(1);
    expect(matrix.entries[0]).toEqual(PASSING_ENTRY);
    expect(matrix.generator).toBe(GENERATOR);
  });

  it('includes candidate_ref', () => {
    const matrix = buildRegressionMatrix(
      [PASSING_ENTRY],
      TEST_CANDIDATE,
      FIXED_TIMESTAMP
    );

    expect(matrix.candidate_ref).toEqual(TEST_CANDIDATE);
    expect(matrix.candidate_ref.version).toBe('v1.1.0');
    expect(matrix.candidate_ref.commit).toBe('abc1234567890');
  });

  it('generates deterministic event_id', () => {
    const matrix1 = buildRegressionMatrix(
      [PASSING_ENTRY],
      TEST_CANDIDATE,
      FIXED_TIMESTAMP
    );
    const matrix2 = buildRegressionMatrix(
      [PASSING_ENTRY],
      TEST_CANDIDATE,
      FIXED_TIMESTAMP
    );

    // Same inputs -> same event_id
    expect(matrix1.event_id).toBe(matrix2.event_id);
    expect(matrix1.event_id).toMatch(/^REG_/);
  });

  it('includes non-actuation notes', () => {
    const matrix = buildRegressionMatrix(
      [PASSING_ENTRY],
      TEST_CANDIDATE,
      FIXED_TIMESTAMP
    );

    expect(matrix.notes.toLowerCase()).toContain('no automatic action');
  });
});

// ─────────────────────────────────────────────────────────────
// computeSummary TESTS
// ─────────────────────────────────────────────────────────────

describe('computeSummary', () => {
  it('counts passed/failed/waived correctly', () => {
    const entries = [PASSING_ENTRY, FAILING_ENTRY, WAIVED_ENTRY];
    const summary = computeSummary(entries);

    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.waived).toBe(1);
    expect(summary.baselines_checked).toBe(3);
    expect(summary.total_checks).toBe(3);
  });

  it('counts total regressions found', () => {
    const entries = [PASSING_ENTRY, FAILING_ENTRY, CRITICAL_REGRESSION_ENTRY];
    const summary = computeSummary(entries);

    // FAILING_ENTRY has 1, CRITICAL_REGRESSION_ENTRY has 1
    expect(summary.regressions_found).toBe(2);
  });

  it('counts critical regressions', () => {
    const entries = [PASSING_ENTRY, FAILING_ENTRY, CRITICAL_REGRESSION_ENTRY];
    const summary = computeSummary(entries);

    // Only CRITICAL_REGRESSION_ENTRY has critical severity
    expect(summary.critical_regressions).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// determineOverallStatus TESTS
// ─────────────────────────────────────────────────────────────

describe('determineOverallStatus', () => {
  it('returns PASS when all entries pass', () => {
    const status = determineOverallStatus([PASSING_ENTRY, PASSING_ENTRY]);

    expect(status).toBe('PASS');
  });

  it('returns FAIL when any entry fails', () => {
    const status = determineOverallStatus([PASSING_ENTRY, FAILING_ENTRY]);

    expect(status).toBe('FAIL');
  });

  it('returns WAIVED when some waived, none fail', () => {
    const status = determineOverallStatus([PASSING_ENTRY, WAIVED_ENTRY]);

    expect(status).toBe('WAIVED');
  });

  it('returns PASS for empty entries', () => {
    const status = determineOverallStatus([]);

    expect(status).toBe('PASS');
  });
});

// ─────────────────────────────────────────────────────────────
// requiresHumanDecision TESTS
// ─────────────────────────────────────────────────────────────

describe('requiresHumanDecision', () => {
  it('returns true when any entry failed', () => {
    const result = requiresHumanDecision([PASSING_ENTRY, FAILING_ENTRY]);

    expect(result).toBe(true);
  });

  it('returns true for critical regressions', () => {
    const result = requiresHumanDecision([PASSING_ENTRY, CRITICAL_REGRESSION_ENTRY]);

    expect(result).toBe(true);
  });

  it('returns false when all pass', () => {
    const result = requiresHumanDecision([PASSING_ENTRY, PASSING_ENTRY]);

    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// validateMatrix TESTS
// ─────────────────────────────────────────────────────────────

describe('validateMatrix', () => {
  it('passes for valid matrix', () => {
    const matrix = buildRegressionMatrix(
      [PASSING_ENTRY],
      TEST_CANDIDATE,
      FIXED_TIMESTAMP
    );
    const result = validateMatrix(matrix);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails for wrong event_type', () => {
    const matrix = buildRegressionMatrix(
      [PASSING_ENTRY],
      TEST_CANDIDATE,
      FIXED_TIMESTAMP
    );
    const invalidMatrix = { ...matrix, event_type: 'wrong_type' } as unknown as RegressionMatrix;
    const result = validateMatrix(invalidMatrix);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('event_type must be "regression_result"');
  });

  it('fails for missing candidate_ref', () => {
    const matrix = buildRegressionMatrix(
      [PASSING_ENTRY],
      TEST_CANDIDATE,
      FIXED_TIMESTAMP
    );
    const invalidMatrix = { ...matrix, candidate_ref: null } as unknown as RegressionMatrix;
    const result = validateMatrix(invalidMatrix);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('candidate_ref is required');
  });

  it('fails for missing non-actuation notes', () => {
    const matrix = buildRegressionMatrix(
      [PASSING_ENTRY],
      TEST_CANDIDATE,
      FIXED_TIMESTAMP
    );
    const invalidMatrix = { ...matrix, notes: 'Some other note' } as RegressionMatrix;
    const result = validateMatrix(invalidMatrix);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('notes must contain non-actuation statement');
  });
});

// ─────────────────────────────────────────────────────────────
// generateEventId TESTS
// ─────────────────────────────────────────────────────────────

describe('generateEventId', () => {
  it('produces REG_ prefix format', () => {
    const eventId = generateEventId(new Date(FIXED_TIMESTAMP), 'test-content');

    expect(eventId).toMatch(/^REG_/);
  });

  it('includes timestamp and hash', () => {
    const eventId = generateEventId(new Date(FIXED_TIMESTAMP), 'test-content');

    // Format: REG_{timestamp}_{hash}
    const parts = eventId.split('_');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('REG');
    // Timestamp part should contain date info
    expect(parts[1]).toMatch(/^\d{8}T\d{6}Z$/);
    // Hash part should be 8 hex characters
    expect(parts[2]).toMatch(/^[a-f0-9]{8}$/);
  });
});
