/**
 * REGRESSION RUNNER TESTS — Phase F Non-Regression
 * Tests for the regression runner module functions.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * INV-REGR-002: Backward compatibility default
 * INV-REGR-005: Regression test mandatory
 */

import { describe, it, expect } from 'vitest';
import {
  runRegressionCheck,
  detectTestCountRegression,
  detectFailureIncrease,
  detectAssertionDecrease,
  detectOutputMismatch,
  detectDurationRegression,
  determineStatus,
  generateCheckId,
  generateFindingId
} from '../../../governance/regression/index.js';
import type {
  SealedBaseline,
  CandidateVersion,
  RegressionWaiver,
  RegressionFinding
} from '../../../governance/regression/index.js';

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

const BASELINE_SEALED: SealedBaseline = {
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

const CANDIDATE_PASSING: CandidateVersion = {
  version: '1.1.0',
  commit: 'def456789abcdef',
  branch: 'feature/new-feature',
  test_results: {
    ...VALID_TEST_RESULTS,
    total_tests: 155,
    passed: 153,
    failed: 2,
    assertions_count: 470
  }
};

const CANDIDATE_REGRESSING: CandidateVersion = {
  version: '1.1.0-bad',
  commit: 'bad0000000000',
  branch: 'feature/broken',
  test_results: {
    total_tests: 140, // Decreased from 150
    passed: 130,
    failed: 10, // Increased from 2
    skipped: 0,
    duration_ms: 7000, // Increased > 20%
    assertions_count: 400, // Decreased from 450
    output_hash: 'different_hash_value_here_1234567890abcdef1234567890abcdef',
    test_files: ['test1.ts']
  }
};

const ACTIVE_WAIVER: RegressionWaiver = {
  waiver_id: 'WAIVER_001',
  baseline_id: 'BL-001',
  gap_id: 'GAP-TEST_COUNT_DECREASE',
  severity: 'minor',
  status: 'ACTIVE',
  approved_by: 'Francky',
  approved_at: '2026-02-01T00:00:00Z',
  reason: 'Intentional test removal for deprecated feature',
  scope_limitations: ['Only applies to legacy module tests'],
  expires_on_phase: 'G',
  proof_ref: 'waivers/PHASE_F/',
  hash_sha256: 'c'.repeat(64)
};

// ─────────────────────────────────────────────────────────────
// runRegressionCheck TESTS
// ─────────────────────────────────────────────────────────────

describe('runRegressionCheck', () => {
  it('returns PASS when no regressions detected', () => {
    const result = runRegressionCheck(BASELINE_SEALED, CANDIDATE_PASSING, []);

    expect(result.status).toBe('PASS');
    expect(result.regressions_detected).toHaveLength(0);
    expect(result.failure_refs).toHaveLength(0);
  });

  it('returns FAIL when regressions detected', () => {
    const result = runRegressionCheck(BASELINE_SEALED, CANDIDATE_REGRESSING, []);

    expect(result.status).toBe('FAIL');
    expect(result.regressions_detected.length).toBeGreaterThan(0);
    expect(result.failure_refs.length).toBeGreaterThan(0);
  });

  it('returns WAIVED when all findings are waived', () => {
    // Create candidate with only test count decrease
    const candidateWithDecrease: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        total_tests: 145 // Decreased from 150
      }
    };

    const result = runRegressionCheck(BASELINE_SEALED, candidateWithDecrease, [ACTIVE_WAIVER]);

    expect(result.status).toBe('WAIVED');
    expect(result.waiver_refs).toContain('WAIVER_001');
    expect(result.failure_refs).toHaveLength(0);
  });

  it('includes all findings in regressions_detected', () => {
    const result = runRegressionCheck(BASELINE_SEALED, CANDIDATE_REGRESSING, []);

    // Should detect: test count decrease, failure increase, assertion decrease,
    // output mismatch, duration regression
    const findingTypes = result.regressions_detected.map(f => f.type);

    expect(findingTypes).toContain('TEST_COUNT_DECREASE');
    expect(findingTypes).toContain('TEST_FAILURE_INCREASE');
    expect(findingTypes).toContain('ASSERTION_COUNT_DECREASE');
    expect(findingTypes).toContain('OUTPUT_HASH_MISMATCH');
    expect(findingTypes).toContain('DURATION_REGRESSION');
  });
});

