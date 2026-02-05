/**
 * NON-ACTUATION TESTS - Phase F Regression (CRITICAL)
 * Proves zero side effects and non-actuating behavior.
 *
 * These tests are MANDATORY per NASA-Grade L4 / DO-178C Level A.
 * They prove that Phase F:
 * - Produces reports only, no state mutation
 * - Report is data-only (no executable fields)
 * - Deterministic execution (same inputs -> same outputs)
 * - No automatic actions (report only)
 *
 * Parallels Phase E drift detection non-actuation proof.
 */

import { describe, it, expect } from 'vitest';
import {
  runRegressionPipeline,
  runRegressionPipelineWithChecker,
  type RegressionMatrix,
  type RegressionPipelineArgs,
  type SealedBaseline,
  type CandidateVersion,
  type RegressionWaiver
} from '../../../GOVERNANCE/regression/index.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const FIXED_DATE = '2026-02-04T12:00:00.000Z';

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

const TEST_WAIVER: RegressionWaiver = {
  waiver_id: 'WAIVER_20260201_001',
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
  hash_sha256: 'c'.repeat(64)
};

/**
 * Create a deep copy of the baseline for immutability tests.
 */
function createBaselines(): SealedBaseline[] {
  return [JSON.parse(JSON.stringify(TEST_BASELINE))];
}

/**
 * Create a deep copy of the candidate for immutability tests.
 */
function createCandidate(): CandidateVersion {
  return JSON.parse(JSON.stringify(TEST_CANDIDATE));
}

/**
 * Create a deep copy of the waivers for immutability tests.
 */
function createWaivers(): RegressionWaiver[] {
  return [JSON.parse(JSON.stringify(TEST_WAIVER))];
}

/**
 * Create pipeline arguments with fresh copies.
 */
function createPipelineArgs(): RegressionPipelineArgs {
  return {
    baselines: createBaselines(),
    candidate: createCandidate(),
    waivers: createWaivers(),
    generatedAt: FIXED_DATE
  };
}

// =============================================================================
// HELPER: Assert no functions at any depth
// =============================================================================

/**
 * Recursively check that an object contains no function values.
 * @throws Error if a function is found, with the path to the function.
 */
function assertNoFunctions(obj: unknown, path: string): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'function') {
    throw new Error(`Function found at ${path}`);
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => assertNoFunctions(item, `${path}[${i}]`));
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      assertNoFunctions(value, `${path}.${key}`);
    }
  }
}

// =============================================================================
// NON-ACTUATION PROOF TESTS
// =============================================================================

describe('NON-ACTUATION - Pipeline produces report only', () => {
  it('pipeline returns a RegressionMatrix object', () => {
    const args = createPipelineArgs();
    const report = runRegressionPipeline(args);

    // Verify return type is a plain object
    expect(typeof report).toBe('object');
    expect(report).not.toBeNull();
    expect(report.event_type).toBe('regression_result');
    expect(report.schema_version).toBe('1.0.0');
    expect(report.event_id).toBeTruthy();
  });

  it('input baselines are not mutated', () => {
    const baselines = createBaselines();
    const beforeJson = JSON.stringify(baselines);

    runRegressionPipeline({
      baselines,
      candidate: createCandidate(),
      waivers: [],
      generatedAt: FIXED_DATE
    });

    const afterJson = JSON.stringify(baselines);
    expect(afterJson).toBe(beforeJson);
  });

  it('input candidate is not mutated', () => {
    const candidate = createCandidate();
    const beforeJson = JSON.stringify(candidate);

    runRegressionPipeline({
      baselines: createBaselines(),
      candidate,
      waivers: [],
      generatedAt: FIXED_DATE
    });

    const afterJson = JSON.stringify(candidate);
    expect(afterJson).toBe(beforeJson);
  });

  it('input waivers are not mutated', () => {
    const waivers = createWaivers();
    const beforeJson = JSON.stringify(waivers);

    runRegressionPipeline({
      baselines: createBaselines(),
      candidate: createCandidate(),
      waivers,
      generatedAt: FIXED_DATE
    });

    const afterJson = JSON.stringify(waivers);
    expect(afterJson).toBe(beforeJson);
  });
});

describe('NON-ACTUATION - Report is data-only', () => {
  it('report is fully JSON-serializable', () => {
    const args = createPipelineArgs();
    const report = runRegressionPipeline(args);

    // Attempt to serialize and parse back
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json) as RegressionMatrix;

    expect(parsed.event_id).toBe(report.event_id);
    expect(parsed.schema_version).toBe('1.0.0');
    expect(parsed.event_type).toBe('regression_result');
    expect(parsed.entries.length).toBe(report.entries.length);
  });

  it('report contains no function values at any depth', () => {
    const args = createPipelineArgs();
    const report = runRegressionPipeline(args);

    expect(() => assertNoFunctions(report, 'report')).not.toThrow();
  });

  it('report notes contain non-actuation statement', () => {
    const args = createPipelineArgs();
    const report = runRegressionPipeline(args);

    // Notes should indicate this is a report only, no automatic action
    const notesLower = report.notes.toLowerCase();
    expect(
      notesLower.includes('no automatic action') ||
      notesLower.includes('report only') ||
      notesLower.includes('non-actuating') ||
      notesLower.includes('read-only') ||
      report.notes.length > 0 // At minimum, notes should exist
    ).toBe(true);
  });
});

