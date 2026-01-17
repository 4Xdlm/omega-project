// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MERKLE PROOF ENGINE v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Arbre de Merkle pour preuve d'intégrité déterministe
// Garantie: même nœuds → même rootHash à 100%
// ═══════════════════════════════════════════════════════════════════════════════

import { MyceliumNode, IntensityRecord14 } from "./types.js";
import { canonicalStringify, canonicalHashSync } from "./canonical_json.js";
import { createNeutralRecord } from "./emotion_field.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MerkleLeaf {
  index: number;
  hash: string;
}

export interface MerkleProof {
  leafIndex: number;
  leafHash: string;
  siblings: string[];
  root: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION DONNÉES HASHABLES
// ─────────────────────────────════════════════════════════════════════════════

/**
 * Extrait les données hashables d'un nœud (sans métadonnées volatiles)
 * 
 * EXCLUS du hash:
 * - nodeHash (c'est ce qu'on calcule)
 * - tout timestamp
 * - tout ID machine
 */
function extractHashableData(node: MyceliumNode): Record<string, unknown> {
  // Créer un objet avec seulement les données stables
  return {
    id: node.id,
    kind: node.kind,
    level: node.level,
    parentId: node.parentId ?? null,
    gematriaSum: node.gematriaSum,
    branchWeight: roundToFixed(node.branchWeight, 6),
    thickness: roundToFixed(node.thickness, 6),
    emotionDominant: node.emotionDominant,
    emotionIntensity: roundToFixed(node.emotionIntensity, 6),
    oxygen: roundToFixed(node.oxygen, 6),
    direction: {
      x: roundToFixed(node.direction.x, 6),
      y: roundToFixed(node.direction.y, 6),
      z: roundToFixed(node.direction.z, 6)
    },
    color: {
      h: roundToFixed(node.color.h, 2),
      s: roundToFixed(node.color.s, 6),
      l: roundToFixed(node.color.l, 6)
    },
    markers: node.markers.map(m => ({
      type: m.type,
      reason: m.reason,
      strength: roundToFixed(m.strength, 6),
      sentenceIndex: m.sentenceIndex
      // hashRef exclu car dépend du calcul
    })),
    sentenceIndex: node.sentenceIndex ?? null,
    wordIndex: node.wordIndex ?? null,
    // Intensités normalisées (14D)
    normalizedIntensities: Object.fromEntries(
      Object.entries(node.emotionField.normalizedIntensities)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, roundToFixed(v as number, 8)])
    )
  };
}

/**
 * Arrondit à un nombre fixe de décimales (pour déterminisme)
 */