// ─────────────────────────────────────────────────────────────
// detectTestCountRegression TESTS
// ─────────────────────────────────────────────────────────────

describe('detectTestCountRegression', () => {
  it('detects when test count decreases', () => {
    const candidateWithDecrease: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        total_tests: 140 // Decreased from 150
      }
    };

    const finding = detectTestCountRegression(BASELINE_SEALED, candidateWithDecrease);

    expect(finding).not.toBeNull();
    expect(finding?.type).toBe('TEST_COUNT_DECREASE');
    expect(finding?.baseline_value).toBe('150');
    expect(finding?.observed_value).toBe('140');
    expect(finding?.description).toContain('-10 tests');
  });

  it('returns null when test count same or increased', () => {
    const findingSame = detectTestCountRegression(BASELINE_SEALED, {
      ...CANDIDATE_PASSING,
      test_results: { ...VALID_TEST_RESULTS, total_tests: 150 }
    });

    const findingIncreased = detectTestCountRegression(BASELINE_SEALED, CANDIDATE_PASSING);

    expect(findingSame).toBeNull();
    expect(findingIncreased).toBeNull();
  });

  it('calculates correct percentage', () => {
    const candidateWithDecrease: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        total_tests: 120 // 30 decrease from 150 = 20%
      }
    };

    const finding = detectTestCountRegression(BASELINE_SEALED, candidateWithDecrease);

    expect(finding).not.toBeNull();
    expect(finding?.description).toContain('-20.0%');
  });
});

// ─────────────────────────────────────────────────────────────
// detectFailureIncrease TESTS
// ─────────────────────────────────────────────────────────────

describe('detectFailureIncrease', () => {
  it('detects when failures increase', () => {
    const candidateWithMoreFailures: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        failed: 10 // Increased from 2
      }
    };

    const finding = detectFailureIncrease(BASELINE_SEALED, candidateWithMoreFailures);

    expect(finding).not.toBeNull();
    expect(finding?.type).toBe('TEST_FAILURE_INCREASE');
    expect(finding?.baseline_value).toBe('2');
    expect(finding?.observed_value).toBe('10');
    expect(finding?.description).toContain('+8 failures');
  });

  it('returns null when failures same or decreased', () => {
    const findingSame = detectFailureIncrease(BASELINE_SEALED, {
      ...CANDIDATE_PASSING,
      test_results: { ...VALID_TEST_RESULTS, failed: 2 }
    });

    const findingDecreased = detectFailureIncrease(BASELINE_SEALED, {
      ...CANDIDATE_PASSING,
      test_results: { ...VALID_TEST_RESULTS, failed: 0 }
    });

    expect(findingSame).toBeNull();
    expect(findingDecreased).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// detectAssertionDecrease TESTS
// ─────────────────────────────────────────────────────────────

describe('detectAssertionDecrease', () => {
  it('detects when assertions decrease', () => {
    const candidateWithFewerAssertions: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        assertions_count: 400 // Decreased from 450
      }
    };

    const finding = detectAssertionDecrease(BASELINE_SEALED, candidateWithFewerAssertions);

    expect(finding).not.toBeNull();
    expect(finding?.type).toBe('ASSERTION_COUNT_DECREASE');
    expect(finding?.baseline_value).toBe('450');
    expect(finding?.observed_value).toBe('400');
    expect(finding?.description).toContain('-50 assertions');
  });

  it('returns null when assertions same or increased', () => {
    const findingSame = detectAssertionDecrease(BASELINE_SEALED, {
      ...CANDIDATE_PASSING,
      test_results: { ...VALID_TEST_RESULTS, assertions_count: 450 }
    });

    const findingIncreased = detectAssertionDecrease(BASELINE_SEALED, CANDIDATE_PASSING);

    expect(findingSame).toBeNull();
    expect(findingIncreased).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// detectOutputMismatch TESTS
// ─────────────────────────────────────────────────────────────

describe('detectOutputMismatch', () => {
  it('detects when output hash differs', () => {
    const candidateWithDifferentHash: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        output_hash: 'different_hash_0000000000000000000000000000000000000000'
      }
    };

    const finding = detectOutputMismatch(BASELINE_SEALED, candidateWithDifferentHash);

    expect(finding).not.toBeNull();
    expect(finding?.type).toBe('OUTPUT_HASH_MISMATCH');
    expect(finding?.severity).toBe('major');
  });

  it('returns null when hashes match', () => {
    const candidateWithSameHash: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        output_hash: BASELINE_SEALED.test_results.output_hash
      }
    };

    const finding = detectOutputMismatch(BASELINE_SEALED, candidateWithSameHash);

    expect(finding).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// detectDurationRegression TESTS
// ─────────────────────────────────────────────────────────────

describe('detectDurationRegression', () => {
  it('detects when duration exceeds threshold (20%)', () => {
    const candidateWithSlowTests: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        duration_ms: 6500 // 30% increase from 5000
      }
    };

    const finding = detectDurationRegression(BASELINE_SEALED, candidateWithSlowTests);

    expect(finding).not.toBeNull();
    expect(finding?.type).toBe('DURATION_REGRESSION');
    expect(finding?.severity).toBe('minor');
    expect(finding?.description).toContain('30.0%');
  });

  it('returns null when within threshold', () => {
    const candidateWithAcceptableDuration: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        duration_ms: 5900 // 18% increase, under 20% threshold
      }
    };

    const finding = detectDurationRegression(BASELINE_SEALED, candidateWithAcceptableDuration);

    expect(finding).toBeNull();
  });

  it('respects custom threshold parameter', () => {
    const candidateWithSlowTests: CandidateVersion = {
      ...CANDIDATE_PASSING,
      test_results: {
        ...VALID_TEST_RESULTS,
        duration_ms: 5600 // 12% increase
      }
    };

    // With default 20% threshold, should not trigger
    const findingDefault = detectDurationRegression(BASELINE_SEALED, candidateWithSlowTests);
    expect(findingDefault).toBeNull();

    // With 10% threshold, should trigger
    const findingCustom = detectDurationRegression(BASELINE_SEALED, candidateWithSlowTests, 0.10);
    expect(findingCustom).not.toBeNull();
    expect(findingCustom?.type).toBe('DURATION_REGRESSION');
  });
});

