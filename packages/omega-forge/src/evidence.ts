/**
 * OMEGA Forge — Evidence Chain
 * Phase C.5 — Traceable evidence for each analysis step
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type { F5EvidenceStep, F5EvidenceChain, F5Verdict } from './types.js';

export function createEvidenceStep(
  step: string,
  input_hash: string,
  output_hash: string,
  rule_applied: string,
  verdict: F5Verdict,
  timestamp: string,
): F5EvidenceStep {
  return {
    step,
    input_hash,
    output_hash,
    rule_applied,
    verdict,
    timestamp_deterministic: timestamp,
  };
}

export function buildF5EvidenceChain(
  forge_id: string,
  steps: readonly F5EvidenceStep[],
): F5EvidenceChain {
  const hashInput = {
    forge_id,
    steps: steps.map((s) => ({
      step: s.step,
      input: s.input_hash,
      output: s.output_hash,
      verdict: s.verdict,
    })),
  };

  return {
    forge_id,
    steps,
    chain_hash: sha256(canonicalize(hashInput)),
  };
}

export function verifyF5EvidenceChain(chain: F5EvidenceChain): boolean {
  const hashInput = {
    forge_id: chain.forge_id,
    steps: chain.steps.map((s) => ({
      step: s.step,
      input: s.input_hash,
      output: s.output_hash,
      verdict: s.verdict,
    })),
  };
  const expected = sha256(canonicalize(hashInput));
  return expected === chain.chain_hash;
}
