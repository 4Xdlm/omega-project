/**
 * PIPELINE TESTS — Phase F Non-Regression
 * Comprehensive tests for the regression pipeline module.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * INV-REGR-005: Regression test mandatory
 */

import { describe, it, expect } from 'vitest';
import {
  runRegressionPipeline,
  runRegressionPipelineWithChecker,
  filterApplicableBaselines,
  matchWaivers,
  GENERATOR
} from '../../../governance/regression/index.js';
import type {
  SealedBaseline,
  CandidateVersion,
  RegressionWaiver,
  RegressionPipelineArgs,
  RegressionCheckResult
} from '../../../governance/regression/index.js';

// ─────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────

const FIXED_DATE = '2026-02-04T10:00:00.000Z';

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

const BASELINE_NO_TESTS: SealedBaseline = {
  baseline_id: 'BL-004',
  version: '4.0.0',
  commit: 'jkl0123456789',
  tag: 'v4.0.0',
  sealed_at: '2026-02-02T08:00:00.000Z',
  manifest_sha256: '55e96d37e9439dd9e775bac63ffe94e427de0bbf54247766b5e534f06d80aa12',
  test_results: { ...VALID_TEST_RESULTS, total_tests: 0 },
  proof_ref: 'nexus/proof/phase-f/BL-004.json',
  seal_status: 'SEALED'
};

const CANDIDATE: CandidateVersion = {
  version: '2.1.0',
  commit: 'xyz9876543210',
  branch: 'feature/improvement',
  test_results: {
    total_tests: 180,
    passed: 178,
    failed: 2,
    skipped: 0,
    duration_ms: 5200,
    assertions_count: 520,
    output_hash: 'ce9dc999cad0b938a0e5ae7182bb7d6d1a30c424847dc32c03f8e525c1522660',
    test_files: ['test1.ts', 'test2.ts', 'test3.ts']
  }
};

const WAIVER_ACTIVE: RegressionWaiver = {
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
  proof_ref: 'waivers/PHASE_F/WAIVER_001.json',
  hash_sha256: 'a'.repeat(64)
};

const WAIVER_EXPIRED: RegressionWaiver = {
  waiver_id: 'WAIVER_002',
  baseline_id: 'BL-001',
  gap_id: 'GAP-OUTPUT_HASH_MISMATCH',
  severity: 'major',
  status: 'EXPIRED',
  approved_by: 'Francky',
  approved_at: '2026-01-01T00:00:00Z',
  reason: 'Temporary output change',
  scope_limitations: [],
  expires_on_phase: 'E',
  proof_ref: 'waivers/PHASE_F/WAIVER_002.json',
  hash_sha256: 'b'.repeat(64)
};

const WAIVER_FOR_BL002: RegressionWaiver = {
  waiver_id: 'WAIVER_003',
  baseline_id: 'BL-002',
  gap_id: 'GAP-DURATION_REGRESSION',
  severity: 'minor',
  status: 'ACTIVE',
  approved_by: 'Francky',
  approved_at: '2026-02-01T00:00:00Z',
  reason: 'Performance variance acceptable',
  scope_limitations: [],
  expires_on_phase: 'H',
  proof_ref: 'waivers/PHASE_F/WAIVER_003.json',
  hash_sha256: 'c'.repeat(64)
};

// ─────────────────────────────────────────────────────────────
// runRegressionPipeline TESTS
// ─────────────────────────────────────────────────────────────

