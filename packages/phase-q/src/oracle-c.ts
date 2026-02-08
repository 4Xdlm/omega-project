/**
 * OMEGA Phase Q — Oracle C: Cross-Reference
 *
 * Evaluates:
 * - Q-INV-05: FORMAT & NORMALIZATION (LF, sorted JSON, whitespace)
 * - Cross-reference consistency with baselines
 * - Non-regression checks
 *
 * Does NOT import governance modules (couplage interdit).
 * Uses same interfaces/patterns.
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type {
  QBaseline,
  QConfig,
  QCrossRefResult,
  QEvidenceStep,
  QOracleResult,
  QTestCase,
  QVerdict,
  QViolation,
} from './types.js';
import { normalizeLF } from './normalizer.js';

/**
 * Check format and normalization (Q-INV-05).
 *
 * Validates:
 * - No CRLF (must be LF only)
 * - No leading/trailing whitespace on lines
 * - If JSON, keys must be sorted
 */
export function checkFormat(
  candidateOutput: string
): {
  readonly verdict: QVerdict;
  readonly violations: readonly QViolation[];
} {
  const violations: QViolation[] = [];

  if (candidateOutput.includes('\r')) {
    violations.push({
      invariant_id: 'Q-INV-05',
      message: 'Output contains CRLF or CR line endings (must be LF only)',
      severity: 'HIGH',
    });
  }

  const lfOnly = normalizeLF(candidateOutput);
  if (lfOnly !== lfOnly.split('\n').map(l => l.trimEnd()).join('\n')) {
    violations.push({
      invariant_id: 'Q-INV-05',
      message: 'Output contains trailing whitespace on lines',
      severity: 'HIGH',
    });
  }

  try {
    const parsed: unknown = JSON.parse(candidateOutput);
    if (typeof parsed === 'object' && parsed !== null) {
      const canonical = canonicalize(parsed);
      const reparsed = JSON.stringify(JSON.parse(candidateOutput));
      const recanonical = canonicalize(JSON.parse(reparsed));
      if (canonical !== recanonical) {
        violations.push({
          invariant_id: 'Q-INV-05',
          message: 'JSON output keys are not sorted lexicographically',
          severity: 'HIGH',
        });
      }
    }
  } catch {
    // Not JSON — no JSON-specific checks needed
  }

  return {
    verdict: violations.length > 0 ? 'FAIL' : 'PASS',
    violations,
  };
}

/**
 * Check baselines for non-regression.
 *
 * Compares the hash of the evaluation result against known baselines.
 * If a baseline exists for this case and the hash does not match, it fails.
 */
export function checkBaselines(
  caseId: string,
  resultHash: string,
  baselines: readonly QBaseline[]
): {
  readonly verdict: QVerdict;
  readonly crossRefResults: readonly QCrossRefResult[];
} {
  const relevantBaselines = baselines.filter(b => b.id === caseId);

  if (relevantBaselines.length === 0) {
    return {
      verdict: 'PASS',
      crossRefResults: [{
        baseline_id: caseId,
        matched: true,
        details: 'No baseline exists — first evaluation (PASS by default)',
      }],
    };
  }

  const results: QCrossRefResult[] = [];
  let hasFailure = false;

  for (const baseline of relevantBaselines) {
    const matched = baseline.expected_hash === resultHash;
    results.push({
      baseline_id: baseline.id,
      matched,
      details: matched
        ? `Hash matches baseline: ${baseline.description}`
        : `Hash mismatch: expected ${baseline.expected_hash}, got ${resultHash}`,
    });
    if (!matched) {
      hasFailure = true;
    }
  }

  return {
    verdict: hasFailure ? 'FAIL' : 'PASS',
    crossRefResults: results,
  };
}

/**
 * Run Oracle C evaluation on a single test case.
 */
export function evaluateOracleC(
  testCase: QTestCase,
  _config: QConfig,
  baselines: readonly QBaseline[],
  deterministicTimestamp: string
): QOracleResult {
  const evidence: QEvidenceStep[] = [];
  const violations: QViolation[] = [];
  const inputHash = sha256(canonicalize(testCase.input));

  const formatResult = checkFormat(testCase.candidate_output);

  evidence.push({
    step: 'oracle-c:format-check',
    input_hash: inputHash,
    output_hash: sha256(canonicalize(formatResult)),
    rule_applied: 'Q-INV-05',
    verdict: formatResult.verdict,
    timestamp_deterministic: deterministicTimestamp,
  });
  violations.push(...formatResult.violations);

  const resultHash = sha256(canonicalize({
    case_id: testCase.id,
    candidate_output: testCase.candidate_output,
  }));

  const baselineResult = checkBaselines(testCase.id, resultHash, baselines);

  evidence.push({
    step: 'oracle-c:baseline-check',
    input_hash: inputHash,
    output_hash: sha256(canonicalize(baselineResult)),
    rule_applied: 'cross-reference-non-regression',
    verdict: baselineResult.verdict,
    timestamp_deterministic: deterministicTimestamp,
  });

  if (baselineResult.verdict === 'FAIL') {
    violations.push({
      invariant_id: 'Q-INV-06',
      message: 'Baseline non-regression check failed',
      severity: 'HIGH',
      details: baselineResult.crossRefResults
        .filter(r => !r.matched)
        .map(r => r.details)
        .join('; '),
    });
  }

  const overallVerdict: QVerdict =
    formatResult.verdict === 'FAIL' || baselineResult.verdict === 'FAIL'
      ? 'FAIL'
      : 'PASS';

  return {
    oracle_id: 'ORACLE-C',
    verdict: overallVerdict,
    metrics: {
      format_violations: formatResult.violations.length,
      baseline_matches: baselineResult.crossRefResults.filter(r => r.matched).length,
      baseline_mismatches: baselineResult.crossRefResults.filter(r => !r.matched).length,
    },
    evidence,
    violations,
  };
}
