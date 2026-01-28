/**
 * OMEGA Truth Gate Verdict Engine v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * F5: CanonViolation[] → Verdict
 *
 * INVARIANTS:
 * - F5-INV-01: Verdict is binary (PASS or FAIL only)
 * - F5-INV-02: PASS iff violations.length === 0
 * - F5-INV-03: Verdict is deterministic
 *
 * SPEC: TRUTH_GATE_SPEC v1.0 §F5
 */

import type { CanonViolation, VerdictResult, ClassifiedFact, Verdict } from './types';
import { Verdict as V, FactClass } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes verdict from violations.
 *
 * F5-INV-01: Binary verdict only
 * F5-INV-02: PASS iff violations.length === 0
 *
 * @param violations - Array of detected violations
 * @returns PASS if no violations, FAIL otherwise
 */
export function computeVerdict(violations: readonly CanonViolation[]): Verdict {
  // F5-INV-02: PASS iff violations.length === 0
  return violations.length === 0 ? V.PASS : V.FAIL;
}

/**
 * Creates a complete verdict result.
 *
 * F5-INV-01: Binary verdict
 * F5-INV-02: violations.length === 0 iff verdict === PASS
 * F5-INV-03: Deterministic computation
 *
 * @param violations - All detected violations
 * @param facts - All classified facts that were processed
 * @returns Complete verdict result
 */
export function createVerdictResult(
  violations: readonly CanonViolation[],
  facts: readonly ClassifiedFact[]
): VerdictResult {
  const verdict = computeVerdict(violations);
  const strictFacts = facts.filter(f => f.classification === FactClass.FACT_STRICT);

  // F1-INV-01: All types immutable
  return Object.freeze({
    verdict,
    violations: Object.freeze([...violations]),
    factsProcessed: facts.length,
    strictFactsChecked: strictFacts.length,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates that a verdict result is internally consistent.
 *
 * F5-INV-02: violations.length === 0 iff verdict === PASS
 *
 * @param result - Verdict result to validate
 * @returns true if valid, throws if inconsistent
 */
export function validateVerdictResult(result: VerdictResult): boolean {
  // F5-INV-02: Check consistency
  const expectedVerdict = result.violations.length === 0 ? V.PASS : V.FAIL;
  if (result.verdict !== expectedVerdict) {
    throw new Error(
      `INV-F5-02 violated: verdict is ${result.verdict} but violations.length is ${result.violations.length}`
    );
  }

  // Check that factsProcessed >= strictFactsChecked
  if (result.factsProcessed < result.strictFactsChecked) {
    throw new Error(
      `Invalid result: factsProcessed (${result.factsProcessed}) < strictFactsChecked (${result.strictFactsChecked})`
    );
  }

  return true;
}

/**
 * Checks if a verdict result indicates success.
 *
 * @param result - Verdict result
 * @returns true if PASS
 */
export function isPassed(result: VerdictResult): boolean {
  return result.verdict === V.PASS;
}

/**
 * Checks if a verdict result indicates failure.
 *
 * @param result - Verdict result
 * @returns true if FAIL
 */
export function isFailed(result: VerdictResult): boolean {
  return result.verdict === V.FAIL;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a human-readable summary of the verdict.
 *
 * @param result - Verdict result
 * @returns Summary string
 */
export function summarizeVerdict(result: VerdictResult): string {
  const lines: string[] = [];

  lines.push(`Verdict: ${result.verdict}`);
  lines.push(`Facts processed: ${result.factsProcessed}`);
  lines.push(`Strict facts checked: ${result.strictFactsChecked}`);
  lines.push(`Violations found: ${result.violations.length}`);

  if (result.violations.length > 0) {
    lines.push('');
    lines.push('Violations:');
    for (const v of result.violations) {
      lines.push(`  - [${v.code}] ${v.message}`);
    }
  }

  return lines.join('\n');
}

/**
 * Gets violation codes from a verdict result.
 *
 * @param result - Verdict result
 * @returns Array of unique violation codes
 */
export function getViolationCodes(result: VerdictResult): string[] {
  const codes = result.violations.map(v => v.code);
  return [...new Set(codes)];
}

/**
 * Counts violations by code.
 *
 * @param result - Verdict result
 * @returns Map of code to count
 */
export function countViolationsByCode(result: VerdictResult): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of result.violations) {
    counts.set(v.code, (counts.get(v.code) ?? 0) + 1);
  }
  return counts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { V as VerdictValue };
