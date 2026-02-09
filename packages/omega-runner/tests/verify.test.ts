/**
 * OMEGA Runner — ProofPack Verification Tests
 * Phase D.1 — 12 tests for verifyProofPack
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyProofPack } from '../src/proofpack/verify.js';
import { canonicalJSON } from '../src/proofpack/canonical.js';
import { hashString } from '../src/proofpack/hash.js';
import { buildMerkleTree } from '../src/proofpack/merkle.js';
import { getVersionMap } from '../src/version.js';
import type { ArtifactEntry, Manifest, StageId } from '../src/types.js';

/** Helper: write a minimal valid ProofPack to disk and return its path + manifest */
function writeTestProofPack(baseDir: string): { runDir: string; manifest: Manifest; manifestHash: string } {
  const runDir = join(baseDir, 'run-test');
  mkdirSync(runDir, { recursive: true });

  // Create a single artifact
  const stageDir = join(runDir, '00-intent');
  mkdirSync(stageDir, { recursive: true });
  const artifactContent = canonicalJSON({ intent: 'test-intent', data: 'sample' });
  const artifactHash = hashString(artifactContent);
  writeFileSync(join(stageDir, 'intent.json'), artifactContent, 'utf8');

  const artifacts: ArtifactEntry[] = [
    {
      stage: '00-intent' as StageId,
      filename: 'intent.json',
      path: '00-intent/intent.json',
      sha256: artifactHash,
      size: Buffer.from(artifactContent, 'utf8').length,
    },
  ];

  // Build Merkle tree
  const leaves = artifacts.map((a) => ({ hash: a.sha256, label: a.path }));
  const tree = buildMerkleTree(leaves);

  const manifest: Manifest = {
    run_id: 'abcdef0123456789',
    seed: '',
    versions: getVersionMap(),
    artifacts,
    merkle_root: tree.root_hash,
    intent_hash: artifactHash,
    final_hash: artifactHash,
    verdict: 'PASS',
    stages_completed: ['00-intent'] as readonly StageId[],
  };

  const manifestJson = canonicalJSON(manifest);
  const manifestHash = hashString(manifestJson);

  writeFileSync(join(runDir, 'manifest.json'), manifestJson, 'utf8');
  writeFileSync(join(runDir, 'manifest.sha256'), manifestHash, 'utf8');

  return { runDir, manifest, manifestHash };
}

describe('verifyProofPack', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'omega-verify-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('valid pack returns valid=true', () => {
    const { runDir } = writeTestProofPack(tmpDir);
    const result = verifyProofPack(runDir);
    expect(result.valid).toBe(true);
  });

  it('missing manifest.json returns valid=false', () => {
    const emptyDir = join(tmpDir, 'empty-run');
    mkdirSync(emptyDir, { recursive: true });

    const result = verifyProofPack(emptyDir);
    expect(result.valid).toBe(false);
    expect(result.run_id).toBe('UNKNOWN');
  });

  it('tampered artifact returns valid=false', () => {
    const { runDir } = writeTestProofPack(tmpDir);

    // Tamper with the artifact content
    writeFileSync(join(runDir, '00-intent', 'intent.json'), '{"tampered":true}', 'utf8');

    const result = verifyProofPack(runDir);
    expect(result.valid).toBe(false);
    const artifactCheck = result.checks.find((c) => c.artifact === '00-intent/intent.json');
    expect(artifactCheck?.valid).toBe(false);
  });

  it('tampered manifest hash returns valid=false', () => {
    const { runDir } = writeTestProofPack(tmpDir);

    // Tamper with manifest.sha256
    writeFileSync(join(runDir, 'manifest.sha256'), 'f'.repeat(64), 'utf8');

    const result = verifyProofPack(runDir);
    expect(result.valid).toBe(false);
    const manifestCheck = result.checks.find((c) => c.artifact === 'manifest.json');
    expect(manifestCheck?.valid).toBe(false);
  });

  it('missing artifact file returns valid=false', () => {
    const { runDir } = writeTestProofPack(tmpDir);

    // Delete the artifact file
    rmSync(join(runDir, '00-intent', 'intent.json'));

    const result = verifyProofPack(runDir);
    expect(result.valid).toBe(false);
    const artifactCheck = result.checks.find((c) => c.artifact === '00-intent/intent.json');
    expect(artifactCheck?.actual_hash).toBe('FILE_NOT_FOUND');
  });

  it('INV-RUN-12: verify twice returns identical results', () => {
    const { runDir } = writeTestProofPack(tmpDir);

    const result1 = verifyProofPack(runDir);
    const result2 = verifyProofPack(runDir);

    expect(result1.valid).toBe(result2.valid);
    expect(result1.manifest_hash).toBe(result2.manifest_hash);
    expect(result1.run_id).toBe(result2.run_id);
    expect(result1.checks.length).toBe(result2.checks.length);
  });

  it('strict mode: canonical form check adds extra check', () => {
    const { runDir } = writeTestProofPack(tmpDir);

    const normalResult = verifyProofPack(runDir, false);
    const strictResult = verifyProofPack(runDir, true);

    // Strict mode adds one additional check for manifest-canonical
    expect(strictResult.checks.length).toBe(normalResult.checks.length + 1);
    const canonicalCheck = strictResult.checks.find((c) => c.artifact === 'manifest-canonical');
    expect(canonicalCheck).toBeDefined();
    expect(canonicalCheck?.valid).toBe(true);
  });

  it('run_id in result matches manifest', () => {
    const { runDir, manifest } = writeTestProofPack(tmpDir);

    const result = verifyProofPack(runDir);
    expect(result.run_id).toBe(manifest.run_id);
  });

  it('manifest_hash in result is correct', () => {
    const { runDir, manifestHash } = writeTestProofPack(tmpDir);

    const result = verifyProofPack(runDir);
    expect(result.manifest_hash).toBe(manifestHash);
  });

  it('checks array contains all artifacts plus manifest and merkle', () => {
    const { runDir, manifest } = writeTestProofPack(tmpDir);

    const result = verifyProofPack(runDir);
    // Should have: manifest.json check + each artifact check + merkle-root check
    const expectedChecks = 1 + manifest.artifacts.length + 1;
    expect(result.checks.length).toBe(expectedChecks);

    const artifactNames = result.checks.map((c) => c.artifact);
    expect(artifactNames).toContain('manifest.json');
    expect(artifactNames).toContain('merkle-root');
    for (const art of manifest.artifacts) {
      expect(artifactNames).toContain(art.path);
    }
  });

  it('Edge: empty run directory returns invalid', () => {
    const emptyDir = join(tmpDir, 'no-manifest');
    mkdirSync(emptyDir, { recursive: true });

    const result = verifyProofPack(emptyDir);
    expect(result.valid).toBe(false);
    expect(result.run_id).toBe('UNKNOWN');
    expect(result.manifest_hash).toBe('');
  });

  it('Determinism: verify is pure (no side effects on disk)', () => {
    const { runDir } = writeTestProofPack(tmpDir);

    // Read manifest before verify
    const manifestBefore = readFileSync(join(runDir, 'manifest.json'), 'utf8');
    const hashBefore = readFileSync(join(runDir, 'manifest.sha256'), 'utf8');

    // Run verify
    verifyProofPack(runDir);
    verifyProofPack(runDir, true);

    // Read manifest after verify — should be identical
    const manifestAfter = readFileSync(join(runDir, 'manifest.json'), 'utf8');
    const hashAfter = readFileSync(join(runDir, 'manifest.sha256'), 'utf8');

    expect(manifestAfter).toBe(manifestBefore);
    expect(hashAfter).toBe(hashBefore);
  });
});
