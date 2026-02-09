/**
 * OMEGA Governance — ProofPack Validator
 * Phase D.2 — Integrity verification (manifest hash, merkle root, artifact hashes)
 *
 * INV-GOV-02: All analysis relies on verified manifest + merkle.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { Manifest, SerializedMerkleTree, ProofPackData } from './types.js';

/** Validation result for a single check */
export interface ValidationCheck {
  readonly check: string;
  readonly status: 'PASS' | 'FAIL';
  readonly message: string;
}

/** Full validation result */
export interface ValidationResult {
  readonly valid: boolean;
  readonly checks: readonly ValidationCheck[];
}

/** Compute SHA-256 of a string (CRLF-normalized) */
function sha256(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

/** Validate manifest hash matches manifest.sha256 */
export function validateManifestHash(runDir: string, _manifest: Manifest, declaredHash: string): ValidationCheck {
  const manifestPath = join(runDir, 'manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  const computedHash = sha256(raw);

  if (computedHash === declaredHash) {
    return { check: 'MANIFEST_HASH', status: 'PASS', message: 'Manifest hash verified' };
  }
  return {
    check: 'MANIFEST_HASH',
    status: 'FAIL',
    message: `Manifest hash mismatch: computed=${computedHash}, declared=${declaredHash}`,
  };
}

/** Validate merkle root matches manifest.merkle_root */
export function validateMerkleRoot(manifest: Manifest, merkleTree: SerializedMerkleTree): ValidationCheck {
  if (merkleTree.root_hash === manifest.merkle_root) {
    return { check: 'MERKLE_ROOT', status: 'PASS', message: 'Merkle root matches manifest' };
  }
  return {
    check: 'MERKLE_ROOT',
    status: 'FAIL',
    message: `Merkle root mismatch: tree=${merkleTree.root_hash}, manifest=${manifest.merkle_root}`,
  };
}

/** Validate each artifact hash in manifest matches file on disk */
export function validateArtifactHashes(runDir: string, manifest: Manifest): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  for (const artifact of manifest.artifacts) {
    const filePath = join(runDir, ...artifact.path.split('/'));
    try {
      const content = readFileSync(filePath, 'utf-8');
      const computedHash = sha256(content);
      if (computedHash === artifact.sha256) {
        checks.push({
          check: `ARTIFACT_HASH:${artifact.path}`,
          status: 'PASS',
          message: `Artifact ${artifact.path} hash verified`,
        });
      } else {
        checks.push({
          check: `ARTIFACT_HASH:${artifact.path}`,
          status: 'FAIL',
          message: `Artifact ${artifact.path} hash mismatch: computed=${computedHash}, declared=${artifact.sha256}`,
        });
      }
    } catch {
      checks.push({
        check: `ARTIFACT_HASH:${artifact.path}`,
        status: 'FAIL',
        message: `Artifact ${artifact.path} not found on disk`,
      });
    }
  }

  return checks;
}

/** Validate merkle leaf count matches manifest artifact count */
export function validateLeafCount(manifest: Manifest, merkleTree: SerializedMerkleTree): ValidationCheck {
  if (merkleTree.leaf_count === manifest.artifacts.length) {
    return { check: 'LEAF_COUNT', status: 'PASS', message: 'Leaf count matches artifact count' };
  }
  return {
    check: 'LEAF_COUNT',
    status: 'FAIL',
    message: `Leaf count mismatch: tree=${merkleTree.leaf_count}, manifest=${manifest.artifacts.length}`,
  };
}

/** Run all validation checks on a ProofPack */
export function validateProofPack(data: ProofPackData): ValidationResult {
  const checks: ValidationCheck[] = [];

  checks.push(validateManifestHash(data.runDir, data.manifest, data.manifestHash));
  checks.push(validateMerkleRoot(data.manifest, data.merkleTree));
  checks.push(validateLeafCount(data.manifest, data.merkleTree));
  checks.push(...validateArtifactHashes(data.runDir, data.manifest));

  const valid = checks.every((c) => c.status === 'PASS');
  return { valid, checks };
}
