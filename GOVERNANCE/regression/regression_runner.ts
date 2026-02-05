/**
 * REGRESSION RUNNER — Execute regression checks
 *
 * INV-REGR-002: Backward compatibility default
 * INV-REGR-005: Regression test mandatory
 *
 * This module is NON-ACTUATING. It compares test results, does NOT run tests.
 */

import type {
  SealedBaseline,
  CandidateVersion,
  RegressionWaiver,
  RegressionCheckResult,
  RegressionFinding,
  RegressionType,
  RegressionStatus,
  RegressionSeverity
} from './types.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

/** Default duration regression threshold (20% increase) */
const DEFAULT_DURATION_THRESHOLD = 0.20;

// ─────────────────────────────────────────────────────────────
// MAIN RUNNER
// ─────────────────────────────────────────────────────────────

/**
 * Run regression check between a baseline and candidate.
 * Pure function - compares data only, no test execution.
 * @param baseline - Sealed baseline to compare against
 * @param candidate - Candidate version under test
 * @param waivers - Active waivers that may apply
 * @returns Complete regression check result
 */
export function runRegressionCheck(
  baseline: SealedBaseline,
  candidate: CandidateVersion,
  waivers: readonly RegressionWaiver[]
): RegressionCheckResult {
  const now = new Date();
  let findingSequence = 1;

  // Collect all findings
  const allFindings: RegressionFinding[] = [];

  // Run all regression detectors
  const testCountFinding = detectTestCountRegression(baseline, candidate);
  if (testCountFinding) {
    allFindings.push({
      ...testCountFinding,
      finding_id: generateFindingId(testCountFinding.type, now, findingSequence++)
    });
  }

  const failureFinding = detectFailureIncrease(baseline, candidate);
  if (failureFinding) {
    allFindings.push({
      ...failureFinding,
      finding_id: generateFindingId(failureFinding.type, now, findingSequence++)
    });
  }

  const assertionFinding = detectAssertionDecrease(baseline, candidate);
  if (assertionFinding) {
    allFindings.push({
      ...assertionFinding,
      finding_id: generateFindingId(assertionFinding.type, now, findingSequence++)
    });
  }

  const outputFinding = detectOutputMismatch(baseline, candidate);
  if (outputFinding) {
    allFindings.push({
      ...outputFinding,
      finding_id: generateFindingId(outputFinding.type, now, findingSequence++)
    });
  }

  const durationFinding = detectDurationRegression(baseline, candidate);
  if (durationFinding) {
    allFindings.push({
      ...durationFinding,
      finding_id: generateFindingId(durationFinding.type, now, findingSequence++)
    });
  }

  // Filter applicable waivers
  const applicableWaivers = waivers.filter(w =>
    w.baseline_id === baseline.baseline_id && w.status === 'ACTIVE'
  );

  // Determine which findings are waived
  const waivedFindingIds: string[] = [];
  const activeWaiverRefs: string[] = [];

  for (const finding of allFindings) {
    const gapId = `GAP-${finding.type}`;
    const waiver = applicableWaivers.find(w => w.gap_id === gapId);
    if (waiver) {
      waivedFindingIds.push(finding.finding_id);
      if (!activeWaiverRefs.includes(waiver.waiver_id)) {
        activeWaiverRefs.push(waiver.waiver_id);
      }
    }
  }

  // Calculate counts
  const unwaivedFindings = allFindings.filter(f => !waivedFindingIds.includes(f.finding_id));
  const waivedCount = allFindings.length - unwaivedFindings.length;

  // Determine status
  const status = determineStatus(unwaivedFindings, waivedFindingIds.length > 0);

  // Build failure refs (unwaived findings)
  const failureRefs = unwaivedFindings.map(f => f.finding_id);

  return {
    check_id: generateCheckId(baseline.baseline_id, candidate.commit, now),
    baseline_id: baseline.baseline_id,
    baseline_version: baseline.version,
    candidate_version: candidate.version,
    status,
    tests_total: candidate.test_results.total_tests,
    tests_passed: candidate.test_results.passed,
    tests_failed: candidate.test_results.failed,
    tests_waived: waivedCount,
    regressions_detected: allFindings,
    waiver_refs: activeWaiverRefs,
    failure_refs: failureRefs
  };
}

// ─────────────────────────────────────────────────────────────
// REGRESSION DETECTORS
// ─────────────────────────────────────────────────────────────

