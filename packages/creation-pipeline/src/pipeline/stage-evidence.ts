/**
 * OMEGA Creation Pipeline — F5: Evidence Assembly
 * Phase C.4 — C4-INV-03: Evidence completeness
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  StyledOutput, GenesisPlan, ScribeOutput, IntentPack,
  StageResult, E2EEvidenceChain,
} from '../types.js';
import { buildMerkleTree } from '../evidence/merkle-tree.js';
import { traceAllParagraphs } from '../evidence/paragraph-trace.js';
import { buildE2EEvidenceChain } from '../evidence/evidence-chain.js';

export function stageEvidence(
  styleOutput: StyledOutput,
  plan: GenesisPlan,
  scribeOutput: ScribeOutput,
  input: IntentPack,
  pipelineId: string,
  stageResults: readonly StageResult[],
  genesisEvidenceHash: string,
  scribeEvidenceHash: string,
  styleEvidenceHash: string,
  timestamp: string,
): StageResult & { readonly evidence: E2EEvidenceChain } {
  const intentHash = sha256(canonicalize(input));

  // Trace all paragraphs
  const paragraphTraces = traceAllParagraphs(styleOutput, plan, scribeOutput, intentHash);

  // Build Merkle tree from all pipeline artefact hashes
  const leaves: string[] = [
    intentHash,
    plan.plan_hash,
    scribeOutput.output_hash,
    styleOutput.output_hash,
    genesisEvidenceHash,
    scribeEvidenceHash,
    styleEvidenceHash,
    ...paragraphTraces.map((t) => t.text_hash),
  ];

  const merkleTree = buildMerkleTree(leaves);

  const evidence = buildE2EEvidenceChain(
    pipelineId,
    merkleTree,
    paragraphTraces,
    [...stageResults],
    genesisEvidenceHash,
    scribeEvidenceHash,
    styleEvidenceHash,
  );

  return {
    stage: 'F5',
    verdict: 'PASS',
    input_hash: styleOutput.output_hash,
    output_hash: evidence.chain_hash,
    duration_ms: 0,
    details: `Evidence: ${paragraphTraces.length} traces, Merkle tree depth ${merkleTree.depth}`,
    timestamp_deterministic: timestamp,
    evidence,
  };
}
