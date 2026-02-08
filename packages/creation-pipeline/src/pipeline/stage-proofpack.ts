/**
 * OMEGA Creation Pipeline — F7: Proof-Pack Generation
 * Phase C.4 — C4-INV-08: Proof-pack integrity
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  IntentPack, GenesisPlan, ScribeOutput, StyledOutput,
  E2EEvidenceChain, CreationReport,
  StageResult, ProofPack, ProofPackManifest, ProofPackFile,
} from '../types.js';
import { buildMerkleTree } from '../evidence/merkle-tree.js';

function makeFileFromHash(path: string, hash: string, role: ProofPackFile['role']): ProofPackFile {
  return {
    path,
    sha256: hash,
    size_bytes: 64,
    role,
  };
}

export function stageProofPack(
  input: IntentPack,
  plan: GenesisPlan,
  scribeOutput: ScribeOutput,
  styleOutput: StyledOutput,
  evidence: E2EEvidenceChain,
  _report: CreationReport | null,
  pipelineId: string,
  proofPackVersion: string,
  timestamp: string,
): StageResult & { readonly proofPack: ProofPack } {
  // Use pre-computed hashes to avoid stack overflow on deep canonicalize
  const intentHash = sha256(canonicalize(input));
  const files: ProofPackFile[] = [
    makeFileFromHash('input/intent-pack.json', intentHash, 'input'),
    makeFileFromHash('intermediate/genesis-plan.json', plan.plan_hash, 'intermediate'),
    makeFileFromHash('intermediate/scribe-output.json', scribeOutput.output_hash, 'intermediate'),
    makeFileFromHash('output/styled-output.json', styleOutput.output_hash, 'output'),
    makeFileFromHash('evidence/evidence-chain.json', evidence.chain_hash, 'evidence'),
    makeFileFromHash('evidence/merkle-tree.json', evidence.merkle_tree.root_hash, 'evidence'),
  ];

  // Build a Merkle tree from all file hashes
  const fileHashes = files.map((f) => f.sha256);
  const merkleTree = buildMerkleTree(fileHashes);

  const totalBytes = files.reduce((sum, f) => sum + f.size_bytes, 0);

  const manifest: ProofPackManifest = {
    manifest_version: proofPackVersion,
    pipeline_id: pipelineId,
    root_hash: merkleTree.root_hash,
    files,
    created_at: timestamp,
    total_files: files.length,
    total_bytes: totalBytes,
  };

  const proofPack: ProofPack = {
    manifest,
    root_hash: merkleTree.root_hash,
    merkle_tree: merkleTree,
    verifiable: true,
  };

  return {
    stage: 'F7',
    verdict: 'PASS',
    input_hash: evidence.chain_hash,
    output_hash: merkleTree.root_hash,
    duration_ms: 0,
    details: `Proof-pack: ${files.length} files, root ${merkleTree.root_hash.slice(0, 16)}`,
    timestamp_deterministic: timestamp,
    proofPack,
  };
}