// ─────────────────────────────────────────────────────────────
// determineStatus TESTS
// ─────────────────────────────────────────────────────────────

describe('determineStatus', () => {
  it('returns PASS for empty findings', () => {
    const status = determineStatus([], false);

    expect(status).toBe('PASS');
  });

  it('returns FAIL for unwaived findings', () => {
    const findings: Omit<RegressionFinding, 'finding_id'>[] = [{
      type: 'TEST_COUNT_DECREASE',
      description: 'Test count decreased',
      baseline_value: '150',
      observed_value: '140',
      severity: 'minor',
      evidence: []
    }];

    const status = determineStatus(findings, false);

    expect(status).toBe('FAIL');
  });

  it('returns WAIVED when has waived but no unwaived', () => {
    const status = determineStatus([], true);

    expect(status).toBe('WAIVED');
  });
});

// ─────────────────────────────────────────────────────────────
// ID GENERATION TESTS
// ─────────────────────────────────────────────────────────────

describe('ID generation', () => {
  it('generateCheckId produces correct format', () => {
    const date = new Date('2026-02-04T12:30:45.000Z');
    const checkId = generateCheckId('BL-001', 'abc1234567890def', date);

    // Format: CHK_{dateStr}_{commitShort}
    // dateStr is ISO with colons/dashes removed, first 15 chars
    expect(checkId).toMatch(/^CHK_\d{8}T\d{6}_[a-f0-9]{8}$/);
    expect(checkId).toContain('abc12345');
  });

  it('generateFindingId produces correct format', () => {
    const date = new Date('2026-02-04T12:30:45.000Z');
    const findingId = generateFindingId('TEST_COUNT_DECREASE', date, 1);

    // Format: FND_{type}_{dateStr}_{seqStr}
    expect(findingId).toMatch(/^FND_TEST_COUNT_DECREASE_\d{8}_\d{3}$/);
    expect(findingId).toContain('TEST_COUNT_DECREASE');
    expect(findingId).toContain('_001');
  });
});