describe('regression_pipeline/runRegressionPipeline', () => {
  it('produces valid REGRESSION_MATRIX', () => {
    const args: RegressionPipelineArgs = {
      baselines: [BASELINE_SEALED_V1],
      candidate: CANDIDATE,
      waivers: [],
      generatedAt: FIXED_DATE
    };

    const matrix = runRegressionPipeline(args);

    expect(matrix.event_type).toBe('regression_result');
    expect(matrix.schema_version).toBe('1.0.0');
    expect(matrix.candidate_ref).toEqual(CANDIDATE);
    expect(matrix.entries.length).toBeGreaterThan(0);
    expect(matrix.generated_at).toBe(FIXED_DATE);
  });

  it('includes all mandatory fields', () => {
    const args: RegressionPipelineArgs = {
      baselines: [BASELINE_SEALED_V1],
      candidate: CANDIDATE,
      waivers: [],
      generatedAt: FIXED_DATE
    };

    const matrix = runRegressionPipeline(args);

    // Mandatory fields check
    expect(matrix.event_id).toBeTruthy();
    expect(matrix.timestamp).toBeTruthy();
    expect(matrix.candidate_ref).toBeDefined();
    expect(matrix.entries).toBeDefined();
    expect(Array.isArray(matrix.entries)).toBe(true);
    expect(matrix.overall_status).toBeTruthy();
    expect(typeof matrix.requires_human_decision).toBe('boolean');
    expect(matrix.summary).toBeDefined();
    expect(matrix.notes).toBeTruthy();
    expect(matrix.generated_at).toBeTruthy();
    expect(matrix.generator).toBeTruthy();
  });

  it('uses GENERATOR identifier', () => {
    const args: RegressionPipelineArgs = {
      baselines: [BASELINE_SEALED_V1],
      candidate: CANDIDATE,
      waivers: [],
      generatedAt: FIXED_DATE
    };

    const matrix = runRegressionPipeline(args);

    expect(matrix.generator).toBe(GENERATOR);
    expect(matrix.generator).toContain('Phase F');
  });

  it('computes correct summary', () => {
    const args: RegressionPipelineArgs = {
      baselines: [BASELINE_SEALED_V1, BASELINE_SEALED_V2],
      candidate: CANDIDATE,
      waivers: [],
      generatedAt: FIXED_DATE
    };

    const matrix = runRegressionPipeline(args);

    expect(matrix.summary.baselines_checked).toBe(2);
    expect(matrix.summary.total_checks).toBe(2);
    expect(typeof matrix.summary.passed).toBe('number');
    expect(typeof matrix.summary.failed).toBe('number');
    expect(typeof matrix.summary.waived).toBe('number');
    expect(typeof matrix.summary.regressions_found).toBe('number');
    expect(typeof matrix.summary.critical_regressions).toBe('number');
    // Sum of passed + failed + waived should equal total_checks
    expect(matrix.summary.passed + matrix.summary.failed + matrix.summary.waived).toBe(matrix.summary.total_checks);
  });
});

// ─────────────────────────────────────────────────────────────
// PIPELINE VALIDATION (INV-REGR-005)
// ─────────────────────────────────────────────────────────────

describe('regression_pipeline/INV-REGR-005', () => {
  it('throws when baselines array empty', () => {
    const args: RegressionPipelineArgs = {
      baselines: [],
      candidate: CANDIDATE,
      waivers: [],
      generatedAt: FIXED_DATE
    };

    expect(() => runRegressionPipeline(args)).toThrow('INV-REGR-005');
  });

  it('throws when no applicable baselines', () => {
    // All baselines are PENDING or have no tests
    const args: RegressionPipelineArgs = {
      baselines: [BASELINE_PENDING, BASELINE_NO_TESTS],
      candidate: CANDIDATE,
      waivers: [],
      generatedAt: FIXED_DATE
    };

    expect(() => runRegressionPipeline(args)).toThrow('INV-REGR-005');
    expect(() => runRegressionPipeline(args)).toThrow('No applicable baselines');
  });
});

// ─────────────────────────────────────────────────────────────
// filterApplicableBaselines TESTS
// ─────────────────────────────────────────────────────────────

describe('regression_pipeline/filterApplicableBaselines', () => {
  it('returns only SEALED baselines', () => {
    const baselines = [BASELINE_SEALED_V1, BASELINE_SEALED_V2, BASELINE_PENDING];

    const filtered = filterApplicableBaselines(baselines);

    expect(filtered).toHaveLength(2);
    expect(filtered.every(b => b.seal_status === 'SEALED')).toBe(true);
  });

  it('filters out PENDING baselines', () => {
    const baselines = [BASELINE_SEALED_V1, BASELINE_PENDING];

    const filtered = filterApplicableBaselines(baselines);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].baseline_id).toBe('BL-001');
    expect(filtered.find(b => b.seal_status === 'PENDING')).toBeUndefined();
  });

  it('filters out baselines with no tests', () => {
    const baselines = [BASELINE_SEALED_V1, BASELINE_NO_TESTS];

    const filtered = filterApplicableBaselines(baselines);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].baseline_id).toBe('BL-001');
    expect(filtered.find(b => b.test_results.total_tests === 0)).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// matchWaivers TESTS
// ─────────────────────────────────────────────────────────────

