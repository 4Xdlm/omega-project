/**
 * OMEGA Runner — Merkle Tree
 * Phase D.1 — Deterministic Merkle tree for artifact integrity
 */

import { sha256 } from '@omega/canon-kernel';
import type { MerkleNode, MerkleTree } from '../types.js';

/** Build a Merkle tree from a sorted list of leaf hashes */
export function buildMerkleTree(leaves: readonly { hash: string; label: string }[]): MerkleTree {
  if (leaves.length === 0) {
    const emptyHash = sha256('EMPTY_TREE');
    const root: MerkleNode = { hash: emptyHash, label: 'empty' };
    return { root, leaves: [root], root_hash: emptyHash };
  }

  // Sort leaves by label for order-independence (INV-RUN-05)
  const sorted = [...leaves].sort((a, b) => a.label.localeCompare(b.label));

  const leafNodes: MerkleNode[] = sorted.map((l) => ({
    hash: l.hash,
    label: l.label,
  }));

  const root = buildTreeLevel(leafNodes);

  return {
    root,
    leaves: leafNodes,
    root_hash: root.hash,
  };
}

/** Recursively build tree from bottom up */
function buildTreeLevel(nodes: readonly MerkleNode[]): MerkleNode {
  if (nodes.length === 1) return nodes[0];

  const parents: MerkleNode[] = [];
  for (let i = 0; i < nodes.length; i += 2) {
    const left = nodes[i];
    const right = i + 1 < nodes.length ? nodes[i + 1] : left; // duplicate last if odd
    const combined = sha256(left.hash + right.hash);
    parents.push({ hash: combined, left, right });
  }

  return buildTreeLevel(parents);
}

/** Verify a Merkle root matches the given leaf hashes */
export function verifyMerkleRoot(
  leaves: readonly { hash: string; label: string }[],
  expectedRoot: string,
): boolean {
  const tree = buildMerkleTree(leaves);
  return tree.root_hash === expectedRoot;
}

/** Serialize Merkle tree to JSON-safe structure */
export function serializeMerkleTree(tree: MerkleTree): object {
  return {
    root_hash: tree.root_hash,
    leaf_count: tree.leaves.length,
    leaves: tree.leaves.map((l) => ({ hash: l.hash, label: l.label ?? '' })),
    tree: serializeNode(tree.root),
  };
}

function serializeNode(node: MerkleNode): object {
  const result: Record<string, unknown> = { hash: node.hash };
  if (node.label) result['label'] = node.label;
  if (node.left) result['left'] = serializeNode(node.left);
  if (node.right) result['right'] = serializeNode(node.right);
  return result;
}