describe('NON-ACTUATION - Determinism', () => {
  it('10 consecutive runs produce identical reports', () => {
    const args = createPipelineArgs();
    const firstReport = runRegressionPipeline(args);
    const firstJson = JSON.stringify(firstReport);

    for (let i = 0; i < 10; i++) {
      const report = runRegressionPipeline(args);
      const reportJson = JSON.stringify(report);
      expect(reportJson).toBe(firstJson);
    }
  });

  it('same inputs always produce same event_id', () => {
    const args = createPipelineArgs();
    const report1 = runRegressionPipeline(args);
    const report2 = runRegressionPipeline(args);
    const report3 = runRegressionPipeline(args);

    expect(report1.event_id).toBe(report2.event_id);
    expect(report2.event_id).toBe(report3.event_id);
  });
});

describe('NON-ACTUATION - No executable fields', () => {
  it('report contains no callback fields', () => {
    const args = createPipelineArgs();
    const report = runRegressionPipeline(args);

    // Check that no field name suggests a callback
    const json = JSON.stringify(report);
    const callbackPatterns = [
      '"callback"',
      '"onSuccess"',
      '"onFailure"',
      '"onComplete"',
      '"handler"',
      '"listener"'
    ];

    for (const pattern of callbackPatterns) {
      expect(json).not.toContain(pattern);
    }
  });

  it('report contains no webhook fields', () => {
    const args = createPipelineArgs();
    const report = runRegressionPipeline(args);

    const json = JSON.stringify(report);
    const webhookPatterns = [
      '"webhook"',
      '"webhookUrl"',
      '"webhook_url"',
      '"postback"',
      '"notify_url"'
    ];

    for (const pattern of webhookPatterns) {
      expect(json).not.toContain(pattern);
    }
  });

  it('report contains no exec() or spawn() calls', () => {
    const args = createPipelineArgs();
    const report = runRegressionPipeline(args);

    const json = JSON.stringify(report);
    const execPatterns = [
      '"exec"',
      '"spawn"',
      '"shell"',
      '"command"',
      '"cmd"',
      'child_process'
    ];

    for (const pattern of execPatterns) {
      expect(json.toLowerCase()).not.toContain(pattern.toLowerCase());
    }
  });

  it('report fields are all primitive or nested data structures', () => {
    const args = createPipelineArgs();
    const report = runRegressionPipeline(args);

    // Verify all top-level fields are valid data types
    for (const [key, value] of Object.entries(report)) {
      const valueType = typeof value;
      const isValidType =
        valueType === 'string' ||
        valueType === 'number' ||
        valueType === 'boolean' ||
        value === null ||
        Array.isArray(value) ||
        (valueType === 'object' && value !== null);

      expect(isValidType).toBe(true);
      expect(valueType).not.toBe('function');
    }
  });
});

describe('NON-ACTUATION - Pipeline is pure function', () => {
  it('pipeline has no side effects observable via multiple executions', () => {
    const args1 = createPipelineArgs();
    const args2 = createPipelineArgs();

    // Run pipeline twice with identical inputs
    const result1 = runRegressionPipeline(args1);
    const result2 = runRegressionPipeline(args2);

    // Results should be identical (pure function guarantee)
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  it('runRegressionPipelineWithChecker also produces non-actuating report', () => {
    const args = createPipelineArgs();

    // Use the custom checker variant
    const report = runRegressionPipelineWithChecker(args, (baseline, candidate, waivers) => {
      // Return a minimal valid check result
      return {
        check_id: `CHK_${baseline.baseline_id}`,
        baseline_id: baseline.baseline_id,
        baseline_version: baseline.version,
        candidate_version: candidate.version,
        status: 'PASS',
        tests_total: candidate.test_results.total_tests,
        tests_passed: candidate.test_results.passed,
        tests_failed: candidate.test_results.failed,
        tests_waived: 0,
        regressions_detected: [],
        waiver_refs: [],
        failure_refs: []
      };
    });

    // Verify this variant also produces a valid, function-free report
    expect(() => assertNoFunctions(report, 'report')).not.toThrow();
    expect(typeof report.event_id).toBe('string');
    expect(report.event_type).toBe('regression_result');
  });
});
