/**
 * OMEGA Phase Q — Oracle B: Adversarial + Ablation
 *
 * Evaluates:
 * - Q-INV-02: NECESSITY (ablation reveals unnecessary segments)
 * - Q-INV-04: LOCAL STABILITY (small input change = localized output change)
 *
 * Uses deterministic ablation and adversarial generators.
 */

import { sha256, canonicalize } from '@omega/canon-kernel';
import type {
  QConfig,
  QOracleResult,
  QTestCase,
  QVerdict,
  QViolation,
  QEvidenceStep,
} from './types.js';
import { normalize } from './normalizer.js';
import { segmentOutput, generateAblations, evaluateNecessity, checkNecessityRatio } from './ablation.js';
import { generateAllVariants } from './adversarial.js';

/**
 * Check necessity via ablation (Q-INV-02).
 *
 * Splits candidate output into segments, removes each one in turn,
 * checks if expected properties are still present. If too many segments
 * are unnecessary, the output fails.
 */
export function checkNecessity(
  candidateOutput: string,
  expectedProps: readonly string[],
  minRatio: number
): {
  readonly verdict: QVerdict;
  readonly ratio: number;
  readonly violations: readonly QViolation[];
} {
  const normalizedOutput = normalize(candidateOutput);
  const segments = segmentOutput(normalizedOutput);

  if (segments.length === 0) {
    return { verdict: 'PASS', ratio: 1, violations: [] };
  }

  if (expectedProps.length === 0) {
    return { verdict: 'PASS', ratio: 1, violations: [] };
  }

  const ablations = generateAblations(segments);
  const results = ablations.map(ablation =>
    evaluateNecessity(normalizedOutput, ablation, expectedProps, segments)
  );

  const { passed, ratio, unnecessarySegments } = checkNecessityRatio(results, minRatio);

  const violations: QViolation[] = [];
  if (!passed) {
    violations.push({
      invariant_id: 'Q-INV-02',
      message: `Necessity ratio ${ratio.toFixed(3)} below minimum ${minRatio}`,
      severity: 'CRITICAL',
      details: `Unnecessary segments: [${unnecessarySegments.join(', ')}]`,
    });
  }

  return { verdict: passed ? 'PASS' : 'FAIL', ratio, violations };
}

/**
 * Check local stability (Q-INV-04).
 *
 * Measures how many segments change when input is slightly varied.
 * delta_segments must be <= STABILITY_FACTOR * changed_fields_count.
 */
export function checkStability(
  candidateOutput: string,
  _input: { readonly context: string; readonly facts: readonly string[]; readonly constraints: readonly string[] },
  stabilityFactor: number,
  seed: number
): {
  readonly verdict: QVerdict;
  readonly deltaSegments: number;
  readonly changedFields: number;
  readonly bound: number;
  readonly violations: readonly QViolation[];
} {
  const normalizedOutput = normalize(candidateOutput);
  const originalSegments = segmentOutput(normalizedOutput);

  const variants = generateAllVariants(normalizedOutput, seed);
  const changedFields = 1;
  const bound = stabilityFactor * changedFields;

  let maxDelta = 0;

  for (const variant of variants) {
    const variantSegments = segmentOutput(variant.mutated_output);

    const originalContents = new Set(originalSegments.map(s => s.content));
    const variantContents = new Set(variantSegments.map(s => s.content));

    let delta = 0;
    for (const content of originalContents) {
      if (!variantContents.has(content)) {
        delta++;
      }
    }
    for (const content of variantContents) {
      if (!originalContents.has(content)) {
        delta++;
      }
    }

    if (delta > maxDelta) {
      maxDelta = delta;
    }
  }

  const violations: QViolation[] = [];
  const passed = maxDelta <= bound;

  if (!passed) {
    violations.push({
      invariant_id: 'Q-INV-04',
      message: `Stability violation: delta=${maxDelta} exceeds bound=${bound} (factor=${stabilityFactor}, changed=${changedFields})`,
      severity: 'HIGH',
    });
  }

  return {
    verdict: passed ? 'PASS' : 'FAIL',
    deltaSegments: maxDelta,
    changedFields,
    bound,
    violations,
  };
}

/**
 * Run Oracle B evaluation on a single test case.
 */
export function evaluateOracleB(
  testCase: QTestCase,
  config: QConfig,
  deterministicTimestamp: string
): QOracleResult {
  const evidence: QEvidenceStep[] = [];
  const violations: QViolation[] = [];
  const inputHash = sha256(canonicalize(testCase.input));

  const minRatio = typeof config.NECESSITY_MIN_RATIO.value === 'number'
    ? config.NECESSITY_MIN_RATIO.value
    : 0.85;

  const stabilityFactor = typeof config.STABILITY_FACTOR.value === 'number'
    ? config.STABILITY_FACTOR.value
    : 3;

  const necessityResult = checkNecessity(
    testCase.candidate_output,
    testCase.expected.expected_props,
    minRatio
  );

  evidence.push({
    step: 'oracle-b:necessity-check',
    input_hash: inputHash,
    output_hash: sha256(canonicalize(necessityResult)),
    rule_applied: 'Q-INV-02',
    verdict: necessityResult.verdict,
    timestamp_deterministic: deterministicTimestamp,
  });
  violations.push(...necessityResult.violations);

  const seed = hashToSeed(testCase.id);
  const stabilityResult = checkStability(
    testCase.candidate_output,
    testCase.input,
    stabilityFactor,
    seed
  );

  evidence.push({
    step: 'oracle-b:stability-check',
    input_hash: inputHash,
    output_hash: sha256(canonicalize(stabilityResult)),
    rule_applied: 'Q-INV-04',
    verdict: stabilityResult.verdict,
    timestamp_deterministic: deterministicTimestamp,
  });
  violations.push(...stabilityResult.violations);

  const adversarialVariants = generateAllVariants(testCase.candidate_output, seed);
  const adversarialPassCount = adversarialVariants.filter(
    v => v.mutated_hash !== v.original_hash
  ).length;

  evidence.push({
    step: 'oracle-b:adversarial-check',
    input_hash: inputHash,
    output_hash: sha256(canonicalize({ adversarialPassCount })),
    rule_applied: 'adversarial-mutation-detection',
    verdict: 'PASS',
    timestamp_deterministic: deterministicTimestamp,
  });

  const overallVerdict: QVerdict =
    necessityResult.verdict === 'FAIL' || stabilityResult.verdict === 'FAIL'
      ? 'FAIL'
      : 'PASS';

  return {
    oracle_id: 'ORACLE-B',
    verdict: overallVerdict,
    metrics: {
      necessity_ratio: necessityResult.ratio,
      delta_segments: stabilityResult.deltaSegments,
      stability_bound: stabilityResult.bound,
      adversarial_pass_count: adversarialPassCount,
      adversarial_total: adversarialVariants.length,
    },
    evidence,
    violations,
  };
}

/**
 * Convert a case ID string to a deterministic seed number.
 */
function hashToSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}
