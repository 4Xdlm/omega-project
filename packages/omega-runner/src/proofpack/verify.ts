/**
 * OMEGA Runner — ProofPack Verification
 * Phase D.1 — Integrity verification of existing ProofPack
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Manifest, VerifyResult, VerifyCheck } from '../types.js';
import { canonicalJSON } from './canonical.js';
import { hashString } from './hash.js';
import { verifyMerkleRoot } from './merkle.js';

/** Verify an existing ProofPack on disk */
export function verifyProofPack(runDir: string, strict: boolean = false): VerifyResult {
  const checks: VerifyCheck[] = [];

  // Read manifest
  const manifestPath = join(runDir, 'manifest.json');
  const manifestHashPath = join(runDir, 'manifest.sha256');

  if (!existsSync(manifestPath) || !existsSync(manifestHashPath)) {
    return {
      run_id: 'UNKNOWN',
      valid: false,
      checks: [{
        artifact: 'manifest.json',
        expected_hash: '',
        actual_hash: '',
        valid: false,
      }],
      manifest_hash: '',
    };
  }

  const manifestContent = readFileSync(manifestPath, 'utf8');
  const expectedManifestHash = readFileSync(manifestHashPath, 'utf8').trim();
  const actualManifestHash = hashString(manifestContent);

  checks.push({
    artifact: 'manifest.json',
    expected_hash: expectedManifestHash,
    actual_hash: actualManifestHash,
    valid: expectedManifestHash === actualManifestHash,
  });

  // Parse manifest
  let manifest: Manifest;
  try {
    manifest = JSON.parse(manifestContent) as Manifest;
  } catch {
    return {
      run_id: 'UNKNOWN',
      valid: false,
      checks,
      manifest_hash: actualManifestHash,
    };
  }

  // Verify each artifact hash
  for (const artifact of manifest.artifacts) {
    const filePath = join(runDir, artifact.stage, artifact.filename);
    if (!existsSync(filePath)) {
      checks.push({
        artifact: artifact.path,
        expected_hash: artifact.sha256,
        actual_hash: 'FILE_NOT_FOUND',
        valid: false,
      });
      continue;
    }

    const content = readFileSync(filePath, 'utf8');
    const actualHash = hashString(content);
    checks.push({
      artifact: artifact.path,
      expected_hash: artifact.sha256,
      actual_hash: actualHash,
      valid: artifact.sha256 === actualHash,
    });
  }

  // Verify Merkle root
  const leaves = manifest.artifacts.map((a) => ({ hash: a.sha256, label: a.path }));
  const merkleValid = verifyMerkleRoot(leaves, manifest.merkle_root);
  checks.push({
    artifact: 'merkle-root',
    expected_hash: manifest.merkle_root,
    actual_hash: merkleValid ? manifest.merkle_root : 'MISMATCH',
    valid: merkleValid,
  });

  // Strict mode: verify manifest canonical form
  if (strict) {
    const recanonical = canonicalJSON(manifest);
    const recanonicalHash = hashString(recanonical);
    checks.push({
      artifact: 'manifest-canonical',
      expected_hash: actualManifestHash,
      actual_hash: recanonicalHash,
      valid: actualManifestHash === recanonicalHash,
    });
  }

  const allValid = checks.every((c) => c.valid);

  return {
    run_id: manifest.run_id,
    valid: allValid,
    checks,
    manifest_hash: actualManifestHash,
  };
}
