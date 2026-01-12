/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Merkle Tree Manager
 * Calcul du root_hash avec domain separation et path binding
 *
 * Version: 1.0.1 (PATCHED - cross-platform path normalization)
 * Standard: NASA-Grade L4 / RFC 8785
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'node:crypto';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { computeFileHash } from './hash.js';

// ═══════════════════════════════════════════════════════════════════════════════════════
// DOMAIN SEPARATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Préfixe pour les feuilles (leaf nodes)
 * Format: "omega:leaf\0" suivi du chemin et du hash
 */
export const LEAF_PREFIX = Buffer.from('omega:leaf\0', 'utf8');

/**
 * Préfixe pour les noeuds internes
 * Format: "omega:node\0" suivi des hash enfants
 */
export const NODE_PREFIX = Buffer.from('omega:node\0', 'utf8');

// ═══════════════════════════════════════════════════════════════════════════════════════
// SCOPE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Répertoires inclus dans le scope Merkle
 */
const INCLUDED_DIRS = [
  'nexus/genesis',
  'nexus/ledger/entities',
  'nexus/ledger/events',
  'nexus/ledger/links',
  // 'nexus/ledger/registry', // EXCLUDED: mutable during seal
  'nexus/proof/states',
  'nexus/proof/completeness',
  'nexus/proof/certificates',
  'nexus/proof/seals',
  'nexus/proof/snapshots/manifests'
];

/**
 * Patterns à exclure
 */
const EXCLUDED_PATTERNS = [
  /LOCK-\d{8}\.json$/,   // Lock files
  /\.DS_Store$/,          // macOS
  /Thumbs\.db$/,          // Windows
  /\.git\//               // Git
];

// ═══════════════════════════════════════════════════════════════════════════════════════
// PATH NORMALIZATION (PATCH v1.0.1)
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Normaliser un chemin vers forward slashes (cross-platform)
 * @param {string} path - Chemin à normaliser
 * @returns {string} Chemin normalisé avec /
 */
function normalizePath(path) {
  return path.replace(/\\/g, '/');
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// FILE COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Collecter récursivement les fichiers d'un répertoire
 * @param {string} dir - Répertoire
 * @param {string} baseDir - Répertoire de base pour les chemins relatifs
 * @returns {string[]} Liste des chemins relatifs
 */
function collectFilesRecursive(dir, baseDir) {
  const files = [];

  if (!existsSync(dir)) {
    return files;
  }

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    // Vérifier les exclusions
    if (EXCLUDED_PATTERNS.some(pattern => pattern.test(relativePath))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectFilesRecursive(fullPath, baseDir));
    } else if (entry.isFile()) {
      // PATCH: Normaliser le chemin
      files.push(normalizePath(relativePath));
    }
  }

  return files;
}

/**
 * Obtenir tous les fichiers dans le scope du Merkle tree
 * @param {string} baseDir - Répertoire de base
 * @param {string[]} [excludeFiles] - Fichiers à exclure (chemins relatifs)
 * @returns {string[]} Liste triée des chemins relatifs
 */
export function getFilesInScope(baseDir, excludeFiles = []) {
  const allFiles = [];

  for (const dir of INCLUDED_DIRS) {
    const fullDir = join(baseDir, dir);
    allFiles.push(...collectFilesRecursive(fullDir, baseDir));
  }

  // Filtrer les fichiers exclus (normaliser pour comparaison)
  const excludeSet = new Set(excludeFiles.map(f => normalizePath(f)));
  const filtered = allFiles.filter(f => !excludeSet.has(normalizePath(f)));

  // Trier lexicographiquement (important pour le déterminisme)
  return filtered.sort();
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Calculer le hash d'une feuille avec path binding
 * @param {string} path - Chemin relatif du fichier
 * @param {string} fileHash - Hash du fichier (sha256:xxx)
 * @returns {Buffer} Hash de la feuille (32 bytes)
 */
export function computeLeafHash(path, fileHash) {
  const hash = createHash('sha256');

  // PATCH: Normaliser le chemin avant hashing
  const normalizedPath = normalizePath(path);

  // Domain separation: préfixe + chemin + contenu hash
  hash.update(LEAF_PREFIX);
  hash.update(normalizedPath, 'utf8');
  hash.update('\0', 'utf8');
  hash.update(fileHash, 'utf8');

  return hash.digest();
}

/**
 * Calculer le hash d'un noeud interne
 * @param {Buffer} left - Hash enfant gauche (32 bytes)
 * @param {Buffer} right - Hash enfant droit (32 bytes)
 * @returns {Buffer} Hash du noeud (32 bytes)
 */
export function computeNodeHash(left, right) {
  const hash = createHash('sha256');

  // Domain separation: préfixe + enfants
  hash.update(NODE_PREFIX);
  hash.update(left);
  hash.update(right);

  return hash.digest();
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// MERKLE TREE CONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Construire le Merkle tree à partir d'une liste de hashes de feuilles
 * @param {Buffer[]} leafHashes - Hashes des feuilles
 * @returns {Buffer} Root hash
 */
function buildTree(leafHashes) {
  if (leafHashes.length === 0) {
    // Arbre vide: hash d'une chaîne vide avec domain separation
    const hash = createHash('sha256');
    hash.update(NODE_PREFIX);
    hash.update('empty', 'utf8');
    return hash.digest();
  }

  if (leafHashes.length === 1) {
    // Un seul élément: c'est la racine
    return leafHashes[0];
  }

  // Construire les niveaux jusqu'à la racine
  let level = [...leafHashes];

  while (level.length > 1) {
    const nextLevel = [];

    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        // Paire complète
        nextLevel.push(computeNodeHash(level[i], level[i + 1]));
      } else {
        // Noeud impair: le promouvoir au niveau suivant
        // (ou le combiner avec lui-même selon la variante)
        nextLevel.push(computeNodeHash(level[i], level[i]));
      }
    }

    level = nextLevel;
  }

  return level[0];
}

