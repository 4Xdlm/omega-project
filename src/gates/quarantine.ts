/**
 * OMEGA Truth Gate Quarantine v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * F7: FAIL → QuarantineResult (no text output)
 *
 * INVARIANTS:
 * - F7-INV-01: No output text on FAIL
 * - F7-INV-02: All violations recorded
 * - F7-INV-03: Proof manifest required
 *
 * SPEC: TRUTH_GATE_SPEC v1.0 §F7
 */

import { hashCanonical } from '../shared/canonical';
import { normalizeForCanon } from '../canon';
import type { ChainHash } from '../canon';
import type { QuarantineResult, QuarantineId, ProofManifest } from './types';
import { Verdict } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// QUARANTINE ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a deterministic quarantine ID.
 *
 * @param proof - Proof manifest
 * @returns Deterministic quarantine ID
 */
export function generateQuarantineId(proof: ProofManifest): QuarantineId {
  const data = normalizeForCanon({
    proofHash: proof.proofHash,
    inputHash: proof.inputHash,
  });
  const hash = hashCanonical(data);
  return `Q-${hash.substring(0, 16)}` as QuarantineId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUARANTINE CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Redacts sensitive text from a classified fact.
 * F7-INV-01: No text output on FAIL
 *
 * @param fact - Fact to redact
 * @returns Redacted fact with sourceSpan.text replaced
 */
function redactFact(fact: any): any {
  return {
    ...fact,
    sourceSpan: {
      ...fact.sourceSpan,
      text: '[REDACTED]', // F7-INV-01: No text in quarantine
    },
  };
}

/**
 * Creates a redacted proof manifest for quarantine.
 * F7-INV-01: No text output on FAIL
 *
 * @param proof - Original proof manifest
 * @returns Redacted proof with sourceSpan.text removed
 */
function redactProofForQuarantine(proof: ProofManifest): ProofManifest {
  const redactedFacts = proof.facts.map(redactFact);
  const redactedViolations = proof.verdict.violations.map(v => ({
    ...v,
    fact: redactFact(v.fact),
  }));

  return Object.freeze({
    ...proof,
    facts: Object.freeze(redactedFacts),
    verdict: Object.freeze({
      ...proof.verdict,
      violations: Object.freeze(redactedViolations),
    }),
  });
}

/**
 * Creates a quarantine result for a failed gate.
 *
 * F7-INV-01: No text output (quarantine stores hash only)
 * F7-INV-02: All violations recorded in proof
 * F7-INV-03: Proof manifest required
 *
 * @param proof - Proof manifest from gate
 * @param originalInputHash - Hash of original input
 * @param timestamp - Quarantine timestamp (optional)
 * @returns Quarantine result
 */
export function createQuarantineResult(
  proof: ProofManifest,
  originalInputHash: ChainHash,
  timestamp?: string
): QuarantineResult {
  // F7-INV-03: Proof manifest required
  if (!proof) {
    throw new Error('INV-F7-03: Proof manifest is required for quarantine');
  }

  // Validate that this is a FAIL verdict
  if (proof.verdict.verdict !== Verdict.FAIL) {
    throw new Error('Cannot quarantine a PASS verdict');
  }

  // F7-INV-02: All violations are in proof.verdict.violations
  const violationCount = proof.verdict.violations.length;
  if (violationCount === 0) {
    throw new Error('Cannot quarantine with no violations');
  }

  const id = generateQuarantineId(proof);
  const reason = buildQuarantineReason(proof);

  // F7-INV-01: Redact all text from proof before storing
  const redactedProof = redactProofForQuarantine(proof);

  return Object.freeze({
    id,
    proof: redactedProof,
    reason,
    originalInputHash,
    quarantinedAt: timestamp ?? new Date().toISOString(),
  });
}

/**
 * Builds a human-readable quarantine reason.
 *
 * @param proof - Proof manifest
 * @returns Reason string
 */
function buildQuarantineReason(proof: ProofManifest): string {
  const violations = proof.verdict.violations;
  const codes = violations.map(v => v.code);
  const uniqueCodes = [...new Set(codes)];

  if (violations.length === 1) {
    return `Violation ${violations[0].code}: ${violations[0].message}`;
  }

  return `${violations.length} violations detected: ${uniqueCodes.join(', ')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUARANTINE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates a quarantine result.
 *
 * @param result - Quarantine result to validate
 * @returns true if valid
 */
export function validateQuarantineResult(result: QuarantineResult): boolean {
  // F7-INV-03: Check proof exists
  if (!result.proof) {
    return false;
  }

  // Check verdict is FAIL
  if (result.proof.verdict.verdict !== Verdict.FAIL) {
    return false;
  }

  // F7-INV-02: Check violations exist
  if (result.proof.verdict.violations.length === 0) {
    return false;
  }

  // Check required fields
  if (!result.id || !result.originalInputHash || !result.quarantinedAt) {
    return false;
  }

  return true;
}

/**
 * Checks if a result is quarantined (no output allowed).
 * F7-INV-01: No output text on FAIL
 *
 * @param result - Quarantine result
 * @returns Always true (quarantine = no output)
 */
export function isQuarantined(result: QuarantineResult): boolean {
  return true; // By definition, a quarantine result means no output
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUARANTINE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets all violation codes from a quarantine result.
 *
 * @param result - Quarantine result
 * @returns Array of unique violation codes
 */
export function getQuarantineViolationCodes(result: QuarantineResult): string[] {
  const codes = result.proof.verdict.violations.map(v => v.code);
  return [...new Set(codes)];
}

/**
 * Gets total violation count.
 *
 * @param result - Quarantine result
 * @returns Number of violations
 */
export function getQuarantineViolationCount(result: QuarantineResult): number {
  return result.proof.verdict.violations.length;
}

/**
 * Summarizes a quarantine result.
 *
 * @param result - Quarantine result
 * @returns Summary string
 */
export function summarizeQuarantine(result: QuarantineResult): string {
  const lines: string[] = [];

  lines.push(`Quarantine Result`);
  lines.push(`=================`);
  lines.push(`ID: ${result.id}`);
  lines.push(`Reason: ${result.reason}`);
  lines.push(`Quarantined At: ${result.quarantinedAt}`);
  lines.push(`Original Input Hash: ${result.originalInputHash.substring(0, 16)}...`);
  lines.push(`Violations: ${getQuarantineViolationCount(result)}`);
  lines.push(`Violation Codes: ${getQuarantineViolationCodes(result).join(', ')}`);

  return lines.join('\n');
}

/**
 * Checks if quarantine can be resolved (for future use).
 * Currently always returns false as quarantines are permanent.
 *
 * @param result - Quarantine result
 * @returns false (quarantines are permanent)
 */
export function canResolveQuarantine(result: QuarantineResult): boolean {
  return false; // Quarantines are permanent in current implementation
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { buildQuarantineReason };