/**
 * Detect test count regression.
 * @param baseline - Baseline test results
 * @param candidate - Candidate test results
 * @returns Finding if regression detected, null otherwise
 */
export function detectTestCountRegression(
  baseline: SealedBaseline,
  candidate: CandidateVersion
): Omit<RegressionFinding, 'finding_id'> | null {
  const baselineCount = baseline.test_results.total_tests;
  const candidateCount = candidate.test_results.total_tests;

  if (candidateCount < baselineCount) {
    const decrease = baselineCount - candidateCount;
    const percentDecrease = ((decrease / baselineCount) * 100).toFixed(1);

    return {
      type: 'TEST_COUNT_DECREASE',
      description: `Test count decreased from ${baselineCount} to ${candidateCount} (-${decrease} tests, -${percentDecrease}%)`,
      baseline_value: String(baselineCount),
      observed_value: String(candidateCount),
      severity: determineSeverity('TEST_COUNT_DECREASE', decrease, baselineCount),
      evidence: [
        `baseline_tests:${baselineCount}`,
        `candidate_tests:${candidateCount}`,
        `decrease:${decrease}`,
        `percent_decrease:${percentDecrease}%`
      ]
    };
  }

  return null;
}

/**
 * Detect test failure increase.
 * @param baseline - Baseline test results
 * @param candidate - Candidate test results
 * @returns Finding if regression detected, null otherwise
 */
export function detectFailureIncrease(
  baseline: SealedBaseline,
  candidate: CandidateVersion
): Omit<RegressionFinding, 'finding_id'> | null {
  const baselineFailures = baseline.test_results.failed;
  const candidateFailures = candidate.test_results.failed;

  if (candidateFailures > baselineFailures) {
    const increase = candidateFailures - baselineFailures;

    return {
      type: 'TEST_FAILURE_INCREASE',
      description: `Test failures increased from ${baselineFailures} to ${candidateFailures} (+${increase} failures)`,
      baseline_value: String(baselineFailures),
      observed_value: String(candidateFailures),
      severity: determineSeverity('TEST_FAILURE_INCREASE', increase, baseline.test_results.total_tests),
      evidence: [
        `baseline_failures:${baselineFailures}`,
        `candidate_failures:${candidateFailures}`,
        `increase:${increase}`
      ]
    };
  }

  return null;
}

/**
 * Detect assertion count decrease.
 * @param baseline - Baseline test results
 * @param candidate - Candidate test results
 * @returns Finding if regression detected, null otherwise
 */
export function detectAssertionDecrease(
  baseline: SealedBaseline,
  candidate: CandidateVersion
): Omit<RegressionFinding, 'finding_id'> | null {
  const baselineAssertions = baseline.test_results.assertions_count;
  const candidateAssertions = candidate.test_results.assertions_count;

  if (candidateAssertions < baselineAssertions) {
    const decrease = baselineAssertions - candidateAssertions;
    const percentDecrease = ((decrease / baselineAssertions) * 100).toFixed(1);

    return {
      type: 'ASSERTION_COUNT_DECREASE',
      description: `Assertion count decreased from ${baselineAssertions} to ${candidateAssertions} (-${decrease} assertions, -${percentDecrease}%)`,
      baseline_value: String(baselineAssertions),
      observed_value: String(candidateAssertions),
      severity: determineSeverity('ASSERTION_COUNT_DECREASE', decrease, baselineAssertions),
      evidence: [
        `baseline_assertions:${baselineAssertions}`,
        `candidate_assertions:${candidateAssertions}`,
        `decrease:${decrease}`,
        `percent_decrease:${percentDecrease}%`
      ]
    };
  }

  return null;
}

/**
 * Detect output hash mismatch.
 * @param baseline - Baseline test results
 * @param candidate - Candidate test results
 * @returns Finding if regression detected, null otherwise
 */
export function detectOutputMismatch(
  baseline: SealedBaseline,
  candidate: CandidateVersion
): Omit<RegressionFinding, 'finding_id'> | null {
  const baselineHash = baseline.test_results.output_hash;
  const candidateHash = candidate.test_results.output_hash;

  if (baselineHash !== candidateHash) {
    return {
      type: 'OUTPUT_HASH_MISMATCH',
      description: `Output hash changed from baseline`,
      baseline_value: baselineHash,
      observed_value: candidateHash,
      severity: 'major', // Hash mismatch is always major
      evidence: [
        `baseline_hash:${baselineHash}`,
        `candidate_hash:${candidateHash}`,
        `mismatch:true`
      ]
    };
  }

  return null;
}