/**
 * Construire le root hash du Merkle tree
 * @param {string[]} files - Liste des fichiers (chemins relatifs, triés)
 * @param {string} baseDir - Répertoire de base
 * @returns {string} Root hash au format sha256:xxx
 */
export function buildMerkleRoot(files, baseDir) {
  // Calculer les hashes des fichiers et construire les feuilles
  const leafHashes = [];

  for (const file of files) {
    const fullPath = join(baseDir, file);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${file}`);
    }

    const fileHash = computeFileHash(fullPath);
    // PATCH: Normaliser le chemin
    const normalizedFile = normalizePath(file);
    const leafHash = computeLeafHash(normalizedFile, fileHash);
    leafHashes.push(leafHash);
  }

  // Construire l'arbre
  const rootBuffer = buildTree(leafHashes);

  // Formater le résultat
  return `sha256:${rootBuffer.toString('hex')}`;
}

/**
 * Construire le root hash avec les hashes pré-calculés
 * @param {Object<string, string>} fileHashes - Map filepath -> hash
 * @returns {string} Root hash au format sha256:xxx
 */
export function buildMerkleRootFromHashes(fileHashes) {
  // PATCH: Normaliser les chemins vers forward slashes pour cohérence cross-platform
  const normalizedHashes = {};
  for (const [path, hash] of Object.entries(fileHashes)) {
    const normalizedPath = normalizePath(path);
    normalizedHashes[normalizedPath] = hash;
  }
  
  // Trier les fichiers lexicographiquement
  const sortedFiles = Object.keys(normalizedHashes).sort();

  const leafHashes = [];

  for (const file of sortedFiles) {
    const leafHash = computeLeafHash(file, normalizedHashes[file]);
    leafHashes.push(leafHash);
  }

  const rootBuffer = buildTree(leafHashes);
  return `sha256:${rootBuffer.toString('hex')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Vérifier que le root hash est reproductible
 * @param {string} expectedRootHash - Hash attendu
 * @param {string[]} files - Liste des fichiers
 * @param {string} baseDir - Répertoire de base
 * @returns {object} { valid: boolean, computed: string, expected: string }
 */
export function verifyMerkleRoot(expectedRootHash, files, baseDir) {
  const computed = buildMerkleRoot(files, baseDir);

  return {
    valid: computed === expectedRootHash,
    computed: computed,
    expected: expectedRootHash
  };
}

/**
 * Identifier les fichiers modifiés
 * @param {Object<string, string>} expectedHashes - Hashes attendus
 * @param {string} baseDir - Répertoire de base
 * @returns {object} { modified: string[], missing: string[], extra: string[] }
 */
export function identifyChanges(expectedHashes, baseDir) {
  const currentFiles = getFilesInScope(baseDir);
  // PATCH: Normaliser les clés attendues
  const expectedFiles = Object.keys(expectedHashes).map(f => normalizePath(f));

  const modified = [];
  const missing = [];
  const extra = [];

  // Vérifier les fichiers attendus
  for (const file of expectedFiles) {
    const fullPath = join(baseDir, file);

    if (!existsSync(fullPath)) {
      missing.push(file);
    } else {
      const currentHash = computeFileHash(fullPath);
      const expectedHash = expectedHashes[file] || expectedHashes[file.replace(/\//g, '\\')];
      if (currentHash !== expectedHash) {
        modified.push(file);
      }
    }
  }

  // Trouver les fichiers supplémentaires
  const expectedSet = new Set(expectedFiles);
  for (const file of currentFiles) {
    const normalizedFile = normalizePath(file);
    if (!expectedSet.has(normalizedFile)) {
      extra.push(file);
    }
  }

  return { modified, missing, extra };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════════════

export default {
  // Constants
  LEAF_PREFIX,
  NODE_PREFIX,

  // File collection
  getFilesInScope,

  // Hash computation
  computeLeafHash,
  computeNodeHash,

  // Tree construction
  buildMerkleRoot,
  buildMerkleRootFromHashes,

  // Verification
  verifyMerkleRoot,
  identifyChanges
};