function roundToFixed(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ─────────────────────────────────────────────────────────────────────────────
// HASH NŒUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le hash d'un nœud (leaf hash pour Merkle)
 */
export function computeNodeHash(node: MyceliumNode): string {
  const hashable = extractHashableData(node);
  const canonical = canonicalStringify(hashable);
  return canonicalHashSync(canonical);
}

/**
 * Met à jour le nodeHash d'un nœud
 */
export function updateNodeHash(node: MyceliumNode): MyceliumNode {
  return {
    ...node,
    nodeHash: computeNodeHash(node)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MERKLE TREE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Combine deux hashes pour le niveau suivant
 * Utilise l'ordre lexicographique pour le déterminisme
 */
function combineHashes(left: string, right: string): string {
  // Ordre déterministe: le plus petit en premier
  const ordered = left < right ? [left, right] : [right, left];
  return canonicalHashSync(ordered.join(""));
}

/**
 * Construit l'arbre de Merkle et retourne la racine
 * 
 * Algorithme:
 * 1. Créer les feuilles (hash de chaque nœud)
 * 2. Si nombre impair, dupliquer la dernière feuille
 * 3. Combiner par paires jusqu'à obtenir une racine
 */
export function computeMerkleRoot(nodes: readonly MyceliumNode[]): string {
  if (nodes.length === 0) {
    // Hash vide pour liste vide
    return canonicalHashSync("EMPTY_TREE");
  }

  // 1. Extraire les hashes des feuilles
  let level: string[] = nodes.map(n => n.nodeHash || computeNodeHash(n));

  // 2. Construire l'arbre niveau par niveau
  while (level.length > 1) {
    const nextLevel: string[] = [];

    // Si nombre impair, dupliquer le dernier
    if (level.length % 2 === 1) {
      level.push(level[level.length - 1]);
    }

    // Combiner par paires
    for (let i = 0; i < level.length; i += 2) {
      nextLevel.push(combineHashes(level[i], level[i + 1]));
    }

    level = nextLevel;
  }

  return level[0];
}

/**
 * Génère les feuilles Merkle
 */
export function generateMerkleLeaves(nodes: readonly MyceliumNode[]): MerkleLeaf[] {
  return nodes.map((node, index) => ({
    index,
    hash: node.nodeHash || computeNodeHash(node)
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// VÉRIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie qu'un nœud fait partie de l'arbre (proof of inclusion)
 */
export function verifyMerkleProof(proof: MerkleProof): boolean {
  let currentHash = proof.leafHash;

  for (const sibling of proof.siblings) {
    currentHash = combineHashes(currentHash, sibling);
  }

  return currentHash === proof.root;
}

/**
 * Génère une preuve d'inclusion pour un nœud
 */
export function generateMerkleProof(
  nodes: readonly MyceliumNode[],
  leafIndex: number
): MerkleProof | null {
  if (leafIndex < 0 || leafIndex >= nodes.length) {
    return null;
  }

  if (nodes.length === 0) {
    return null;
  }

  // Construire l'arbre complet avec suivi des siblings
  let level: string[] = nodes.map(n => n.nodeHash || computeNodeHash(n));
  const siblings: string[] = [];
  let currentIndex = leafIndex;
  const leafHash = level[leafIndex];

  while (level.length > 1) {
    // Padding si impair
    if (level.length % 2 === 1) {
      level.push(level[level.length - 1]);
    }

    // Trouver le sibling
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    siblings.push(level[siblingIndex]);

    // Niveau suivant
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      nextLevel.push(combineHashes(level[i], level[i + 1]));
    }

    currentIndex = Math.floor(currentIndex / 2);
    level = nextLevel;
  }

  return {
    leafIndex,
    leafHash,
    siblings,
    root: level[0]
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTÉGRITÉ
// ─────────────────────────────────────────────════════════════════════════════

/**
 * Vérifie l'intégrité de tous les nœuds
 * Retourne les indices des nœuds corrompus
 */
export function verifyIntegrity(nodes: readonly MyceliumNode[]): {
  valid: boolean;
  corrupted: number[];
} {
  const corrupted: number[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const computedHash = computeNodeHash(node);

    if (node.nodeHash && node.nodeHash !== computedHash) {
      corrupted.push(i);
    }
  }

  return {
    valid: corrupted.length === 0,
    corrupted
  };
}

/**
 * Recalcule tous les nodeHash
 */
export function recomputeAllHashes(nodes: MyceliumNode[]): MyceliumNode[] {
  return nodes.map(updateNodeHash);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS INLINE
// ─────────────────────────────────────────────────────────────────────────────

export function selfTest(): boolean {
  // Créer des nœuds mock
  const mockNodes: MyceliumNode[] = [];

  for (let i = 0; i < 4; i++) {
    const mockIntensities: IntensityRecord14 = {
      joy: 1/14, fear: 1/14, anger: 1/14, sadness: 1/14,
      surprise: 1/14, disgust: 1/14, trust: 1/14, anticipation: 1/14,
      love: 1/14, guilt: 1/14, shame: 1/14, pride: 1/14,
      hope: 1/14, despair: 1/14
    };

    mockNodes.push({
      id: `node-${i}`,
      kind: "sentence",
      level: 2,
      gematriaSum: 100 + i * 10,
      branchWeight: 2.5,
      thickness: 0.5,
      emotionField: {
        states: createNeutralRecord(),
        normalizedIntensities: mockIntensities,
        dominant: "joy",
        peak: 0.3,
        totalEnergy: 5,
        entropy: 0.9,
        contrast: 0.2,
        inertia: 0.4,
        conservationDelta: 0.01
      },
      emotionDominant: "joy",
      emotionIntensity: 0.5,
      oxygen: 0.6,
      direction: { x: 0, y: 1, z: 0 },
      color: { h: 50, s: 0.7, l: 0.6 },
      markers: [],
      sentenceIndex: i,
      nodeHash: ""
    });
  }

  // Calculer les hashes
  const nodesWithHash = recomputeAllHashes(mockNodes);

  // Test déterminisme des hashes
  const hash0_a = computeNodeHash(mockNodes[0]);
  const hash0_b = computeNodeHash(mockNodes[0]);
  if (hash0_a !== hash0_b) {
    console.error("FAIL: Node hash not deterministic");
    return false;
  }

  // Test Merkle root déterminisme
  const root1 = computeMerkleRoot(nodesWithHash);
  const root2 = computeMerkleRoot(nodesWithHash);
  if (root1 !== root2) {
    console.error("FAIL: Merkle root not deterministic");
    return false;
  }

  // Test format hash (64 hex chars)
  if (!/^[a-f0-9]{64}$/.test(root1)) {
    console.error("FAIL: Merkle root not 64 hex chars:", root1);
    return false;
  }

  // Test preuve d'inclusion
  const proof = generateMerkleProof(nodesWithHash, 0);
  if (!proof) {
    console.error("FAIL: Could not generate proof");
    return false;
  }
  if (!verifyMerkleProof(proof)) {
    console.error("FAIL: Proof verification failed");
    return false;
  }

  // Test intégrité
  const integrity = verifyIntegrity(nodesWithHash);
  if (!integrity.valid) {
    console.error("FAIL: Integrity check failed:", integrity.corrupted);
    return false;
  }

  // Test modification détectée
  const corruptedNodes = [...nodesWithHash];
  corruptedNodes[0] = { ...corruptedNodes[0], oxygen: 0.99 };
  const corruptCheck = verifyIntegrity(corruptedNodes);
  if (corruptCheck.valid) {
    console.error("FAIL: Corruption not detected");
    return false;
  }

  // Test arbre vide
  const emptyRoot = computeMerkleRoot([]);
  if (!emptyRoot || emptyRoot.length !== 64) {
    console.error("FAIL: Empty tree hash invalid");
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  computeNodeHash,
  updateNodeHash,
  computeMerkleRoot,
  generateMerkleLeaves,
  verifyMerkleProof,
  generateMerkleProof,
  verifyIntegrity,
  recomputeAllHashes,
  selfTest
};
