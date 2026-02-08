import { describe, it, expect } from 'vitest';
import { assembleProofPack, verifyProofPack } from '../src/proof-pack.js';
import { buildMerkleTree } from '../src/evidence/merkle-tree.js';
import { sha256 } from '@omega/canon-kernel';
import type { ProofPackManifest, ProofPackFile } from '../src/types.js';

describe('ProofPack', () => {
  const files: ProofPackFile[] = [
    { path: 'a.json', sha256: sha256('content-a'), size_bytes: 100, role: 'input' },
    { path: 'b.json', sha256: sha256('content-b'), size_bytes: 200, role: 'output' },
    { path: 'c.json', sha256: sha256('content-c'), size_bytes: 150, role: 'evidence' },
  ];
  const merkle = buildMerkleTree(files.map(f => f.sha256));
  const manifest: ProofPackManifest = {
    manifest_version: '1.0.0',
    pipeline_id: 'PIPE-1',
    root_hash: merkle.root_hash,
    files,
    created_at: '2026-02-08T00:00:00.000Z',
    total_files: 3,
    total_bytes: 450,
  };

  it('assembles proof pack', () => {
    const pack = assembleProofPack(manifest, merkle);
    expect(pack.verifiable).toBe(true);
  });

  it('root hash matches merkle', () => {
    const pack = assembleProofPack(manifest, merkle);
    expect(pack.root_hash).toBe(merkle.root_hash);
  });

  it('verifies valid pack', () => {
    const pack = assembleProofPack(manifest, merkle);
    const result = verifyProofPack(pack);
    expect(result.verified).toBe(true);
    expect(result.merkle_valid).toBe(true);
  });

  it('detects tampered root', () => {
    const pack = assembleProofPack({ ...manifest, root_hash: 'bad' }, merkle);
    const result = verifyProofPack(pack);
    expect(result.verified).toBe(false);
  });

  it('manifest has all files', () => {
    const pack = assembleProofPack(manifest, merkle);
    expect(pack.manifest.total_files).toBe(3);
  });

  it('root hash match checked', () => {
    const pack = assembleProofPack(manifest, merkle);
    const result = verifyProofPack(pack);
    expect(result.root_hash_match).toBe(true);
  });

  it('files verified count', () => {
    const pack = assembleProofPack(manifest, merkle);
    const result = verifyProofPack(pack);
    expect(result.files_verified).toBe(3);
    expect(result.files_failed).toBe(0);
  });

  it('version from manifest', () => {
    const pack = assembleProofPack(manifest, merkle);
    expect(pack.manifest.manifest_version).toBe('1.0.0');
  });

  it('deterministic', () => {
    const p1 = assembleProofPack(manifest, merkle);
    const p2 = assembleProofPack(manifest, merkle);
    expect(p1.root_hash).toBe(p2.root_hash);
  });

  it('all roles covered', () => {
    const pack = assembleProofPack(manifest, merkle);
    const roles = new Set(pack.manifest.files.map(f => f.role));
    expect(roles.has('input')).toBe(true);
    expect(roles.has('output')).toBe(true);
    expect(roles.has('evidence')).toBe(true);
  });
});
