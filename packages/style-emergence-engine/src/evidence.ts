/**
 * OMEGA Style Emergence Engine -- Evidence Chain
 * Phase C.3 -- Builder pattern for tracking pipeline steps
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { EEvidenceStep, EEvidenceChain, EVerdict } from './types.js';

export interface EEvidenceChainBuilder {
  addStep(step: string, inputHash: string, outputHash: string, ruleApplied: string, verdict: EVerdict): void;
  build(): EEvidenceChain;
}

export function createEEvidenceChainBuilder(outputId: string, timestamp: string): EEvidenceChainBuilder {
  const steps: EEvidenceStep[] = [];

  return {
    addStep(step: string, inputHash: string, outputHash: string, ruleApplied: string, verdict: EVerdict): void {
      steps.push({
        step,
        input_hash: inputHash,
        output_hash: outputHash,
        rule_applied: ruleApplied,
        verdict,
        timestamp_deterministic: timestamp,
      });
    },

    build(): EEvidenceChain {
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

export function verifyEEvidenceChain(chain: EEvidenceChain): boolean {
  const recomputed = canonicalize({
    output_id: chain.output_id,
    steps: chain.steps,
  });
  const expectedHash = sha256(recomputed);
  return expectedHash === chain.chain_hash;
}
