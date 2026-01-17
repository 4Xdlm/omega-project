// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — AGGREGATE DNA v1.0.0 — MERKLE TREE
// ═══════════════════════════════════════════════════════════════════════════════
// Arbre de Merkle déterministe pour preuve d'intégrité
// Standard: NASA-Grade L4
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";

/**
 * Hash SHA-256 (64 hex lowercase)
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * JSON canonique avec tri des clés
 */
export function stableStringify(value: unknown): string {
  return _stringify(value);
}

function _stringify(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) throw new Error("stableStringify: undefined not allowed");

  const t = typeof v;

  if (t === "string") return JSON.stringify(v);
  if (t === "boolean") return v ? "true" : "false";

  if (t === "number") {
    if (!Number.isFinite(v as number)) {
      throw new Error(`stableStringify: non-finite number (${v})`);
    }
    return JSON.stringify(v);
  }

  if (Array.isArray(v)) {
    return "[" + v.map(_stringify).join(",") + "]";
  }

  if (t === "object") {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(k => JSON.stringify(k) + ":" + _stringify(obj[k]));
    return "{" + pairs.join(",") + "}";
  }

  throw new Error(`stableStringify: unsupported type ${t}`);
}

/**
 * Hash déterministe d'un objet
 */
export function hashObject(obj: unknown): string {
  return sha256Hex(stableStringify(obj));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE TREE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Constante pour arbre vide
 */
const MERKLE_EMPTY_HASH = sha256Hex("OMEGA_MERKLE_EMPTY_v1");

/**
 * Préfixes pour éviter les collisions (second preimage attacks)
 */
const LEAF_PREFIX = "OMEGA_LEAF:";
const NODE_PREFIX = "OMEGA_NODE:";

/**
 * Calcule le Merkle root d'une liste de hashes
 * 
 * Algorithme:
 * 1. Si vide → hash constant "MERKLE_EMPTY"
 * 2. Chaque feuille est préfixée et hashée
 * 3. Si nombre impair, duplique la dernière feuille
 * 4. Combine par paires jusqu'à obtenir la racine
 * 
 * @param leaves Liste des hashes de feuilles (segment root hashes)
 * @returns Merkle root (64 hex chars)
 */
export function computeMerkleRoot(leaves: readonly string[]): string {
  if (leaves.length === 0) {
    return MERKLE_EMPTY_HASH;
  }

  // Niveau initial: hash des feuilles avec préfixe
  let layer = leaves.map(leaf => sha256Hex(LEAF_PREFIX + leaf));

  // Remonter l'arbre
  while (layer.length > 1) {
    const nextLayer: string[] = [];

    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      // Si impair, duplique le dernier
      const right = (i + 1 < layer.length) ? layer[i + 1] : layer[i];

      // Hash du nœud interne avec préfixe
      const nodeHash = sha256Hex(NODE_PREFIX + left + ":" + right);
      nextLayer.push(nodeHash);
    }

    layer = nextLayer;
  }

  return layer[0];
}

/**
 * Génère une preuve de Merkle pour une feuille donnée
 * 
 * @param leaves Liste complète des feuilles
 * @param leafIndex Index de la feuille à prouver
 * @returns Liste des hashes frères (sibling hashes) avec direction
 */
export function generateMerkleProof(
  leaves: readonly string[],
  leafIndex: number
): MerkleProof {
  if (leaves.length === 0) {
    throw new Error("Cannot generate proof for empty tree");
  }
  if (leafIndex < 0 || leafIndex >= leaves.length) {
    throw new Error(`Invalid leaf index: ${leafIndex}`);
  }

  const proof: MerkleProofStep[] = [];
  let layer = leaves.map(leaf => sha256Hex(LEAF_PREFIX + leaf));
  let idx = leafIndex;

  while (layer.length > 1) {
    const siblingIdx = (idx % 2 === 0) ? idx + 1 : idx - 1;
    const isLeft = idx % 2 === 1; // Notre position est à droite du sibling

    if (siblingIdx < layer.length) {
      proof.push({
        hash: layer[siblingIdx],
        position: isLeft ? "left" : "right",
      });
    } else {
      // Cas impair: on se duplique, donc le sibling est nous-même
      proof.push({
        hash: layer[idx],
        position: "right",
      });
    }

    // Remonter d'un niveau
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = (i + 1 < layer.length) ? layer[i + 1] : layer[i];
      nextLayer.push(sha256Hex(NODE_PREFIX + left + ":" + right));
    }

    layer = nextLayer;
    idx = Math.floor(idx / 2);
  }

  return {
    leafHash: sha256Hex(LEAF_PREFIX + leaves[leafIndex]),
    leafIndex,
    proof,
    root: layer[0],
  };
}

/**
 * Vérifie une preuve de Merkle
 */
export function verifyMerkleProof(
  leafValue: string,
  proof: MerkleProof
): boolean {
  let current = sha256Hex(LEAF_PREFIX + leafValue);

  if (current !== proof.leafHash) {
    return false;
  }

  for (const step of proof.proof) {
    if (step.position === "left") {
      current = sha256Hex(NODE_PREFIX + step.hash + ":" + current);
    } else {
      current = sha256Hex(NODE_PREFIX + current + ":" + step.hash);
    }
  }

  return current === proof.root;
}

/**
 * Structure d'une étape de preuve
 */
export interface MerkleProofStep {
  hash: string;
  position: "left" | "right";
}

/**
 * Structure complète d'une preuve de Merkle
 */
export interface MerkleProof {
  leafHash: string;
  leafIndex: number;
  proof: readonly MerkleProofStep[];
  root: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS INLINE
// ═══════════════════════════════════════════════════════════════════════════════

export function selfTest(): boolean {
  // Test arbre vide
  const emptyRoot = computeMerkleRoot([]);
  if (emptyRoot.length !== 64) {
    console.error("FAIL: empty tree root length");
    return false;
  }

  // Test single leaf
  const singleRoot = computeMerkleRoot(["a".repeat(64)]);
  if (singleRoot.length !== 64) {
    console.error("FAIL: single leaf root length");
    return false;
  }

  // Test déterminisme
  const leaves = ["hash1", "hash2", "hash3"];
  const root1 = computeMerkleRoot(leaves);
  const root2 = computeMerkleRoot(leaves);
  if (root1 !== root2) {
    console.error("FAIL: merkle not deterministic");
    return false;
  }

  // Test ordre sensible
  const rootReversed = computeMerkleRoot(["hash3", "hash2", "hash1"]);
  if (root1 === rootReversed) {
    console.error("FAIL: merkle should be order-sensitive");
    return false;
  }

  // Test proof/verify
  const proof = generateMerkleProof(leaves, 1);
  if (!verifyMerkleProof("hash2", proof)) {
    console.error("FAIL: merkle proof verification");
    return false;
  }

  // Test proof avec mauvaise valeur
  if (verifyMerkleProof("wrong", proof)) {
    console.error("FAIL: should reject wrong leaf value");
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  sha256Hex,
  stableStringify,
  hashObject,
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  selfTest,
};
