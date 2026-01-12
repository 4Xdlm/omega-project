/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Hash Manager
 * Parsing, canonicalisation RFC 8785 et hashing SHA-256
 * 
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / RFC 8785 (JCS)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import YAML from 'yaml';
import canonicalize from 'canonicalize';

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL PATH MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mapping des types vers leurs chemins canoniques
 */
const TYPE_PATHS = {
  // LEDGER
  ENT:      'nexus/ledger/entities',
  EVT:      'nexus/ledger/events',
  LINK:     'nexus/ledger/links',
  REG:      'nexus/ledger/registry',
  
  // RAW
  SES:      'nexus/raw/sessions',
  TESTLOG:  'nexus/raw/logs/tests',
  BUILDLOG: 'nexus/raw/logs/build',
  COV:      'nexus/raw/reports/coverage',
  
  // PROOF
  SEAL:     'nexus/proof/seals',
  STATE:    'nexus/proof/states',
  COMP:     'nexus/proof/completeness',
  CERT:     'nexus/proof/certificates',
  MANIFEST: 'nexus/proof/snapshots/manifests'
};

/**
 * Extensions par type
 */
const TYPE_EXTENSIONS = {
  // YAML
  ENT: '.yaml',
  EVT: '.yaml',
  LINK: '.yaml',
  REG: '.yaml',
  SEAL: '.yaml',
  STATE: '.json',
  COMP: '.yaml',
  CERT: '.yaml',
  
  // JSON
  TESTLOG: '.json',
  COV: '.json',
  MANIFEST: '.json',
  
  // JSONL
  SES: '.jsonl',
  
  // TXT
  BUILDLOG: '.txt'
};

/**
 * Obtenir le chemin canonique pour un ID
 * @param {string} id - ID au format TYPE-YYYYMMDD-NNNN
 * @param {string} [baseDir] - Répertoire de base
 * @returns {string} Chemin complet
 */
export function getCanonicalPath(id, baseDir = '.') {
  const match = id.match(/^([A-Z]+)-(\d{8})-(\d{4})$/);
  if (!match) {
    throw new Error(`Invalid ID format: ${id}. Expected TYPE-YYYYMMDD-NNNN`);
  }
  
  const type = match[1];
  const basePath = TYPE_PATHS[type];
  const ext = TYPE_EXTENSIONS[type];
  
  if (!basePath) {
    throw new Error(`Unknown type: ${type}. No canonical path defined.`);
  }
  
  if (!ext) {
    throw new Error(`Unknown extension for type: ${type}.`);
  }
  
  return join(baseDir, basePath, `${id}${ext}`);
}

/**
 * Obtenir l'extension pour un type
 * @param {string} type - Type d'entité
 * @returns {string} Extension avec le point
 */
export function getExtensionForType(type) {
  const ext = TYPE_EXTENSIONS[type];
  if (!ext) {
    throw new Error(`Unknown type: ${type}.`);
  }
  return ext;
}

/**
 * Obtenir le répertoire de base pour un type
 * @param {string} type - Type d'entité
 * @returns {string} Chemin relatif du répertoire
 */
