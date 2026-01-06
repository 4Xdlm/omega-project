/**
 * OMEGA NEXUS - Cryptographic Utilities
 * 
 * Phase 24
 * 
 * Provides SHA-256 hashing and Merkle tree construction
 * for certification and audit trail integrity.
 */

import { createHash } from 'crypto';
import { CertificationHash, certificationHash } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SHA-256 HASHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute SHA-256 hash of a string
 */
export function sha256(data: string): CertificationHash {
  const hash = createHash('sha256').update(data, 'utf8').digest('hex');
  return certificationHash(hash);
}

/**
 * Compute SHA-256 hash of an object (JSON serialized)
 */
export function hashObject<T>(obj: T): CertificationHash {
  const json = JSON.stringify(obj, Object.keys(obj as object).sort());
  return sha256(json);
}

/**
 * Compute SHA-256 hash of multiple values
 */
export function hashMultiple(...values: string[]): CertificationHash {
  const combined = values.join('|');
  return sha256(combined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE TREE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Merkle tree node
 */
export interface MerkleNode {
  readonly hash: CertificationHash;
  readonly left?: MerkleNode;
  readonly right?: MerkleNode;
  readonly isLeaf: boolean;
  readonly data?: string;
}

/**
 * Merkle tree
 */
export interface MerkleTree {
  readonly root: MerkleNode;
  readonly leaves: ReadonlyArray<MerkleNode>;
  readonly height: number;
  readonly size: number;
}

/**
 * Merkle proof for a leaf
 */
export interface MerkleProof {
  readonly leaf: CertificationHash;
  readonly root: CertificationHash;
  readonly path: ReadonlyArray<{
    hash: CertificationHash;
    position: 'left' | 'right';
  }>;
}

/**
 * Create a leaf node
 */
function createLeafNode(data: string): MerkleNode {
  return {
    hash: sha256(data),
    isLeaf: true,
    data,
  };
}

/**
 * Create an internal node
 */
function createInternalNode(left: MerkleNode, right: MerkleNode): MerkleNode {
  const combinedHash = hashMultiple(left.hash, right.hash);
  return {
    hash: combinedHash,
    left,
    right,
    isLeaf: false,
  };
}

/**
 * Build a Merkle tree from data items
 */
export function buildMerkleTree(items: ReadonlyArray<string>): MerkleTree {
  if (items.length === 0) {
    throw new Error('Cannot build Merkle tree from empty items');
  }

  // Create leaf nodes
  let nodes: MerkleNode[] = items.map(createLeafNode);
  const leaves = [...nodes];
  
  let height = 0;

  // Build tree bottom-up
  while (nodes.length > 1) {
    const nextLevel: MerkleNode[] = [];
    
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] ?? left; // Duplicate if odd
      nextLevel.push(createInternalNode(left, right));
    }
    
    nodes = nextLevel;
    height++;
  }

  return {
    root: nodes[0],
    leaves,
    height,
    size: items.length,
  };
}

/**
 * Get Merkle root from items
 */
export function getMerkleRoot(items: ReadonlyArray<string>): CertificationHash {
  if (items.length === 0) {
    return sha256('EMPTY_MERKLE_ROOT');
  }
  return buildMerkleTree(items).root.hash;
}

/**
 * Generate Merkle proof for a leaf
 */
export function generateMerkleProof(
  tree: MerkleTree,
  leafIndex: number
): MerkleProof {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error(`Invalid leaf index: ${leafIndex}`);
  }

  const leaf = tree.leaves[leafIndex];
  const path: Array<{ hash: CertificationHash; position: 'left' | 'right' }> = [];
  
  // Simplified proof generation for demonstration
  // In production, would traverse actual tree structure
  let nodes = [...tree.leaves] as MerkleNode[];
  let currentIndex = leafIndex;

  while (nodes.length > 1) {
    const nextLevel: MerkleNode[] = [];
    
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] ?? left;
      
      if (i === (currentIndex & ~1)) {
        // This pair contains our node
        if (currentIndex % 2 === 0 && right !== left) {
          path.push({ hash: right.hash, position: 'right' });
        } else if (currentIndex % 2 === 1) {
          path.push({ hash: left.hash, position: 'left' });
        }
      }
      
      nextLevel.push(createInternalNode(left, right));
    }
    
    nodes = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leaf: leaf.hash,
    root: tree.root.hash,
    path,
  };
}

/**
 * Verify a Merkle proof
 */
export function verifyMerkleProof(proof: MerkleProof): boolean {
  let currentHash = proof.leaf;
  
  for (const step of proof.path) {
    if (step.position === 'left') {
      currentHash = hashMultiple(step.hash, currentHash);
    } else {
      currentHash = hashMultiple(currentHash, step.hash);
    }
  }
  
  return currentHash === proof.root;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC HASHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hash invariant for certification
 */
export function hashInvariant(inv: {
  id: string;
  name: string;
  module: string;
  category: string;
  severity: string;
  status: string;
}): CertificationHash {
  return hashObject({
    id: inv.id,
    name: inv.name,
    module: inv.module,
    category: inv.category,
    severity: inv.severity,
    status: inv.status,
  });
}

/**
 * Hash test result for certification
 */
export function hashTestResult(test: {
  id: string;
  name: string;
  module: string;
  status: string;
  duration: number;
}): CertificationHash {
  return hashObject({
    id: test.id,
    name: test.name,
    module: test.module,
    status: test.status,
    duration: test.duration,
  });
}

/**
 * Hash file content
 */
export function hashFile(content: string): CertificationHash {
  return sha256(content);
}

/**
 * Hash multiple files for a module
 */
export function hashModule(files: ReadonlyArray<{ path: string; hash: string }>): CertificationHash {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const combined = sorted.map(f => `${f.path}:${f.hash}`).join('\n');
  return sha256(combined);
}
