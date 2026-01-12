/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Registry Manager
 * Gestion du registre, locks et génération d'IDs
 * 
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / RFC 8785
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hostname } from 'node:os';
import YAML from 'yaml';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  LOCK_STALE_TIMEOUT_MS: 60000, // 60 seconds
  LOCK_RETRY_MAX: 10,
  LOCK_RETRY_DELAY_MS: 100,
  REGISTRY_DIR: 'nexus/ledger/registry'
};

// ═══════════════════════════════════════════════════════════════════════════════
// INJECTABLE CLOCK (pour déterminisme)
// ═══════════════════════════════════════════════════════════════════════════════

let _clockOverride = null;

/**
 * Définir une horloge fixe pour les tests
 * @param {Date|null} date - Date fixe ou null pour utiliser l'horloge système
 */
export function setClockOverride(date) {
  _clockOverride = date;
}

/**
 * Obtenir le timestamp actuel (injectable)
 * @returns {Date}
 */
function getNow() {
  return _clockOverride || new Date();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE & TIMESTAMP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtenir la date au format YYYYMMDD en UTC
 * @param {Date} [date] - Date optionnelle (défaut: maintenant)
 * @returns {string} YYYYMMDD
 */
export function getDate(date = getNow()) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Obtenir le timestamp ISO 8601 UTC
 * @param {Date} [date] - Date optionnelle (défaut: maintenant)
 * @returns {string} ISO 8601 avec Z
 */
export function getTimestamp(date = getNow()) {
  const d = new Date(date);
  // Format: YYYY-MM-DDTHH:MM:SSZ (sans millisecondes)
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtenir le chemin du fichier lock
 * @param {string} date - YYYYMMDD
 * @param {string} [baseDir] - Répertoire de base
 * @returns {string}
 */
export function getLockPath(date, baseDir = '.') {
  return join(baseDir, CONFIG.REGISTRY_DIR, `LOCK-${date}.json`);
}

/**
 * Vérifier si un lock est périmé
 * @param {object} lockData - Contenu du lock
 * @returns {boolean}
 */
function isLockStale(lockData) {
  if (!lockData || !lockData.timestamp) return true;
  const lockTime = new Date(lockData.timestamp).getTime();
  const now = getNow().getTime();
  return (now - lockTime) > CONFIG.LOCK_STALE_TIMEOUT_MS;
}

/**
 * Acquérir un lock pour une date donnée
 * @param {string} date - YYYYMMDD
 * @param {string} [baseDir] - Répertoire de base
 * @param {string} [purpose] - Raison du lock
 * @returns {Promise<boolean>} true si lock acquis
 */
export async function acquireLock(date, baseDir = '.', purpose = 'seal') {
  const lockPath = getLockPath(date, baseDir);
  const lockDir = dirname(lockPath);
  
  // Créer le répertoire si nécessaire
  if (!existsSync(lockDir)) {
    mkdirSync(lockDir, { recursive: true });
  }
  
  for (let attempt = 0; attempt < CONFIG.LOCK_RETRY_MAX; attempt++) {
    // Vérifier si un lock existe
    if (existsSync(lockPath)) {
      try {
        const existingLock = JSON.parse(readFileSync(lockPath, 'utf8'));
        
        // Si le lock est périmé, le supprimer
        if (isLockStale(existingLock)) {
          unlinkSync(lockPath);
        } else {
          // Lock actif, attendre et réessayer
          await sleep(CONFIG.LOCK_RETRY_DELAY_MS);
          continue;
        }
      } catch {
        // Fichier corrompu, le supprimer
        try { unlinkSync(lockPath); } catch { /* ignore */ }
      }
    }
    
    // Créer le lock
    const lockData = {
      timestamp: getTimestamp(),
      pid: process.pid,
      hostname: hostname(),
      user: process.env.USER || process.env.USERNAME || 'unknown',
      purpose: purpose
    };
    
    try {
      // Écriture atomique (le flag 'wx' échoue si le fichier existe)
      writeFileSync(lockPath, JSON.stringify(lockData, null, 2), { flag: 'wx' });
      return true;
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Un autre processus a créé le lock entre temps
        await sleep(CONFIG.LOCK_RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
  }
  
  return false;
}

/**
 * Libérer un lock
 * @param {string} date - YYYYMMDD
 * @param {string} [baseDir] - Répertoire de base
 * @returns {boolean} true si lock libéré
 */
export function releaseLock(date, baseDir = '.') {
  const lockPath = getLockPath(date, baseDir);
  
  if (existsSync(lockPath)) {
    try {
      unlinkSync(lockPath);
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Vérifier si un lock existe et est actif
 * @param {string} date - YYYYMMDD
 * @param {string} [baseDir] - Répertoire de base
 * @returns {object|null} Données du lock ou null
 */
export function checkLock(date, baseDir = '.') {
  const lockPath = getLockPath(date, baseDir);
  
  if (!existsSync(lockPath)) {
    return null;
  }
  
  try {
    const lockData = JSON.parse(readFileSync(lockPath, 'utf8'));
    if (isLockStale(lockData)) {
      return null;
    }
    return lockData;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtenir le chemin du fichier registry
 * @param {string} date - YYYYMMDD
 * @param {string} [baseDir] - Répertoire de base
 * @returns {string}
 */
export function getRegistryPath(date, baseDir = '.') {
  return join(baseDir, CONFIG.REGISTRY_DIR, `REG-${date}.yaml`);
}

/**
 * Créer un registry vide
 * @param {string} date - YYYYMMDD
 * @returns {object}
 */
function createEmptyRegistry(date) {
  return {
    id: `REG-${date}`,
    date: date,
    created: getTimestamp(),
    counters: {
      ENT: 0,
      EVT: 0,
      LINK: 0,
      SES: 0,
      SEAL: 0,
      STATE: 0,
      COMP: 0,
      CERT: 0,
      MANIFEST: 0,
      TESTLOG: 0,
      BUILDLOG: 0,
      COV: 0
    }
  };
}

/**
 * Lire ou créer un registry
 * @param {string} date - YYYYMMDD
 * @param {string} [baseDir] - Répertoire de base
 * @returns {object}
 */
export function readRegistry(date, baseDir = '.') {
  const registryPath = getRegistryPath(date, baseDir);
  
  if (existsSync(registryPath)) {
    const content = readFileSync(registryPath, 'utf8');
    return YAML.parse(content);
  }
  
  return createEmptyRegistry(date);
}

/**
 * Sauvegarder un registry
 * @param {string} date - YYYYMMDD
 * @param {object} registry - Données du registry
 * @param {string} [baseDir] - Répertoire de base
 */
export function saveRegistry(date, registry, baseDir = '.') {
  const registryPath = getRegistryPath(date, baseDir);
  const registryDir = dirname(registryPath);
  
  if (!existsSync(registryDir)) {
    mkdirSync(registryDir, { recursive: true });
  }
  
  const content = YAML.stringify(registry);
  writeFileSync(registryPath, content, 'utf8');
}

/**
 * Incrémenter un compteur et retourner le nouveau SEQ
 * @param {string} date - YYYYMMDD
 * @param {string} type - Type d'entité (ENT, EVT, etc.)
 * @param {string} [baseDir] - Répertoire de base
 * @returns {number} Nouveau numéro de séquence
 */
export function incrementCounter(date, type, baseDir = '.') {
  const registry = readRegistry(date, baseDir);
  
  if (!(type in registry.counters)) {
    throw new Error(`Unknown type: ${type}. Valid types: ${Object.keys(registry.counters).join(', ')}`);
  }
  
  registry.counters[type]++;
  registry.updated = getTimestamp();
  
  saveRegistry(date, registry, baseDir);
  
  return registry.counters[type];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formater un numéro de séquence sur 4 chiffres
 * @param {number} seq - Numéro de séquence
 * @returns {string}
 */
export function formatSeq(seq) {
  if (seq < 1 || seq > 9999) {
    throw new Error(`Sequence number out of range: ${seq}. Must be 1-9999.`);
  }
  return String(seq).padStart(4, '0');
}

/**
 * Générer le prochain ID pour un type donné
 * @param {string} type - Type d'entité (ENT, EVT, etc.)
 * @param {string} [baseDir] - Répertoire de base
 * @returns {string} ID complet TYPE-YYYYMMDD-NNNN
 */
export function getNextId(type, baseDir = '.') {
  const date = getDate();
  const seq = incrementCounter(date, type, baseDir);
  return `${type}-${date}-${formatSeq(seq)}`;
}

/**
 * Parser un ID et extraire ses composants
 * @param {string} id - ID au format TYPE-YYYYMMDD-NNNN
 * @returns {object} { type, date, seq }
 */
export function parseId(id) {
  const match = id.match(/^([A-Z]+)-(\d{8})-(\d{4})$/);
  if (!match) {
    throw new Error(`Invalid ID format: ${id}. Expected TYPE-YYYYMMDD-NNNN`);
  }
  return {
    type: match[1],
    date: match[2],
    seq: parseInt(match[3], 10)
  };
}

/**
 * Valider un ID
 * @param {string} id - ID à valider
 * @returns {boolean}
 */
export function isValidId(id) {
  try {
    parseId(id);
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES CANONIQUES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Liste des types valides
 */
export const VALID_TYPES = [
  'ENT', 'EVT', 'LINK', 'REG', 'SES',
  'SEAL', 'STATE', 'COMP', 'CERT', 'MANIFEST',
  'TESTLOG', 'BUILDLOG', 'COV'
];

/**
 * Vérifier si un type est valide
 * @param {string} type - Type à vérifier
 * @returns {boolean}
 */
export function isValidType(type) {
  return VALID_TYPES.includes(type);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sleep async
 * @param {number} ms - Millisecondes
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Clock
  setClockOverride,
  
  // Date/Time
  getDate,
  getTimestamp,
  
  // Lock
  getLockPath,
  acquireLock,
  releaseLock,
  checkLock,
  
  // Registry
  getRegistryPath,
  readRegistry,
  saveRegistry,
  incrementCounter,
  
  // ID
  formatSeq,
  getNextId,
  parseId,
  isValidId,
  isValidType,
  VALID_TYPES
};
