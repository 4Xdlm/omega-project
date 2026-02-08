/**
 * OMEGA Scribe Engine -- Evidence Chain
 * Phase C.2 -- Builder pattern for tracking pipeline steps
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { SEvidenceStep, SEvidenceChain, SVerdict } from './types.js';

export interface SEvidenceChainBuilder {
  addStep(step: string, inputHash: string, outputHash: string, ruleApplied: string, verdict: SVerdict): void;
  build(): SEvidenceChain;
}

export function createSEvidenceChainBuilder(outputId: string, timestamp: string): SEvidenceChainBuilder {
  const steps: SEvidenceStep[] = [];

  return {
    addStep(step: string, inputHash: string, outputHash: string, ruleApplied: string, verdict: SVerdict): void {
      steps.push({
        step,
        input_hash: inputHash,
        output_hash: outputHash,
        rule_applied: ruleApplied,
        verdict,
        timestamp_deterministic: timestamp,
      });
    },

    build(): SEvidenceChain {
      const chainContent = canonicalize({
        output_id: outputId,
        steps,
      });
      const chainHash = sha256(chainContent);

      return {
        output_id: outputId,
        steps: [...steps],
        chain_hash: chainHash,
      };
    },
  };
}

export function verifySEvidenceChain(chain: SEvidenceChain): boolean {
  const recomputed = canonicalize({
    output_id: chain.output_id,
    steps: chain.steps,
  });
  const expectedHash = sha256(recomputed);
  return expectedHash === chain.chain_hash;
}
