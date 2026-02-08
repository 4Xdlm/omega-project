/**
 * OMEGA Creation Pipeline — Merkle Tree Builder & Verifier
 * Phase C.4 — C4-INV-08: Proof-pack integrity via Merkle tree
 */

import { sha256 } from '@omega/canon-kernel';
import type { MerkleTree, MerkleNode } from '../types.js';

export function buildMerkleTree(leaves: readonly string[]): MerkleTree {
  if (leaves.length === 0) {
    const emptyHash = sha256('EMPTY_MERKLE');
    return {
      root_hash: emptyHash,
      nodes: [{ hash: emptyHash, left: null, right: null, label: 'empty', depth: 0 }],
      leaf_count: 0,
      depth: 0,
    };
  }

  const nodes: MerkleNode[] = [];

  // Create leaf nodes
  let currentLevel: string[] = [];
  for (let i = 0; i < leaves.length; i++) {
    const leafHash = leaves[i];
    nodes.push({
      hash: leafHash,
      left: null,
      right: null,
      label: `leaf-${i}`,
      depth: 0,
    });
    currentLevel.push(leafHash);
  }

  let depth = 0;

  // Build tree bottom-up
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    depth++;

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      // If odd number, duplicate last
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i];
      const parentHash = sha256(left + right);

      nodes.push({
        hash: parentHash,
        left,
        right,
        label: `node-d${depth}-${Math.floor(i / 2)}`,
        depth,
      });

      nextLevel.push(parentHash);
    }

    currentLevel = nextLevel;
  }

  return {
    root_hash: currentLevel[0],
    nodes,
    leaf_count: leaves.length,
    depth,
  };
}

export function verifyMerkleTree(tree: MerkleTree): boolean {
  if (tree.leaf_count === 0) {
    return tree.root_hash === sha256('EMPTY_MERKLE');
  }

  // Get leaf nodes (depth === 0)
  const leafNodes = tree.nodes.filter((n) => n.depth === 0);
  if (leafNodes.length !== tree.leaf_count) return false;

  // Rebuild and compare root
  const rebuilt = buildMerkleTree(leafNodes.map((n) => n.hash));
  return rebuilt.root_hash === tree.root_hash;
}

export function getMerklePath(tree: MerkleTree, leafIndex: number): readonly string[] {
  if (leafIndex < 0 || leafIndex >= tree.leaf_count) {
    return [];
  }

  const leafNodes = tree.nodes.filter((n) => n.depth === 0);
  const path: string[] = [leafNodes[leafIndex].hash];

  // Walk up through levels
  let currentHash = leafNodes[leafIndex].hash;
  for (let d = 1; d <= tree.depth; d++) {
    const parentNode = tree.nodes.find(
      (n) => n.depth === d && (n.left === currentHash || n.right === currentHash),
    );
    if (parentNode) {
      // Add sibling
      const sibling = parentNode.left === currentHash ? parentNode.right : parentNode.left;
      if (sibling) path.push(sibling);
      path.push(parentNode.hash);
      currentHash = parentNode.hash;
    }
  }

  return path;
}
