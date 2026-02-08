/**
 * OMEGA Creation Pipeline — E2E Evidence Chain Assembly
 * Phase C.4 — Links all evidence from C.1+C.2+C.3+C.4
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  E2EEvidenceChain, MerkleTree, ParagraphTrace, StageResult,
} from '../types.js';

export function buildE2EEvidenceChain(
  pipelineId: string,
  merkleTree: MerkleTree,
  paragraphTraces: readonly ParagraphTrace[],
  stageResults: readonly StageResult[],
  genesisEvidenceHash: string,
  scribeEvidenceHash: string,
  styleEvidenceHash: string,
): E2EEvidenceChain {
  const chainData = {
    pipeline_id: pipelineId,
    merkle_root: merkleTree.root_hash,
    paragraph_count: paragraphTraces.length,
    stage_count: stageResults.length,
    genesis_evidence_hash: genesisEvidenceHash,
    scribe_evidence_hash: scribeEvidenceHash,
    style_evidence_hash: styleEvidenceHash,
  };

  const chainHash = sha256(canonicalize(chainData));

  return {
    pipeline_id: pipelineId,
    merkle_tree: merkleTree,
    paragraph_traces: paragraphTraces,
    stage_results: stageResults,
    genesis_evidence_hash: genesisEvidenceHash,
    scribe_evidence_hash: scribeEvidenceHash,
    style_evidence_hash: styleEvidenceHash,
    chain_hash: chainHash,
  };
}

export function verifyE2EEvidenceChain(chain: E2EEvidenceChain): boolean {
  // Recompute chain hash
  const chainData = {
    pipeline_id: chain.pipeline_id,
    merkle_root: chain.merkle_tree.root_hash,
    paragraph_count: chain.paragraph_traces.length,
    stage_count: chain.stage_results.length,
    genesis_evidence_hash: chain.genesis_evidence_hash,
    scribe_evidence_hash: chain.scribe_evidence_hash,
    style_evidence_hash: chain.style_evidence_hash,
  };

  const expectedHash = sha256(canonicalize(chainData));
  return expectedHash === chain.chain_hash;
}