describe('regression_pipeline/matchWaivers', () => {
  it('returns waivers matching baseline_id', () => {
    const waivers = [WAIVER_ACTIVE, WAIVER_EXPIRED, WAIVER_FOR_BL002];

    const matched = matchWaivers(waivers, 'BL-001');

    // WAIVER_ACTIVE matches BL-001 and is ACTIVE
    // WAIVER_EXPIRED matches BL-001 but is EXPIRED
    expect(matched).toHaveLength(1);
    expect(matched[0].waiver_id).toBe('WAIVER_001');
  });

  it('returns only ACTIVE waivers', () => {
    const waivers = [WAIVER_ACTIVE, WAIVER_EXPIRED];

    const matched = matchWaivers(waivers, 'BL-001');

    expect(matched.every(w => w.status === 'ACTIVE')).toBe(true);
    expect(matched.find(w => w.status === 'EXPIRED')).toBeUndefined();
  });

  it('returns empty for no matches', () => {
    const waivers = [WAIVER_ACTIVE, WAIVER_FOR_BL002];

    const matched = matchWaivers(waivers, 'BL-NONEXISTENT');

    expect(matched).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// runRegressionPipelineWithChecker TESTS
// ─────────────────────────────────────────────────────────────

describe('regression_pipeline/runRegressionPipelineWithChecker', () => {
  it('allows custom checker function', () => {
    const mockResult: RegressionCheckResult = {
      check_id: 'CHK-MOCK-001',
      baseline_id: 'BL-001',
      baseline_version: '1.0.0',
      candidate_version: '2.1.0',
      status: 'PASS',
      tests_total: 150,
      tests_passed: 150,
      tests_failed: 0,
      tests_waived: 0,
      regressions_detected: [],
      waiver_refs: [],
      failure_refs: []
    };

    const customChecker = () => mockResult;

    const args: RegressionPipelineArgs = {
      baselines: [BASELINE_SEALED_V1],
      candidate: CANDIDATE,
      waivers: [],
      generatedAt: FIXED_DATE
    };

    const matrix = runRegressionPipelineWithChecker(args, customChecker);

    expect(matrix.entries).toHaveLength(1);
    expect(matrix.entries[0].check_id).toBe('CHK-MOCK-001');
    expect(matrix.overall_status).toBe('PASS');
  });

  it('passes correct arguments to checker', () => {
    let capturedBaseline: SealedBaseline | null = null;
    let capturedCandidate: CandidateVersion | null = null;
    let capturedWaivers: readonly RegressionWaiver[] = [];

    const capturingChecker = (
      baseline: SealedBaseline,
      candidate: CandidateVersion,
      waivers: readonly RegressionWaiver[]
    ): RegressionCheckResult => {
      capturedBaseline = baseline;
      capturedCandidate = candidate;
      capturedWaivers = waivers;

      return {
        check_id: 'CHK-CAPTURE-001',
        baseline_id: baseline.baseline_id,
        baseline_version: baseline.version,
        candidate_version: candidate.version,
        status: 'PASS',
        tests_total: 150,
        tests_passed: 150,
        tests_failed: 0,
        tests_waived: 0,
        regressions_detected: [],
        waiver_refs: [],
        failure_refs: []
      };
    };

    const args: RegressionPipelineArgs = {
      baselines: [BASELINE_SEALED_V1],
      candidate: CANDIDATE,
      waivers: [WAIVER_ACTIVE],
      generatedAt: FIXED_DATE
    };

    runRegressionPipelineWithChecker(args, capturingChecker);

    expect(capturedBaseline).toEqual(BASELINE_SEALED_V1);
    expect(capturedCandidate).toEqual(CANDIDATE);
    expect(capturedWaivers).toHaveLength(1);
    expect(capturedWaivers[0].waiver_id).toBe('WAIVER_001');
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM TESTS
// ─────────────────────────────────────────────────────────────

describe('regression_pipeline/determinism', () => {
  it('identical inputs produce identical outputs', () => {
    const args: RegressionPipelineArgs = {
      baselines: [BASELINE_SEALED_V1, BASELINE_SEALED_V2],
      candidate: CANDIDATE,
      waivers: [WAIVER_ACTIVE],
      generatedAt: FIXED_DATE
    };

    const matrix1 = runRegressionPipeline(args);
    const matrix2 = runRegressionPipeline(args);

    expect(matrix1.event_id).toBe(matrix2.event_id);
    expect(matrix1.overall_status).toBe(matrix2.overall_status);
    expect(matrix1.summary).toEqual(matrix2.summary);
    expect(matrix1.entries.length).toBe(matrix2.entries.length);
    expect(matrix1.generated_at).toBe(matrix2.generated_at);
  });

  it('report_id is deterministic', () => {
    const args: RegressionPipelineArgs = {
      baselines: [BASELINE_SEALED_V1],
      candidate: CANDIDATE,
      waivers: [],
      generatedAt: FIXED_DATE
    };

    const matrix1 = runRegressionPipeline(args);
    const matrix2 = runRegressionPipeline(args);

    // Event ID should be deterministic for same inputs
    expect(matrix1.event_id).toBe(matrix2.event_id);
    expect(matrix1.event_id).toMatch(/^REG_\d{8}T\d{6}Z_[a-f0-9]{8}$/);
  });
});