export function getBasePathForType(type) {
  const path = TYPE_PATHS[type];
  if (!path) {
    throw new Error(`Unknown type: ${type}.`);
  }
  return path;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extensions YAML
 */
const YAML_EXTENSIONS = ['.yaml', '.yml'];

/**
 * Extensions JSON
 */
const JSON_EXTENSIONS = ['.json'];

/**
 * Extensions JSONL
 */
const JSONL_EXTENSIONS = ['.jsonl'];

/**
 * Extensions direct (texte brut)
 */
const DIRECT_EXTENSIONS = ['.md', '.txt', '.ps1', '.sh', '.js', '.ts', '.mjs'];

/**
 * Parser un fichier selon son extension
 * @param {string} filepath - Chemin du fichier
 * @returns {any} Contenu parsé
 */
export function parseFile(filepath) {
  if (!existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}`);
  }
  
  const ext = extname(filepath).toLowerCase();
  const content = readFileSync(filepath, 'utf8');
  
  if (YAML_EXTENSIONS.includes(ext)) {
    return parseYAML(content);
  }
  
  if (JSON_EXTENSIONS.includes(ext)) {
    return parseJSON(content);
  }
  
  if (JSONL_EXTENSIONS.includes(ext)) {
    return parseJSONL(content);
  }
  
  if (DIRECT_EXTENSIONS.includes(ext)) {
    // Pour les fichiers texte, retourner directement le contenu
    return content;
  }
  
  // Extension inconnue, tenter JSON puis YAML puis direct
  try {
    return parseJSON(content);
  } catch {
    try {
      return parseYAML(content);
    } catch {
      return content;
    }
  }
}

/**
 * Parser du YAML
 * @param {string} content - Contenu YAML
 * @returns {any}
 */
export function parseYAML(content) {
  return YAML.parse(content);
}

/**
 * Parser du JSON
 * @param {string} content - Contenu JSON
 * @returns {any}
 */
export function parseJSON(content) {
  return JSON.parse(content);
}

/**
 * Parser du JSONL (JSON Lines)
 * @param {string} content - Contenu JSONL
 * @returns {any[]} Array d'objets
 */
export function parseJSONL(content) {
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

/**
 * Déterminer le type de parsing pour un fichier
 * @param {string} filepath - Chemin du fichier
 * @returns {'yaml'|'json'|'jsonl'|'direct'}
 */
export function getParseType(filepath) {
  const ext = extname(filepath).toLowerCase();
  
  if (YAML_EXTENSIONS.includes(ext)) return 'yaml';
  if (JSON_EXTENSIONS.includes(ext)) return 'json';
  if (JSONL_EXTENSIONS.includes(ext)) return 'jsonl';
  return 'direct';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICALIZATION (RFC 8785)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canonicaliser un objet selon RFC 8785 (JCS)
 * @param {any} obj - Objet à canonicaliser
 * @returns {string} JSON canonicalisé
 */
export function canonicalizeObject(obj) {
  if (obj === null || obj === undefined) {
    return 'null';
  }
  
  if (typeof obj === 'string') {
    // Les strings sont retournés tels quels pour le hashing direct
    return obj;
  }
  
  // Utiliser la bibliothèque canonicalize pour RFC 8785
  return canonicalize(obj);
}

/**
 * Canonicaliser le contenu d'un fichier
 * @param {string} filepath - Chemin du fichier
 * @returns {string} Contenu canonicalisé
 */
export function canonicalizeFile(filepath) {
  const parsed = parseFile(filepath);
  return canonicalizeObject(parsed);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculer le hash SHA-256 d'une string
 * @param {string} content - Contenu à hasher
 * @returns {string} Hash au format sha256:xxxx
 */
export function computeHash(content) {
  const hash = createHash('sha256');
  hash.update(content, 'utf8');
  return `sha256:${hash.digest('hex')}`;
}

/**
 * Calculer le hash SHA-256 d'un Buffer
 * @param {Buffer} buffer - Buffer à hasher
 * @returns {string} Hash au format sha256:xxxx
 */
export function computeHashBuffer(buffer) {
  const hash = createHash('sha256');
  hash.update(buffer);
  return `sha256:${hash.digest('hex')}`;
}

/**
 * Calculer le hash d'un fichier (canonicalisé selon extension)
 * @param {string} filepath - Chemin du fichier
 * @returns {string} Hash au format sha256:xxxx
 */
export function computeFileHash(filepath) {
  const canonicalized = canonicalizeFile(filepath);
  return computeHash(canonicalized);
}

/**
 * Calculer le hash brut d'un fichier (sans canonicalisation)
 * @param {string} filepath - Chemin du fichier
 * @returns {string} Hash au format sha256:xxxx
 */
export function computeRawFileHash(filepath) {
  const content = readFileSync(filepath, 'utf8');
  return computeHash(content);
}

/**
 * Vérifier si un hash est valide (format)
 * @param {string} hash - Hash à vérifier
 * @returns {boolean}
 */
export function isValidHash(hash) {
  return /^sha256:[a-f0-9]{64}$/.test(hash);
}

/**
 * Extraire la partie hexadécimale d'un hash
 * @param {string} hash - Hash au format sha256:xxxx
 * @returns {string} Partie hexadécimale
 */
export function extractHashHex(hash) {
  if (!isValidHash(hash)) {
    throw new Error(`Invalid hash format: ${hash}`);
  }
  return hash.substring(7);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifier l'intégrité d'un fichier
 * @param {string} filepath - Chemin du fichier
 * @param {string} expectedHash - Hash attendu
 * @returns {boolean}
 */
export function verifyFileHash(filepath, expectedHash) {
  if (!existsSync(filepath)) {
    return false;
  }
  
  const actualHash = computeFileHash(filepath);
  return actualHash === expectedHash;
}

/**
 * Comparer deux hashes
 * @param {string} hash1 - Premier hash
 * @param {string} hash2 - Second hash
 * @returns {boolean}
 */
export function compareHashes(hash1, hash2) {
  // Normaliser les deux hashes
  const h1 = hash1.toLowerCase();
  const h2 = hash2.toLowerCase();
  return h1 === h2;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Canonical paths
  getCanonicalPath,
  getExtensionForType,
  getBasePathForType,
  TYPE_PATHS,
  TYPE_EXTENSIONS,
  
  // Parsing
  parseFile,
  parseYAML,
  parseJSON,
  parseJSONL,
  getParseType,
  
  // Canonicalization
  canonicalizeObject,
  canonicalizeFile,
  
  // Hashing
  computeHash,
  computeHashBuffer,
  computeFileHash,
  computeRawFileHash,
  isValidHash,
  extractHashHex,
  
  // Verification
  verifyFileHash,
  compareHashes
};
