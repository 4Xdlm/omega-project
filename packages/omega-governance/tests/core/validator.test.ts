import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { readProofPack } from '../../src/core/reader.js';
import { validateManifestHash, validateMerkleRoot, validateArtifactHashes, validateLeafCount, validateProofPack } from '../../src/core/validator.js';
import { createTempDir, createFixtureRun } from '../fixtures/helpers.js';

describe('ProofPack Validator', () => {
  let tempDir: string;
  let validRunDir: string;
  let corruptManifestDir: string;
  let corruptMerkleDir: string;

  beforeAll(() => {
    tempDir = createTempDir('validator');
    validRunDir = createFixtureRun(tempDir, { runId: 'valid0000000001' });
    corruptManifestDir = createFixtureRun(tempDir, { runId: 'corruptmfst0001', corruptManifest: true });
    corruptMerkleDir = createFixtureRun(tempDir, { runId: 'corruptmrkl0001', corruptMerkle: true });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('validates correct manifest hash', () => {
    const data = readProofPack(validRunDir);
    const check = validateManifestHash(data.runDir, data.manifest, data.manifestHash);
    expect(check.status).toBe('PASS');
  });

  it('detects corrupt manifest hash', () => {
    const data = readProofPack(corruptManifestDir);
    const check = validateManifestHash(data.runDir, data.manifest, data.manifestHash);
    expect(check.status).toBe('FAIL');
  });

  it('validates correct merkle root', () => {
    const data = readProofPack(validRunDir);
    const check = validateMerkleRoot(data.manifest, data.merkleTree);
    expect(check.status).toBe('PASS');
  });

  it('detects corrupt merkle root', () => {
    const data = readProofPack(corruptMerkleDir);
    const check = validateMerkleRoot(data.manifest, data.merkleTree);
    expect(check.status).toBe('FAIL');
  });

  it('validates artifact hashes', () => {
    const data = readProofPack(validRunDir);
    const checks = validateArtifactHashes(data.runDir, data.manifest);
    expect(checks.every((c) => c.status === 'PASS')).toBe(true);
  });

  it('validates leaf count', () => {
    const data = readProofPack(validRunDir);
    const check = validateLeafCount(data.manifest, data.merkleTree);
    expect(check.status).toBe('PASS');
  });

  it('full validation passes for valid run', () => {
    const data = readProofPack(validRunDir);
    const result = validateProofPack(data);
    expect(result.valid).toBe(true);
  });

  it('full validation fails for corrupt manifest', () => {
    const data = readProofPack(corruptManifestDir);
    const result = validateProofPack(data);
    expect(result.valid).toBe(false);
  });

  it('full validation fails for corrupt merkle', () => {
    const data = readProofPack(corruptMerkleDir);
    const result = validateProofPack(data);
    expect(result.valid).toBe(false);
  });

  it('validation result contains all checks', () => {
    const data = readProofPack(validRunDir);
    const result = validateProofPack(data);
    expect(result.checks.length).toBeGreaterThanOrEqual(3);
    const checkNames = result.checks.map((c) => c.check);
    expect(checkNames).toContain('MANIFEST_HASH');
    expect(checkNames).toContain('MERKLE_ROOT');
    expect(checkNames).toContain('LEAF_COUNT');
  });
});
