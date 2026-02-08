/**
 * OMEGA Phase Q — Oracle A: Symbolic Rules
 *
 * Evaluates:
 * - Q-INV-01: NO-BULLSHIT (precision / fact-sourcing)
 * - Q-INV-03: CONTRADICTION ZERO-TOLERANCE
 * - must_find / must_not_find pattern checks
 *
 * Deterministic. No network, no randomness.
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type {
  QConfig,
  QOracleResult,
  QOracleRule,
  QTestCase,
  QVerdict,
  QViolation,
  QEvidenceStep,
} from './types.js';
import { normalize } from './normalizer.js';
import { resolveConfigRef } from './config.js';

/**
 * Check precision: count claims in output that are not supported by input facts.
 * A claim is "supported" if it appears as a case-insensitive substring of any input fact.
 *
 * Segments of the candidate output are checked against the facts list.
 */
export function checkPrecision(
  candidateOutput: string,
  facts: readonly string[],
  _rules: readonly QOracleRule[],
  maxUnsupported: number
): {
  readonly unsupportedCount: number;
  readonly verdict: QVerdict;
  readonly violations: readonly QViolation[];
} {
  const normalizedOutput = normalize(candidateOutput).toLowerCase();
  const normalizedFacts = facts.map(f => normalize(f).toLowerCase());

  const sentences = normalizedOutput
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let unsupportedCount = 0;
  const violations: QViolation[] = [];

  for (const sentence of sentences) {
    const isSupported = normalizedFacts.some(fact => fact.includes(sentence) || sentence.includes(fact));

    if (!isSupported) {
      unsupportedCount++;
    }
  }

  if (unsupportedCount > maxUnsupported) {
    violations.push({
      invariant_id: 'Q-INV-01',
      message: `Found ${unsupportedCount} unsupported claims (max: ${maxUnsupported})`,
      severity: 'CRITICAL',
      details: `${unsupportedCount} sentences in output not traceable to input facts`,
    });
  }

  return {
    unsupportedCount,
    verdict: unsupportedCount > maxUnsupported ? 'FAIL' : 'PASS',
    violations,
  };
}

/**
 * Check must_find / must_not_find patterns in the candidate output.
 */
export function checkPatterns(
  candidateOutput: string,
  mustFind: readonly string[],
  mustNotFind: readonly string[]
): {
  readonly verdict: QVerdict;
  readonly missing: readonly string[];
  readonly forbidden: readonly string[];
} {
  const normalizedOutput = normalize(candidateOutput).toLowerCase();

  const missing = mustFind.filter(
    pattern => !normalizedOutput.includes(pattern.toLowerCase())
  );

  const forbidden = mustNotFind.filter(
    pattern => normalizedOutput.includes(pattern.toLowerCase())
  );

  const verdict: QVerdict = missing.length > 0 || forbidden.length > 0 ? 'FAIL' : 'PASS';

  return { verdict, missing, forbidden };
}

/**
 * Check for contradictions in the candidate output (Q-INV-03).
 * Uses contradiction_ids from the test case expected data to identify patterns.
 *
 * Contradiction patterns: direct negation pairs checked in the output.
 */
export function checkContradictions(
  candidateOutput: string,
  contradictionIds: readonly string[]
): {
  readonly verdict: QVerdict;
  readonly contradictionsFound: readonly string[];
} {
  if (contradictionIds.length === 0) {
    return { verdict: 'PASS', contradictionsFound: [] };
  }

  const normalizedOutput = normalize(candidateOutput).toLowerCase();
  const found: string[] = [];

  const contradictionPairs: ReadonlyArray<readonly [string, string]> = [
    ['always', 'never'],
    ['true', 'false'],
    ['increase', 'decrease'],
    ['positive', 'negative'],
    ['valid', 'invalid'],
    ['correct', 'incorrect'],
    ['success', 'failure'],
    ['above', 'below'],
    ['present', 'absent'],
    ['enabled', 'disabled'],
  ];

  for (const cid of contradictionIds) {
    const pair = contradictionPairs.find(
      ([a, b]) => cid.toLowerCase().includes(a) || cid.toLowerCase().includes(b)
    );

    if (pair) {
      const [termA, termB] = pair;
      if (normalizedOutput.includes(termA) && normalizedOutput.includes(termB)) {
        found.push(cid);
      }
    } else {
      if (normalizedOutput.includes(cid.toLowerCase())) {
        found.push(cid);
      }
    }
  }

  return {
    verdict: found.length > 0 ? 'FAIL' : 'PASS',
    contradictionsFound: found,
  };
}

