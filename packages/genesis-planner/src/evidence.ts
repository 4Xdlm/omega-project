/**
 * OMEGA Genesis Planner — Evidence Chain Builder
 * Phase C.1 — G-INV-10: every pipeline step produces verifiable evidence.
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { GVerdict, GEvidenceStep, GEvidenceChain } from './types.js';

export interface EvidenceChainBuilder {
  addStep(step: string, inputHash: string, outputHash: string, ruleApplied: string, verdict: GVerdict): void;
  build(): GEvidenceChain;
}

export function createEvidenceChainBuilder(planId: string, timestamp: string): EvidenceChainBuilder {
  const steps: GEvidenceStep[] = [];

  return {
    addStep(step: string, inputHash: string, outputHash: string, ruleApplied: string, verdict: GVerdict): void {
      steps.push({
        step,
        input_hash: inputHash,
        output_hash: outputHash,
        rule_applied: ruleApplied,
        verdict,
        timestamp_deterministic: timestamp,
      });
    },

    build(): GEvidenceChain {
      const frozenSteps: readonly GEvidenceStep[] = steps.map((s) => ({ ...s }));
      const chainContent = canonicalize({ plan_id: planId, steps: frozenSteps });
      const chainHash = sha256(chainContent);
      return {
        plan_id: planId,
        steps: frozenSteps,
        chain_hash: chainHash,
      };
    },
  };
}

export function verifyEvidenceChain(chain: GEvidenceChain): boolean {
  const recomputed = canonicalize({ plan_id: chain.plan_id, steps: chain.steps });
  const expectedHash = sha256(recomputed);
  return expectedHash === chain.chain_hash;
}
