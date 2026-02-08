import { describe, it, expect } from 'vitest';
import { buildMerkleTree, verifyMerkleTree, getMerklePath } from '../../src/evidence/merkle-tree.js';
import { sha256 } from '@omega/canon-kernel';

describe('MerkleTree', () => {
  it('builds from leaves', () => {
    const tree = buildMerkleTree(['a', 'b', 'c']);
    expect(tree.leaf_count).toBe(3);
    expect(tree.root_hash).toHaveLength(64);
  });

  it('root hash is deterministic', () => {
    const t1 = buildMerkleTree(['a', 'b']);
    const t2 = buildMerkleTree(['a', 'b']);
    expect(t1.root_hash).toBe(t2.root_hash);
  });

  it('verifies valid tree', () => {
    const tree = buildMerkleTree(['a', 'b', 'c']);
    expect(verifyMerkleTree(tree)).toBe(true);
  });

  it('detects tampered tree', () => {
    const tree = buildMerkleTree(['a', 'b']);
    const tampered = { ...tree, root_hash: 'tampered' };
    expect(verifyMerkleTree(tampered)).toBe(false);
  });

  it('handles single leaf', () => {
    const tree = buildMerkleTree(['x']);
    expect(tree.leaf_count).toBe(1);
    expect(tree.depth).toBe(0);
    expect(verifyMerkleTree(tree)).toBe(true);
  });

  it('handles two leaves', () => {
    const tree = buildMerkleTree(['a', 'b']);
    expect(tree.leaf_count).toBe(2);
    expect(tree.depth).toBe(1);
  });

  it('handles odd leaves (duplicates last)', () => {
    const tree = buildMerkleTree(['a', 'b', 'c']);
    expect(tree.leaf_count).toBe(3);
    expect(tree.depth).toBeGreaterThan(0);
  });

  it('handles even leaves', () => {
    const tree = buildMerkleTree(['a', 'b', 'c', 'd']);
    expect(tree.leaf_count).toBe(4);
    expect(tree.depth).toBe(2);
  });

  it('depth is correct', () => {
    const tree = buildMerkleTree(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(tree.depth).toBe(3);
  });

  it('getMerklePath returns valid path', () => {
    const tree = buildMerkleTree(['a', 'b', 'c', 'd']);
    const path = getMerklePath(tree, 0);
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toBe('a');
  });

  it('handles empty leaves', () => {
    const tree = buildMerkleTree([]);
    expect(tree.leaf_count).toBe(0);
    expect(verifyMerkleTree(tree)).toBe(true);
  });

  it('different leaves -> different root', () => {
    const t1 = buildMerkleTree(['a', 'b']);
    const t2 = buildMerkleTree(['c', 'd']);
    expect(t1.root_hash).not.toBe(t2.root_hash);
  });
});