/**
 * Run Oracle A evaluation on a single test case.
 *
 * Combines precision, patterns, and contradiction checks.
 * Verdict is fail-closed: any sub-check FAIL → overall FAIL.
 */
export function evaluateOracleA(
  testCase: QTestCase,
  config: QConfig,
  rules: readonly QOracleRule[],
  deterministicTimestamp: string
): QOracleResult {
  const evidence: QEvidenceStep[] = [];
  const violations: QViolation[] = [];
  const inputHash = sha256(canonicalize(testCase.input));

  const maxUnsupported = testCase.expected.max_unsupported_claims.startsWith('CONFIG:')
    ? resolveConfigRef(config, testCase.expected.max_unsupported_claims)
    : parseInt(testCase.expected.max_unsupported_claims, 10);

  const precisionResult = checkPrecision(
    testCase.candidate_output,
    testCase.input.facts,
    rules,
    maxUnsupported
  );

  evidence.push({
    step: 'oracle-a:precision-check',
    input_hash: inputHash,
    output_hash: sha256(canonicalize(precisionResult)),
    rule_applied: 'Q-INV-01',
    verdict: precisionResult.verdict,
    timestamp_deterministic: deterministicTimestamp,
  });
  violations.push(...precisionResult.violations);

  const patternResult = checkPatterns(
    testCase.candidate_output,
    testCase.expected.must_find,
    testCase.expected.must_not_find
  );

  evidence.push({
    step: 'oracle-a:pattern-check',
    input_hash: inputHash,
    output_hash: sha256(canonicalize(patternResult)),
    rule_applied: 'must_find/must_not_find',
    verdict: patternResult.verdict,
    timestamp_deterministic: deterministicTimestamp,
  });

  if (patternResult.missing.length > 0) {
    violations.push({
      invariant_id: 'Q-INV-01',
      message: `Missing required patterns: ${patternResult.missing.join(', ')}`,
      severity: 'CRITICAL',
    });
  }

  if (patternResult.forbidden.length > 0) {
    violations.push({
      invariant_id: 'Q-INV-01',
      message: `Found forbidden patterns: ${patternResult.forbidden.join(', ')}`,
      severity: 'HIGH',
    });
  }

  const contradictionResult = checkContradictions(
    testCase.candidate_output,
    testCase.expected.contradiction_ids
  );

  evidence.push({
    step: 'oracle-a:contradiction-check',
    input_hash: inputHash,
    output_hash: sha256(canonicalize(contradictionResult)),
    rule_applied: 'Q-INV-03',
    verdict: contradictionResult.verdict,
    timestamp_deterministic: deterministicTimestamp,
  });

  if (contradictionResult.contradictionsFound.length > 0) {
    violations.push({
      invariant_id: 'Q-INV-03',
      message: `Contradictions found: ${contradictionResult.contradictionsFound.join(', ')}`,
      severity: 'CRITICAL',
    });
  }

  const overallVerdict: QVerdict =
    precisionResult.verdict === 'FAIL' ||
    patternResult.verdict === 'FAIL' ||
    contradictionResult.verdict === 'FAIL'
      ? 'FAIL'
      : 'PASS';

  return {
    oracle_id: 'ORACLE-A',
    verdict: overallVerdict,
    metrics: {
      unsupported_claims: precisionResult.unsupportedCount,
      missing_patterns: patternResult.missing.length,
      forbidden_patterns: patternResult.forbidden.length,
      contradictions_found: contradictionResult.contradictionsFound.length,
    },
    evidence,
    violations,
  };
}
