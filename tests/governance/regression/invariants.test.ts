/**
 * PHASE F - NON-REGRESSION INVARIANTS TESTS
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Comprehensive tests for all 5 Phase F invariants:
 *   INV-REGR-001: Snapshot immutability
 *   INV-REGR-002: Backward compatibility default
 *   INV-REGR-003: Breaking change explicit
 *   INV-REGR-004: WAIVER human-signed
 *   INV-REGR-005: Regression test mandatory
 */

import { describe, it, expect } from 'vitest';
import type {
  SealedBaseline,
  CandidateVersion,
  RegressionWaiver,
  RegressionCheckResult,
  RegressionPipelineArgs
} from '../../../GOVERNANCE/regression/index.js';
import {
  createBaselineRegistry,
  getActiveBaselines,
  validateWaiver,
  runRegressionPipeline,
  runRegressionPipelineWithChecker,
  runRegressionCheck,
  determineStatus,
  determineOverallStatus,
  buildRegressionMatrix,
  filterApplicableBaselines
} from '../../../GOVERNANCE/regression/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const TEST_BASELINE: SealedBaseline = {
  baseline_id: 'BL_20260201_001',
  version: 'v1.0.0',
  commit: 'ce542f54',
  tag: 'phase-c-sealed',
  sealed_at: '2026-02-01T00:00:00Z',
  manifest_sha256: 'a'.repeat(64),
  test_results: {
    total_tests: 100,
    passed: 98,
    failed: 2,
    skipped: 0,
    duration_ms: 5000,
    assertions_count: 500,
    output_hash: 'b'.repeat(64),
    test_files: ['test1.ts', 'test2.ts']
  },
  proof_ref: 'nexus/proof/phase-c/',
  seal_status: 'SEALED'
};

const TEST_CANDIDATE: CandidateVersion = {
  version: 'v1.1.0-rc',
  commit: 'abc12345',
  branch: 'main',
  test_results: {
    total_tests: 100,
    passed: 98,
    failed: 2,
    skipped: 0,
    duration_ms: 5000,
    assertions_count: 500,
    output_hash: 'b'.repeat(64),
    test_files: ['test1.ts', 'test2.ts']
  }
};

/**
 * Create a valid waiver for testing.
 */
function createValidWaiver(overrides: Partial<RegressionWaiver> = {}): RegressionWaiver {
  return {
    waiver_id: 'WAIVER_20260201_GAP001',
    baseline_id: 'BL_20260201_001',
    gap_id: 'GAP-TEST_COUNT_DECREASE',
    severity: 'minor',
    status: 'ACTIVE',
    approved_by: 'Francky',
    approved_at: '2026-02-01T10:00:00Z',
    reason: 'Approved after review - tests refactored',
    scope_limitations: ['phase-f-only'],
    expires_on_phase: 'phase-g',
    proof_ref: 'nexus/proof/waiver-001/',
    hash_sha256: 'c'.repeat(64),
    ...overrides
  };
}

/**
 * Create a regressing candidate (more failures).
 */
function createRegressingCandidate(): CandidateVersion {
  return {
    ...TEST_CANDIDATE,
    test_results: {
      ...TEST_CANDIDATE.test_results,
      failed: 5, // Increased failures
      passed: 95
    }
  };
}

/**
 * Create a candidate with decreased test count.
 */
