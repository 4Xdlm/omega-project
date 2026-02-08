/**
 * OMEGA Phase Q — Main Evaluation Pipeline
 *
 * Orchestrates: LOAD → EVALUATE (3 oracles per case) → AGGREGATE → REPORT
 *
 * Verdict fusion: MIN(Oracle-A, Oracle-B, Oracle-C) — fail-closed.
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type {
  QAggregateScores,
  QBaseline,
  QCaseCategory,
  QCaseResult,
  QConfig,
  QCategoryScore,
  QInvariantId,
  QInvariantScore,
  QOracleRule,
  QTestCase,
  QVerdict,
} from './types.js';
import { evaluateOracleA } from './oracle-a.js';
import { evaluateOracleB } from './oracle-b.js';
import { evaluateOracleC } from './oracle-c.js';
import { mergeEvidenceChains } from './evidence.js';
import { createEvidenceChainBuilder } from './evidence.js';

/**
 * Parse NDJSON testset into typed test cases.
 * Each line must be a valid JSON object conforming to QTestCase.
 */
export function parseTestset(ndjsonContent: string): readonly QTestCase[] {
  const lines = ndjsonContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const cases: QTestCase[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    try {
      const parsed = JSON.parse(line) as QTestCase;

      if (!parsed.id || !parsed.category || !parsed.input || !parsed.candidate_output || !parsed.expected) {
        throw new Error(`Line ${i + 1}: missing required fields`);
      }

      cases.push(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse NDJSON line ${i + 1}: ${message}`);
    }
  }

  return cases;
}

/**
 * The MIN verdict combiner: FAIL if any oracle returns FAIL.
 * Implements fail-closed behavior.
 */
export function computeMinVerdict(a: QVerdict, b: QVerdict, c: QVerdict): QVerdict {
  if (a === 'FAIL' || b === 'FAIL' || c === 'FAIL') return 'FAIL';
  return 'PASS';
}

/**
 * Evaluate a single test case through all three oracles.
 */
export function evaluateCase(
  testCase: QTestCase,
  config: QConfig,
  rules: readonly QOracleRule[],
  baselines: readonly QBaseline[],
  deterministicTimestamp: string
): QCaseResult {
  const oracleA = evaluateOracleA(testCase, config, rules, deterministicTimestamp);
  const oracleB = evaluateOracleB(testCase, config, deterministicTimestamp);
  const oracleC = evaluateOracleC(testCase, config, baselines, deterministicTimestamp);

  const finalVerdict = computeMinVerdict(oracleA.verdict, oracleB.verdict, oracleC.verdict);

  const chainA = createEvidenceChainBuilder(testCase.id, deterministicTimestamp);
  for (const step of oracleA.evidence) {
    chainA.addStep(step.step, step.input_hash, step.output_hash, step.rule_applied, step.verdict);
  }

  const chainB = createEvidenceChainBuilder(testCase.id, deterministicTimestamp);
  for (const step of oracleB.evidence) {
    chainB.addStep(step.step, step.input_hash, step.output_hash, step.rule_applied, step.verdict);
  }

  const chainC = createEvidenceChainBuilder(testCase.id, deterministicTimestamp);
  for (const step of oracleC.evidence) {
    chainC.addStep(step.step, step.input_hash, step.output_hash, step.rule_applied, step.verdict);
  }

  const evidenceChain = mergeEvidenceChains(testCase.id, [
    chainA.build(),
    chainB.build(),
    chainC.build(),
  ]);

  const resultWithoutHash = {
    case_id: testCase.id,
    category: testCase.category,
    oracle_a: oracleA,
    oracle_b: oracleB,
    oracle_c: oracleC,
    final_verdict: finalVerdict,
    evidence_chain: evidenceChain,
  };

  const resultHash = sha256(canonicalize(resultWithoutHash));

  return {
    ...resultWithoutHash,
    result_hash: resultHash,
  };
}

/**
 * Evaluate all test cases.
 */
export function evaluateAll(
  testCases: readonly QTestCase[],
  config: QConfig,
  rules: readonly QOracleRule[],
  baselines: readonly QBaseline[],
  deterministicTimestamp: string
): readonly QCaseResult[] {
  return testCases.map(tc =>
    evaluateCase(tc, config, rules, baselines, deterministicTimestamp)
  );
}

/**
 * Compute aggregate scores from case results.
 */
export function aggregateScores(results: readonly QCaseResult[]): QAggregateScores {
  const categories: QCaseCategory[] = [
    'precision', 'necessity', 'contradiction', 'stability', 'adversarial', 'cross-ref',
  ];

  const invariantIds: QInvariantId[] = [
    'Q-INV-01', 'Q-INV-02', 'Q-INV-03', 'Q-INV-04', 'Q-INV-05', 'Q-INV-06',
  ];

  const byCategory = {} as Record<QCaseCategory, QCategoryScore>;
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    byCategory[cat] = {
      passed: catResults.filter(r => r.final_verdict === 'PASS').length,
      failed: catResults.filter(r => r.final_verdict === 'FAIL').length,
      total: catResults.length,
    };
  }

  const byInvariant = {} as Record<QInvariantId, QInvariantScore>;
  for (const inv of invariantIds) {
    let violationCount = 0;
    for (const result of results) {
      const allViolations = [
        ...result.oracle_a.violations,
        ...result.oracle_b.violations,
        ...result.oracle_c.violations,
      ];
      violationCount += allViolations.filter(v => v.invariant_id === inv).length;
    }
    byInvariant[inv] = { violations: violationCount };
  }

  const passed = results.filter(r => r.final_verdict === 'PASS').length;
  const failed = results.filter(r => r.final_verdict === 'FAIL').length;

  return {
    total_cases: results.length,
    passed,
    failed,
    pass_rate: results.length > 0 ? passed / results.length : 0,
    by_category: byCategory,
    by_invariant: byInvariant,
  };
}
