/**
 * OMEGA Runner — Merkle Tree Tests
 * Phase D.1 — 12 tests for Merkle tree operations
 */

import { describe, it, expect } from 'vitest';
import { buildMerkleTree, verifyMerkleRoot, serializeMerkleTree } from '../src/proofpack/merkle.js';
import { sha256 } from '@omega/canon-kernel';

describe('buildMerkleTree', () => {
  it('empty leaves produce EMPTY_TREE hash', () => {
    const tree = buildMerkleTree([]);
    const expectedHash = sha256('EMPTY_TREE');
    expect(tree.root_hash).toBe(expectedHash);
    expect(tree.leaves).toHaveLength(1);
    expect(tree.root.label).toBe('empty');
  });

  it('single leaf: leaf is root', () => {
    const leaf = { hash: sha256('leaf-data'), label: 'file-a' };
    const tree = buildMerkleTree([leaf]);
    expect(tree.root_hash).toBe(leaf.hash);
    expect(tree.leaves).toHaveLength(1);
  });

  it('two leaves: parent combines both', () => {
    const leafA = { hash: sha256('data-a'), label: 'a' };
    const leafB = { hash: sha256('data-b'), label: 'b' };
    const tree = buildMerkleTree([leafA, leafB]);
    // After sorting by label, a comes before b
    const expectedRoot = sha256(leafA.hash + leafB.hash);
    expect(tree.root_hash).toBe(expectedRoot);
  });

  it('4 leaves: correct depth (2 levels above leaves)', () => {
    const leaves = [
      { hash: sha256('d1'), label: 'a' },
      { hash: sha256('d2'), label: 'b' },
      { hash: sha256('d3'), label: 'c' },
      { hash: sha256('d4'), label: 'd' },
    ];
    const tree = buildMerkleTree(leaves);
    // level 1: AB = sha256(a+b), CD = sha256(c+d)
    // level 2: root = sha256(AB+CD)
    const ab = sha256(leaves[0].hash + leaves[1].hash);
    const cd = sha256(leaves[2].hash + leaves[3].hash);
    const expectedRoot = sha256(ab + cd);
    expect(tree.root_hash).toBe(expectedRoot);
    expect(tree.leaves).toHaveLength(4);
  });

  it('odd number of leaves: last leaf is duplicated for pairing', () => {
    const leaves = [
      { hash: sha256('x'), label: 'a' },
      { hash: sha256('y'), label: 'b' },
      { hash: sha256('z'), label: 'c' },
    ];
    const tree = buildMerkleTree(leaves);
    // After sort by label: a, b, c
    // Pair (a,b) -> ab, Pair (c,c) -> cc (c duplicated)
    const ab = sha256(leaves[0].hash + leaves[1].hash);
    const cc = sha256(leaves[2].hash + leaves[2].hash);
    const expectedRoot = sha256(ab + cc);
    expect(tree.root_hash).toBe(expectedRoot);
  });

  it('INV-RUN-05: order independent (reversed leaves produce same root)', () => {
    const leaves = [
      { hash: sha256('alpha'), label: 'file-a' },
      { hash: sha256('beta'), label: 'file-b' },
      { hash: sha256('gamma'), label: 'file-c' },
    ];
    const reversed = [...leaves].reverse();
    const tree1 = buildMerkleTree(leaves);
    const tree2 = buildMerkleTree(reversed);
    expect(tree1.root_hash).toBe(tree2.root_hash);
  });

  it('large number of leaves (20) produces valid tree', () => {
    const leaves = Array.from({ length: 20 }, (_, i) => ({
      hash: sha256(`leaf-${i}`),
      label: `file-${String(i).padStart(2, '0')}`,
    }));
    const tree = buildMerkleTree(leaves);
    expect(tree.root_hash).toHaveLength(64);
    expect(tree.root_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(tree.leaves).toHaveLength(20);
  });

  it('same leaves produce same root hash (determinism)', () => {
    const leaves = [
      { hash: sha256('one'), label: 'a' },
      { hash: sha256('two'), label: 'b' },
    ];
    const tree1 = buildMerkleTree(leaves);
    const tree2 = buildMerkleTree(leaves);
    expect(tree1.root_hash).toBe(tree2.root_hash);
  });
});

describe('verifyMerkleRoot', () => {
  it('INV-RUN-11: valid root returns true', () => {
    const leaves = [
      { hash: sha256('data-1'), label: 'artifact-a' },
      { hash: sha256('data-2'), label: 'artifact-b' },
    ];
    const tree = buildMerkleTree(leaves);
    expect(verifyMerkleRoot(leaves, tree.root_hash)).toBe(true);
  });

  it('INV-RUN-11: tampered root returns false', () => {
    const leaves = [
      { hash: sha256('data-1'), label: 'artifact-a' },
      { hash: sha256('data-2'), label: 'artifact-b' },
    ];
    const fakeRoot = 'f'.repeat(64);
    expect(verifyMerkleRoot(leaves, fakeRoot)).toBe(false);
  });
});

describe('serializeMerkleTree', () => {
  it('includes all required fields', () => {
    const leaves = [
      { hash: sha256('a'), label: 'file-a' },
      { hash: sha256('b'), label: 'file-b' },
    ];
    const tree = buildMerkleTree(leaves);
    const serialized = serializeMerkleTree(tree) as Record<string, unknown>;
    expect(serialized).toHaveProperty('root_hash');
    expect(serialized).toHaveProperty('leaf_count', 2);
    expect(serialized).toHaveProperty('leaves');
    expect(serialized).toHaveProperty('tree');
    expect(serialized['root_hash']).toBe(tree.root_hash);
  });

  it('is deterministic (same tree produces same serialization)', () => {
    const leaves = [
      { hash: sha256('x'), label: 'file-x' },
      { hash: sha256('y'), label: 'file-y' },
    ];
    const tree = buildMerkleTree(leaves);
    const s1 = JSON.stringify(serializeMerkleTree(tree));
    const s2 = JSON.stringify(serializeMerkleTree(tree));
    expect(s1).toBe(s2);
  });
});