function createDecreasedTestCountCandidate(): CandidateVersion {
  return {
    ...TEST_CANDIDATE,
    test_results: {
      ...TEST_CANDIDATE.test_results,
      total_tests: 90,
      passed: 88
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INV-REGR-001: SNAPSHOT IMMUTABILITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-REGR-001: Snapshot immutability', () => {
  it('pipeline does not mutate input baselines', () => {
    // Arrange: Deep copy baseline for comparison
    const originalBaseline = JSON.parse(JSON.stringify(TEST_BASELINE));
    const baselines = [TEST_BASELINE];
    const args: RegressionPipelineArgs = {
      baselines,
      candidate: TEST_CANDIDATE,
      waivers: [],
      generatedAt: '2026-02-04T00:00:00Z'
    };

    // Act: Run pipeline
    runRegressionPipeline(args);

    // Assert: Baseline unchanged
    expect(baselines[0]).toEqual(originalBaseline);
    expect(baselines[0].baseline_id).toBe(originalBaseline.baseline_id);
    expect(baselines[0].test_results.total_tests).toBe(originalBaseline.test_results.total_tests);
    expect(baselines[0].manifest_sha256).toBe(originalBaseline.manifest_sha256);
  });

  it('registry returns readonly snapshots', () => {
    // Arrange
    const baselines = [TEST_BASELINE];
    const registry = createBaselineRegistry(baselines);

    // Act
    const activeBaselines = getActiveBaselines(registry);

    // Assert: Registry is frozen
    expect(Object.isFrozen(registry)).toBe(true);

    // Verify we can read but not modify conceptually
    expect(activeBaselines.length).toBe(1);
    expect(activeBaselines[0].baseline_id).toBe(TEST_BASELINE.baseline_id);
  });

  it('baseline values are preserved through pipeline execution', () => {
    // Arrange
    const baseline: SealedBaseline = { ...TEST_BASELINE };
    const originalHash = baseline.manifest_sha256;
    const originalTestCount = baseline.test_results.total_tests;

    // Act
    const result = runRegressionCheck(baseline, TEST_CANDIDATE, []);

    // Assert: Values referenced in result match original
    expect(result.baseline_id).toBe(baseline.baseline_id);
    expect(baseline.manifest_sha256).toBe(originalHash);
    expect(baseline.test_results.total_tests).toBe(originalTestCount);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-REGR-002: BACKWARD COMPATIBILITY DEFAULT
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-REGR-002: Backward compatibility default', () => {
  it('regression check defaults to FAIL when regression detected', () => {
    // Arrange: Candidate with more failures
    const regressingCandidate = createRegressingCandidate();

    // Act
    const result = runRegressionCheck(TEST_BASELINE, regressingCandidate, []);

    // Assert: Status is FAIL
    expect(result.status).toBe('FAIL');
    expect(result.regressions_detected.length).toBeGreaterThan(0);
  });

  it('status is PASS only when no regressions found', () => {
    // Arrange: Candidate with identical results
    const identicalCandidate: CandidateVersion = {
      ...TEST_CANDIDATE,
      test_results: { ...TEST_BASELINE.test_results }
    };

    // Act
    const result = runRegressionCheck(TEST_BASELINE, identicalCandidate, []);

    // Assert: Status is PASS
    expect(result.status).toBe('PASS');
    expect(result.regressions_detected.length).toBe(0);
  });

  it('one failing baseline = overall FAIL', () => {
    // Arrange: Two baselines - one will pass, one will fail
    const baseline1: SealedBaseline = { ...TEST_BASELINE, baseline_id: 'BL_001' };
    const baseline2: SealedBaseline = { ...TEST_BASELINE, baseline_id: 'BL_002' };

    // Candidate that passes baseline1 but fails baseline2
    const candidate: CandidateVersion = {
      ...TEST_CANDIDATE,
      test_results: {
        ...TEST_BASELINE.test_results,
        failed: 5 // More failures = regression
      }
    };

    // Create results
    const entries: RegressionCheckResult[] = [
      {
        check_id: 'CHK_001',
        baseline_id: 'BL_001',
        baseline_version: 'v1.0.0',
        candidate_version: 'v1.1.0-rc',
        status: 'PASS',
        tests_total: 100,
        tests_passed: 98,
        tests_failed: 2,
        tests_waived: 0,
        regressions_detected: [],
        waiver_refs: [],
        failure_refs: []
      },
      {
        check_id: 'CHK_002',
        baseline_id: 'BL_002',
        baseline_version: 'v1.0.0',
        candidate_version: 'v1.1.0-rc',
        status: 'FAIL',
        tests_total: 100,
        tests_passed: 95,
        tests_failed: 5,
        tests_waived: 0,
        regressions_detected: [{
          finding_id: 'FND_001',
          type: 'TEST_FAILURE_INCREASE',
          description: 'Failures increased',
          baseline_value: '2',
          observed_value: '5',
          severity: 'major',
          evidence: []
        }],
        waiver_refs: [],
        failure_refs: ['FND_001']
      }
    ];

    // Act
    const overallStatus = determineOverallStatus(entries);

    // Assert: Overall is FAIL because one baseline failed
    expect(overallStatus).toBe('FAIL');
  });

  it('determineStatus returns FAIL for any unwaived finding', () => {
    // Arrange
    const unwaivedFindings = [{
      finding_id: 'FND_001',
      type: 'TEST_FAILURE_INCREASE' as const,
      description: 'Test',
      baseline_value: '2',
      observed_value: '5',
      severity: 'major' as const,
      evidence: []
    }];

    // Act
    const status = determineStatus(unwaivedFindings, false);

    // Assert
    expect(status).toBe('FAIL');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-REGR-003: BREAKING CHANGE EXPLICIT
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-REGR-003: Breaking change explicit', () => {
  it('breaking changes are recorded in findings', () => {
    // Arrange: Candidate with regression
    const regressingCandidate = createRegressingCandidate();

    // Act
    const result = runRegressionCheck(TEST_BASELINE, regressingCandidate, []);

    // Assert: Findings contain the regression
    expect(result.regressions_detected.length).toBeGreaterThan(0);
    const finding = result.regressions_detected.find(f => f.type === 'TEST_FAILURE_INCREASE');
    expect(finding).toBeDefined();
    expect(finding?.description).toContain('increased');
  });

  it('findings include explicit severity', () => {
    // Arrange: Candidate with test count decrease
    const decreasedCandidate = createDecreasedTestCountCandidate();

    // Act
    const result = runRegressionCheck(TEST_BASELINE, decreasedCandidate, []);

    // Assert: Severity is explicitly set
    expect(result.regressions_detected.length).toBeGreaterThan(0);
    for (const finding of result.regressions_detected) {
      expect(['critical', 'major', 'minor']).toContain(finding.severity);
    }
  });

  it('breaking changes appear in failure_refs', () => {
    // Arrange
    const regressingCandidate = createRegressingCandidate();

    // Act
    const result = runRegressionCheck(TEST_BASELINE, regressingCandidate, []);

    // Assert: failure_refs contains finding IDs
    expect(result.failure_refs.length).toBeGreaterThan(0);
    // Each failure_ref should match a finding_id
    for (const ref of result.failure_refs) {
      const matchingFinding = result.regressions_detected.find(f => f.finding_id === ref);
      expect(matchingFinding).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-REGR-004: WAIVER HUMAN-SIGNED
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-REGR-004: WAIVER human-signed', () => {
  it('waiver without approved_by is invalid', () => {
    // Arrange: Waiver missing approved_by
    const invalidWaiver = createValidWaiver({ approved_by: '' });

    // Act
    const validation = validateWaiver(invalidWaiver);

    // Assert: Invalid with specific error
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('approved_by'))).toBe(true);
    expect(validation.errors.some(e => e.includes('INV-REGR-004'))).toBe(true);
  });

  it('waiver requires justification reason', () => {
    // Arrange: Waiver missing reason
    const invalidWaiver = createValidWaiver({ reason: '' });

    // Act
    const validation = validateWaiver(invalidWaiver);

    // Assert: Invalid with reason error
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('reason'))).toBe(true);
  });

  it('waiver expiration is factual', () => {
    // Arrange: Valid waiver with expiration phase
    const waiver = createValidWaiver({
      expires_on_phase: 'phase-g'
    });

    // Act
    const validation = validateWaiver(waiver);

    // Assert: Valid waiver must have expires_on_phase
    expect(validation.valid).toBe(true);
    expect(waiver.expires_on_phase).toBe('phase-g');
  });

  it('valid waiver passes validation', () => {
    // Arrange
    const validWaiver = createValidWaiver();

    // Act
    const validation = validateWaiver(validWaiver);

    // Assert
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-REGR-005: REGRESSION TEST MANDATORY
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-REGR-005: Regression test mandatory', () => {
  it('pipeline throws when no baselines provided', () => {
    // Arrange: Empty baselines array
    const args: RegressionPipelineArgs = {
      baselines: [],
      candidate: TEST_CANDIDATE,
      waivers: [],
      generatedAt: '2026-02-04T00:00:00Z'
    };

    // Act & Assert
    expect(() => runRegressionPipeline(args)).toThrow('INV-REGR-005');
  });

  it('pipeline throws when baselines is undefined', () => {
    // Arrange: Missing baselines
    const args = {
      baselines: undefined as unknown as readonly SealedBaseline[],
      candidate: TEST_CANDIDATE,
      waivers: [],
      generatedAt: '2026-02-04T00:00:00Z'
    } as RegressionPipelineArgs;

    // Act & Assert
    expect(() => runRegressionPipeline(args)).toThrow('INV-REGR-005');
  });

  it('every applicable baseline must be checked', () => {
    // Arrange: Multiple baselines
    const baseline1: SealedBaseline = { ...TEST_BASELINE, baseline_id: 'BL_001' };
    const baseline2: SealedBaseline = { ...TEST_BASELINE, baseline_id: 'BL_002' };
    const baseline3: SealedBaseline = { ...TEST_BASELINE, baseline_id: 'BL_003' };

    const args: RegressionPipelineArgs = {
      baselines: [baseline1, baseline2, baseline3],
      candidate: TEST_CANDIDATE,
      waivers: [],
      generatedAt: '2026-02-04T00:00:00Z'
    };

    // Act
    const matrix = runRegressionPipeline(args);

    // Assert: All baselines were checked
    expect(matrix.entries.length).toBe(3);
    expect(matrix.summary.baselines_checked).toBe(3);

    const checkedIds = matrix.entries.map(e => e.baseline_id);
    expect(checkedIds).toContain('BL_001');
    expect(checkedIds).toContain('BL_002');
    expect(checkedIds).toContain('BL_003');
  });

  it('only SEALED baselines are applicable', () => {
    // Arrange: Mix of SEALED and non-SEALED baselines
    const sealedBaseline: SealedBaseline = { ...TEST_BASELINE, baseline_id: 'BL_SEALED' };
    const pendingBaseline: SealedBaseline = {
      ...TEST_BASELINE,
      baseline_id: 'BL_PENDING',
      seal_status: 'PENDING'
    };
    const unknownBaseline: SealedBaseline = {
      ...TEST_BASELINE,
      baseline_id: 'BL_UNKNOWN',
      seal_status: 'UNKNOWN'
    };

    // Act
    const applicable = filterApplicableBaselines([sealedBaseline, pendingBaseline, unknownBaseline]);

    // Assert: Only SEALED baseline is applicable
    expect(applicable.length).toBe(1);
    expect(applicable[0].baseline_id).toBe('BL_SEALED');
  });
});
