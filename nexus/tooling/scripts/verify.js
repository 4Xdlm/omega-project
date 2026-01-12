/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — Verify Manager
 * Vérification d'intégrité des fichiers, manifests et seals
 * 
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / RFC 8785
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import YAML from 'yaml';

import {
  computeFileHash,
  verifyFileHash,
  parseFile,
  getCanonicalPath,
  isValidHash
} from './hash.js';

import {
  buildMerkleRoot,
  buildMerkleRootFromHashes,
  getFilesInScope,
  verifyMerkleRoot,
  identifyChanges
} from './merkle.js';

import { parseId, isValidId, VALID_TYPES } from './registry.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Status de vérification
 */
export const VERIFY_STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  WARN: 'WARN',
  SKIP: 'SKIP'
};

/**
 * Créer un résultat de vérification
 * @param {string} status - Status (PASS, FAIL, WARN, SKIP)
 * @param {string} message - Message
 * @param {object} [details] - Détails additionnels
 * @returns {object}
 */
function result(status, message, details = {}) {
  return {
    status,
    message,
    timestamp: new Date().toISOString(),
    ...details
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifier un fichier individuel
 * @param {string} filepath - Chemin du fichier
 * @param {string} [expectedHash] - Hash attendu (optionnel)
 * @returns {object} Résultat de vérification
 */
export function verifyFile(filepath, expectedHash = null) {
  // Vérifier que le fichier existe
  if (!existsSync(filepath)) {
    return result(VERIFY_STATUS.FAIL, `File not found: ${filepath}`, {
      file: filepath,
      exists: false
    });
  }
  
  // Calculer le hash actuel
  const currentHash = computeFileHash(filepath);
  
  // Si pas de hash attendu, retourner le hash calculé
  if (!expectedHash) {
    return result(VERIFY_STATUS.PASS, 'File exists and hash computed', {
      file: filepath,
      hash: currentHash
    });
  }
  
  // Comparer les hashes
  if (currentHash === expectedHash) {
    return result(VERIFY_STATUS.PASS, 'Hash match', {
      file: filepath,
      hash: currentHash
    });
  } else {
    return result(VERIFY_STATUS.FAIL, 'Hash mismatch', {
      file: filepath,
      expected: expectedHash,
      actual: currentHash
    });
  }
}

/**
 * Vérifier plusieurs fichiers
 * @param {Object<string, string>} fileHashes - Map filepath -> expectedHash
 * @param {string} baseDir - Répertoire de base
 * @returns {object} Résultat agrégé
 */
export function verifyFiles(fileHashes, baseDir) {
  const results = [];
  let passCount = 0;
  let failCount = 0;
  
  for (const [file, expectedHash] of Object.entries(fileHashes)) {
    const fullPath = join(baseDir, file);
    const fileResult = verifyFile(fullPath, expectedHash);
    
    results.push({
      file: file,
      ...fileResult
    });
    
    if (fileResult.status === VERIFY_STATUS.PASS) {
      passCount++;
    } else {
      failCount++;
    }
  }
  
  const status = failCount === 0 ? VERIFY_STATUS.PASS : VERIFY_STATUS.FAIL;
  
  return result(status, `${passCount}/${results.length} files verified`, {
    pass_count: passCount,
    fail_count: failCount,
    total: results.length,
    details: results
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANIFEST VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Charger un manifest
 * @param {string} manifestId - ID du manifest
 * @param {string} baseDir - Répertoire de base
 * @returns {object|null} Manifest ou null si non trouvé
 */
function loadManifest(manifestId, baseDir) {
  const path = getCanonicalPath(manifestId, baseDir);
  
  if (!existsSync(path)) {
    return null;
  }
  
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Vérifier un manifest
 * @param {string} manifestId - ID du manifest
 * @param {string} baseDir - Répertoire de base
 * @returns {object} Résultat de vérification
 */
export function verifyManifest(manifestId, baseDir) {
  // Charger le manifest
  const manifest = loadManifest(manifestId, baseDir);
  
  if (!manifest) {
    return result(VERIFY_STATUS.FAIL, `Manifest not found: ${manifestId}`, {
      manifest_id: manifestId
    });
  }
  
  // Vérifier que le manifest a les champs requis
  if (!manifest.file_hashes || !manifest.files_in_scope) {
    return result(VERIFY_STATUS.FAIL, 'Invalid manifest structure', {
      manifest_id: manifestId,
      has_file_hashes: !!manifest.file_hashes,
      has_files_in_scope: !!manifest.files_in_scope
    });
  }
  
  // Vérifier chaque fichier
  const fileResults = verifyFiles(manifest.file_hashes, baseDir);
  
  return result(fileResults.status, `Manifest verification: ${fileResults.message}`, {
    manifest_id: manifestId,
    session_id: manifest.session_id,
    file_count: manifest.file_count,
    verification: fileResults
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Charger un seal
 * @param {string} sealId - ID du seal
 * @param {string} baseDir - Répertoire de base
 * @returns {object|null} Seal ou null si non trouvé
 */
function loadSeal(sealId, baseDir) {
  const path = getCanonicalPath(sealId, baseDir);
  
  if (!existsSync(path)) {
    return null;
  }
  
  return YAML.parse(readFileSync(path, 'utf8'));
}

/**
 * Vérifier un seal
 * @param {string} sealId - ID du seal
 * @param {string} baseDir - Répertoire de base
 * @returns {object} Résultat de vérification
 */
export function verifySeal(sealId, baseDir) {
  // Charger le seal
  const seal = loadSeal(sealId, baseDir);
  
  if (!seal) {
    return result(VERIFY_STATUS.FAIL, `Seal not found: ${sealId}`, {
      seal_id: sealId
    });
  }
  
  // Vérifier le format du seal
  if (!seal.manifest_id || !seal.root_hash) {
    return result(VERIFY_STATUS.FAIL, 'Invalid seal structure', {
      seal_id: sealId,
      has_manifest_id: !!seal.manifest_id,
      has_root_hash: !!seal.root_hash
    });
  }
  
  // Charger le manifest associé
  const manifest = loadManifest(seal.manifest_id, baseDir);
  
  if (!manifest) {
    return result(VERIFY_STATUS.FAIL, `Associated manifest not found: ${seal.manifest_id}`, {
      seal_id: sealId,
      manifest_id: seal.manifest_id
    });
  }
  
  // Vérifier les fichiers du manifest
  const manifestResult = verifyManifest(seal.manifest_id, baseDir);
  
  if (manifestResult.status === VERIFY_STATUS.FAIL) {
    return result(VERIFY_STATUS.FAIL, 'Manifest verification failed', {
      seal_id: sealId,
      manifest_verification: manifestResult
    });
  }
  
  // Recalculer le root hash à partir des hashes du manifest
  const computedRootHash = buildMerkleRootFromHashes(manifest.file_hashes);
  
  if (computedRootHash !== seal.root_hash) {
    return result(VERIFY_STATUS.FAIL, 'Root hash mismatch', {
      seal_id: sealId,
      expected_root_hash: seal.root_hash,
      computed_root_hash: computedRootHash
    });
  }
  
  return result(VERIFY_STATUS.PASS, 'Seal verified successfully', {
    seal_id: sealId,
    manifest_id: seal.manifest_id,
    root_hash: seal.root_hash,
    entities_count: seal.entities_created?.length || 0,
    events_count: seal.events_created?.length || 0,
    links_count: seal.links_created?.length || 0,
    sealed_by: seal.sealed_by,
    timestamp: seal.timestamp
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAIN VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtenir tous les seals triés chronologiquement
 * @param {string} baseDir - Répertoire de base
 * @returns {string[]} Liste des IDs de seals triés
 */
function getAllSeals(baseDir) {
  const sealsDir = join(baseDir, 'nexus/proof/seals');
  
  if (!existsSync(sealsDir)) {
    return [];
  }
  
  const files = readdirSync(sealsDir)
    .filter(f => f.startsWith('SEAL-') && f.endsWith('.yaml'))
    .map(f => f.replace('.yaml', ''))
    .sort(); // Le tri lexicographique fonctionne car format SEAL-YYYYMMDD-NNNN
  
  return files;
}

/**
 * Vérifier la chaîne complète des seals
 * @param {string} baseDir - Répertoire de base
 * @returns {object} Résultat de vérification
 */
export function verifyChain(baseDir) {
  const seals = getAllSeals(baseDir);
  
  if (seals.length === 0) {
    return result(VERIFY_STATUS.WARN, 'No seals found', {
      seal_count: 0
    });
  }
  
  const results = [];
  let passCount = 0;
  let failCount = 0;
  
  for (const sealId of seals) {
    const sealResult = verifySeal(sealId, baseDir);
    
    results.push({
      seal_id: sealId,
      ...sealResult
    });
    
    if (sealResult.status === VERIFY_STATUS.PASS) {
      passCount++;
    } else {
      failCount++;
    }
  }
  
  const status = failCount === 0 ? VERIFY_STATUS.PASS : VERIFY_STATUS.FAIL;
  
  return result(status, `${passCount}/${seals.length} seals verified`, {
    pass_count: passCount,
    fail_count: failCount,
    total: seals.length,
    first_seal: seals[0],
    last_seal: seals[seals.length - 1],
    details: results
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifier l'intégrité globale du Nexus
 * @param {string} baseDir - Répertoire de base
 * @returns {object} Résultat de vérification complète
 */
export function verifyIntegrity(baseDir) {
  const checks = [];
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  
  // 1. Vérifier que les répertoires de base existent
  const requiredDirs = [
    'nexus/genesis',
    'nexus/ledger/entities',
    'nexus/ledger/events',
    'nexus/ledger/registry',
    'nexus/proof/seals'
  ];
  
  for (const dir of requiredDirs) {
    const fullPath = join(baseDir, dir);
    if (existsSync(fullPath)) {
      checks.push(result(VERIFY_STATUS.PASS, `Directory exists: ${dir}`));
      passCount++;
    } else {
      checks.push(result(VERIFY_STATUS.FAIL, `Directory missing: ${dir}`));
      failCount++;
    }
  }
  
  // 2. Vérifier les fichiers genesis
  const genesisFiles = [
    'nexus/genesis/THE_OATH.md',
    'nexus/genesis/LAWS.yaml',
    'nexus/genesis/IDENTITY.yaml'
  ];
  
  for (const file of genesisFiles) {
    const fullPath = join(baseDir, file);
    if (existsSync(fullPath)) {
      checks.push(result(VERIFY_STATUS.PASS, `Genesis file exists: ${file}`));
      passCount++;
    } else {
      checks.push(result(VERIFY_STATUS.WARN, `Genesis file missing: ${file}`));
      warnCount++;
    }
  }
  
  // 3. Vérifier la chaîne de seals
  const chainResult = verifyChain(baseDir);
  checks.push({
    type: 'chain',
    ...chainResult
  });
  
  if (chainResult.status === VERIFY_STATUS.PASS) {
    passCount++;
  } else if (chainResult.status === VERIFY_STATUS.WARN) {
    warnCount++;
  } else {
    failCount++;
  }
  
  // Déterminer le status global
  let status;
  if (failCount > 0) {
    status = VERIFY_STATUS.FAIL;
  } else if (warnCount > 0) {
    status = VERIFY_STATUS.WARN;
  } else {
    status = VERIFY_STATUS.PASS;
  }
  
  return result(status, `Integrity check: ${passCount} pass, ${warnCount} warn, ${failCount} fail`, {
    pass_count: passCount,
    warn_count: warnCount,
    fail_count: failCount,
    checks: checks
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ID AND REFERENCE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérifier qu'un ID existe dans le Nexus
 * @param {string} id - ID à vérifier
 * @param {string} baseDir - Répertoire de base
 * @returns {object} Résultat de vérification
 */
export function verifyIdExists(id, baseDir) {
  if (!isValidId(id)) {
    return result(VERIFY_STATUS.FAIL, `Invalid ID format: ${id}`);
  }
  
  const path = getCanonicalPath(id, baseDir);
  
  if (existsSync(path)) {
    return result(VERIFY_STATUS.PASS, `ID exists: ${id}`, {
      id: id,
      path: path
    });
  } else {
    return result(VERIFY_STATUS.FAIL, `ID not found: ${id}`, {
      id: id,
      expected_path: path
    });
  }
}

/**
 * Vérifier les références dans une entité
 * @param {string} entityId - ID de l'entité
 * @param {string} baseDir - Répertoire de base
 * @returns {object} Résultat de vérification
 */
export function verifyEntityRefs(entityId, baseDir) {
  const path = getCanonicalPath(entityId, baseDir);
  
  if (!existsSync(path)) {
    return result(VERIFY_STATUS.FAIL, `Entity not found: ${entityId}`);
  }
  
  const entity = parseFile(path);
  const invalidRefs = [];
  
  // Vérifier les refs
  if (entity.refs && Array.isArray(entity.refs)) {
    for (const ref of entity.refs) {
      if (ref.id && isValidId(ref.id)) {
        const refResult = verifyIdExists(ref.id, baseDir);
        if (refResult.status !== VERIFY_STATUS.PASS) {
          invalidRefs.push(ref.id);
        }
      }
    }
  }
  
  if (invalidRefs.length > 0) {
    return result(VERIFY_STATUS.FAIL, `Entity has invalid refs`, {
      entity_id: entityId,
      invalid_refs: invalidRefs
    });
  }
  
  return result(VERIFY_STATUS.PASS, 'All refs valid', {
    entity_id: entityId,
    refs_count: entity.refs?.length || 0
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK VERIFY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Vérification rapide (dernier seal uniquement)
 * @param {string} baseDir - Répertoire de base
 * @returns {object} Résultat de vérification
 */
export function quickVerify(baseDir) {
  const seals = getAllSeals(baseDir);
  
  if (seals.length === 0) {
    return result(VERIFY_STATUS.WARN, 'No seals to verify');
  }
  
  const lastSeal = seals[seals.length - 1];
  return verifySeal(lastSeal, baseDir);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Status
  VERIFY_STATUS,
  
  // File verification
  verifyFile,
  verifyFiles,
  
  // Manifest verification
  verifyManifest,
  
  // Seal verification
  verifySeal,
  
  // Chain verification
  verifyChain,
  
  // Integrity
  verifyIntegrity,
  
  // ID verification
  verifyIdExists,
  verifyEntityRefs,
  
  // Quick verify
  quickVerify
};
