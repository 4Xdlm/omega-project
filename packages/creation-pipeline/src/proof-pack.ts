/**
 * OMEGA Creation Pipeline — Proof-Pack Assembly & Verification
 * Phase C.4 — C4-INV-08: Proof-pack integrity
 */

import type { ProofPack, ProofPackManifest, MerkleTree, VerificationResult } from './types.js';
import { verifyMerkleTree } from './evidence/merkle-tree.js';

export function assembleProofPack(
  manifest: ProofPackManifest,
  merkle: MerkleTree,
): ProofPack {
  return {
    manifest,
    root_hash: merkle.root_hash,
    merkle_tree: merkle,
    verifiable: true,
  };
}

export function verifyProofPack(pack: ProofPack): VerificationResult {
  const merkleValid = verifyMerkleTree(pack.merkle_tree);
  const rootMatch = pack.root_hash === pack.merkle_tree.root_hash;

  // Verify all files in manifest have SHA-256 hashes
  let filesVerified = 0;
  let filesFailed = 0;
  const failedFiles: string[] = [];

  for (const file of pack.manifest.files) {
    if (file.sha256 && file.sha256.length === 64) {
      filesVerified++;
    } else {
      filesFailed++;
      failedFiles.push(file.path);
    }
  }

  // Verify manifest root_hash matches Merkle root
  const manifestRootMatch = pack.manifest.root_hash === pack.merkle_tree.root_hash;

  return {
    verified: merkleValid && rootMatch && manifestRootMatch && filesFailed === 0,
    root_hash_match: rootMatch && manifestRootMatch,
    files_verified: filesVerified,
    files_failed: filesFailed,
    failed_files: failedFiles,
    merkle_valid: merkleValid,
  };
}
