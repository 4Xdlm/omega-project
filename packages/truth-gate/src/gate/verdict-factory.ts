/**
 * OMEGA Truth Gate — Verdict Factory
 *
 * Creates deterministic verdict structures.
 */

import { canonicalize, sha256, type RootHash, type TxId } from '@omega/canon-kernel';
import type {
  VerdictId,
  VerdictType,
  ValidatorResult,
  GateVerdict,
  PolicyId,
  VerdictEvidence,
  ValidatorId,
  ProofCarryingVerdict,
} from './types.js';

/**
 * Create a validator result.
 */
export function createValidatorResult(
  validator_id: ValidatorId,
  verdict: VerdictType,
  evidence: readonly VerdictEvidence[],
  duration_ms: number
): ValidatorResult {
  return {
    validator_id,
    verdict,
    evidence: [...evidence], // Copy for immutability
    duration_ms,
    timestamp: Date.now(),
  };
}

/**
 * Create a verdict ID from components (deterministic).
 */
export function createVerdictId(
  tx_id: TxId,
  policy_id: PolicyId,
  validator_results: readonly ValidatorResult[]
): VerdictId {
  const sortedResults = [...validator_results].sort((a, b) =>
    a.validator_id.localeCompare(b.validator_id)
  );

  const input = canonicalize({
    tx_id,
    policy_id,
    results: sortedResults.map(r => ({
      validator_id: r.validator_id,
      verdict: r.verdict,
      evidence_count: r.evidence.length,
    })),
  });

  // Use sha256 directly for verdict IDs (not entity IDs)
  return `verdict_${sha256(input)}` as VerdictId;
}

/**
 * Hash a verdict for integrity.
 */
export function hashVerdict(verdict: Omit<GateVerdict, 'hash'>): RootHash {
  const sortedResults = [...verdict.validator_results].sort((a, b) =>
    a.validator_id.localeCompare(b.validator_id)
  );

  const hashable = {
    verdict_id: verdict.verdict_id,
    tx_id: verdict.tx_id,
    final_verdict: verdict.final_verdict,
    validator_results: sortedResults.map(r => ({
      validator_id: r.validator_id,
      verdict: r.verdict,
      evidence_hash: sha256(canonicalize(r.evidence)),
    })),
    policy_id: verdict.policy_id,
  };

  return sha256(canonicalize(hashable)) as RootHash;
}

/**
 * Compute final verdict from validator results.
 * Rules:
 * - Any DENY → DENY
 * - Any DEFER (and no DENY) → DEFER
 * - All ALLOW → ALLOW
 */
export function computeFinalVerdict(
  results: readonly ValidatorResult[],
  rules: { deny_on_any_deny: boolean; defer_on_any_defer: boolean }
): VerdictType {
  if (results.length === 0) {
    return 'DENY'; // No validators = deny by default
  }

  const hasDeny = results.some(r => r.verdict === 'DENY');
  const hasDefer = results.some(r => r.verdict === 'DEFER');

  if (hasDeny && rules.deny_on_any_deny) {
    return 'DENY';
  }

  if (hasDefer && rules.defer_on_any_defer) {
    return 'DEFER';
  }

  // All ALLOW
  if (results.every(r => r.verdict === 'ALLOW')) {
    return 'ALLOW';
  }

  // Mixed results without strict rules → DENY
  return 'DENY';
}

/**
 * Create a complete gate verdict.
 */
export function createGateVerdict(
  tx_id: TxId,
  validator_results: readonly ValidatorResult[],
  policy_id: PolicyId,
  rules: { deny_on_any_deny: boolean; defer_on_any_defer: boolean }
): GateVerdict {
  const verdict_id = createVerdictId(tx_id, policy_id, validator_results);
  const final_verdict = computeFinalVerdict(validator_results, rules);
  const timestamp = Date.now();

  const partialVerdict: Omit<GateVerdict, 'hash'> = {
    verdict_id,
    tx_id,
    final_verdict,
    validator_results,
    policy_id,
    timestamp,
  };

  const hash = hashVerdict(partialVerdict);

  return {
    ...partialVerdict,
    hash,
  };
}

/**
 * Create evidence for hash mismatch.
 */
export function createHashMismatchEvidence(
  expected: string,
  actual: string,
  location: string
): VerdictEvidence {
  return {
    type: 'hash_mismatch',
    details: `Hash mismatch at ${location}`,
    location,
    expected,
    actual,
  };
}

/**
 * Create evidence for schema violation.
 */
export function createSchemaViolationEvidence(
  details: string,
  location?: string
): VerdictEvidence {
  const evidence: VerdictEvidence = {
    type: 'schema_violation',
    details,
  };
  if (location !== undefined) {
    return { ...evidence, location };
  }
  return evidence;
}

/**
 * Create evidence for policy violation.
 */
export function createPolicyViolationEvidence(
  details: string,
  location?: string
): VerdictEvidence {
  const evidence: VerdictEvidence = {
    type: 'policy_violation',
    details,
  };
  if (location !== undefined) {
    return { ...evidence, location };
  }
  return evidence;
}

/**
 * Create evidence for narrative drift.
 */
export function createDriftEvidence(
  details: string,
  expected?: string,
  actual?: string
): VerdictEvidence {
  const evidence: VerdictEvidence = {
    type: 'drift_detected',
    details,
  };
  const result = { ...evidence };
  if (expected !== undefined) {
    (result as any).expected = expected;
  }
  if (actual !== undefined) {
    (result as any).actual = actual;
  }
  return result;
}

/**
 * Create evidence for toxicity detection.
 */
export function createToxicityEvidence(
  details: string,
  location?: string
): VerdictEvidence {
  const evidence: VerdictEvidence = {
    type: 'toxicity_detected',
    details,
  };
  if (location !== undefined) {
    return { ...evidence, location };
  }
  return evidence;
}

/**
 * Create evidence for magic number violation.
 */
export function createMagicNumberEvidence(
  details: string,
  location: string,
  actual: string
): VerdictEvidence {
  return {
    type: 'magic_number',
    details,
    location,
    actual,
  };
}

/**
 * Create a proof-carrying verdict (variant).
 */
export function createProofCarryingVerdict(
  baseVerdict: GateVerdict,
  proof_chain: readonly RootHash[]
): ProofCarryingVerdict {
  const validator_hashes = new Map<ValidatorId, RootHash>();

  for (const result of baseVerdict.validator_results) {
    const hash = sha256(
      canonicalize({
        validator_id: result.validator_id,
        verdict: result.verdict,
        evidence: result.evidence,
      })
    ) as RootHash;
    validator_hashes.set(result.validator_id, hash);
  }

  const merkle_root = sha256(
    canonicalize({
      verdict_hash: baseVerdict.hash,
      proof_chain,
      validator_hashes: Array.from(validator_hashes.entries()).sort((a, b) =>
        a[0].localeCompare(b[0])
      ),
    })
  ) as RootHash;

  return {
    ...baseVerdict,
    proof_chain,
    merkle_root,
    validator_hashes,
  };
}
