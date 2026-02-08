/**
 * OMEGA Phase Q — Evidence Chain Builder (Q-INV-06)
 *
 * Every evaluation step produces an evidence entry.
 * The chain is hashed for integrity verification.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { QEvidenceChain, QEvidenceStep, QVerdict } from './types.js';

/**
 * Builder for constructing an evidence chain step by step.
 */
export interface EvidenceChainBuilder {
  addStep(
    step: string,
    inputHash: string,
    outputHash: string,
    ruleApplied: string,
    verdict: QVerdict
  ): void;
  build(): QEvidenceChain;
}

/**
 * Create a new evidence chain builder for a specific case.
 *
 * @param caseId - The test case ID this chain belongs to
 * @param deterministicTimestamp - Injected timestamp (never Date.now())
 */
export function createEvidenceChainBuilder(
  caseId: string,
  deterministicTimestamp: string
): EvidenceChainBuilder {
  const steps: QEvidenceStep[] = [];

  return {
    addStep(
      step: string,
      inputHash: string,
      outputHash: string,
      ruleApplied: string,
      verdict: QVerdict
    ): void {
      steps.push({
        step,
        input_hash: inputHash,
        output_hash: outputHash,
        rule_applied: ruleApplied,
        verdict,
        timestamp_deterministic: deterministicTimestamp,
      });
    },

    build(): QEvidenceChain {
      const chainHash = sha256(canonicalize(steps));
      return {
        case_id: caseId,
        steps: [...steps],
        chain_hash: chainHash,
      };
    },
  };
}

/**
 * Verify evidence chain integrity: recompute chain_hash and compare.
 */
export function verifyEvidenceChain(chain: QEvidenceChain): boolean {
  const expectedHash = sha256(canonicalize(chain.steps));
  return chain.chain_hash === expectedHash;
}

/**
 * Merge multiple evidence chains into one.
 * Steps are concatenated in order. Hash is recomputed.
 */
export function mergeEvidenceChains(
  caseId: string,
  chains: readonly QEvidenceChain[]
): QEvidenceChain {
  const allSteps: QEvidenceStep[] = [];
  for (const chain of chains) {
    allSteps.push(...chain.steps);
  }
  const chainHash = sha256(canonicalize(allSteps));
  return {
    case_id: caseId,
    steps: allSteps,
    chain_hash: chainHash,
  };
}