/**
 * Detect performance regression (duration increase).
 * @param baseline - Baseline test results
 * @param candidate - Candidate test results
 * @param threshold - Percentage increase threshold (default 20%)
 * @returns Finding if regression detected, null otherwise
 */
export function detectDurationRegression(
  baseline: SealedBaseline,
  candidate: CandidateVersion,
  threshold: number = DEFAULT_DURATION_THRESHOLD
): Omit<RegressionFinding, 'finding_id'> | null {
  const baselineDuration = baseline.test_results.duration_ms;
  const candidateDuration = candidate.test_results.duration_ms;

  // Avoid division by zero
  if (baselineDuration === 0) {
    return null;
  }

  const increase = candidateDuration - baselineDuration;
  const percentIncrease = increase / baselineDuration;

  if (percentIncrease > threshold) {
    const percentStr = (percentIncrease * 100).toFixed(1);

    return {
      type: 'DURATION_REGRESSION',
      description: `Test duration increased from ${baselineDuration}ms to ${candidateDuration}ms (+${percentStr}%)`,
      baseline_value: String(baselineDuration),
      observed_value: String(candidateDuration),
      severity: 'minor', // Duration regression is typically minor
      evidence: [
        `baseline_duration_ms:${baselineDuration}`,
        `candidate_duration_ms:${candidateDuration}`,
        `increase_ms:${increase}`,
        `percent_increase:${percentStr}%`,
        `threshold:${(threshold * 100).toFixed(0)}%`
      ]
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// STATUS DETERMINATION
// ─────────────────────────────────────────────────────────────

/**
 * Determine overall status from findings and waivers.
 * INV-REGR-002: Backward compatibility default - any unwaived finding = FAIL.
 * @param unwaivedFindings - Findings not covered by waivers
 * @param hasWaivedFindings - Whether any findings were waived
 * @returns PASS if no findings, WAIVED if all waived, FAIL otherwise
 */
export function determineStatus(
  unwaivedFindings: readonly (RegressionFinding | Omit<RegressionFinding, 'finding_id'>)[],
  hasWaivedFindings: boolean
): RegressionStatus {
  // If there are unwaived findings, status is FAIL
  if (unwaivedFindings.length > 0) {
    return 'FAIL';
  }

  // If all findings were waived, status is WAIVED
  if (hasWaivedFindings) {
    return 'WAIVED';
  }

  // No findings at all = PASS
  return 'PASS';
}

/**
 * Determine severity based on regression type and magnitude.
 * @param type - Type of regression
 * @param magnitude - Magnitude of the regression
 * @param baseline - Baseline value for percentage calculation
 * @returns Severity level
 */
function determineSeverity(
  type: RegressionType,
  magnitude: number,
  baseline: number
): RegressionSeverity {
  const percent = baseline > 0 ? (magnitude / baseline) * 100 : 100;

  switch (type) {
    case 'TEST_COUNT_DECREASE':
      if (percent > 20) return 'critical';
      if (percent > 5) return 'major';
      return 'minor';

    case 'TEST_FAILURE_INCREASE':
      if (magnitude > 10) return 'critical';
      if (magnitude > 3) return 'major';
      return 'minor';

    case 'ASSERTION_COUNT_DECREASE':
      if (percent > 30) return 'critical';
      if (percent > 10) return 'major';
      return 'minor';

    case 'API_COMPATIBILITY_BREAK':
      return 'critical'; // API breaks are always critical

    default:
      return 'minor';
  }
}

// ─────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generate a regression check ID.
 * @param baselineId - Baseline ID
 * @param candidateCommit - Candidate commit hash
 * @param date - Check date
 * @returns Formatted check ID
 */
export function generateCheckId(
  baselineId: string,
  candidateCommit: string,
  date: Date
): string {
  const dateStr = date.toISOString().replace(/[-:]/g, '').slice(0, 15);
  const commitShort = candidateCommit.slice(0, 8);
  return `CHK_${dateStr}_${commitShort}`;
}

/**
 * Generate a finding ID.
 * @param type - Regression type
 * @param date - Finding date
 * @param sequence - Sequence number
 * @returns Formatted finding ID
 */
export function generateFindingId(
  type: RegressionType,
  date: Date,
  sequence: number
): string {
  const dateStr = date.toISOString().replace(/[-:]/g, '').slice(0, 8);
  const seqStr = String(sequence).padStart(3, '0');
  return `FND_${type}_${dateStr}_${seqStr}`;
}
