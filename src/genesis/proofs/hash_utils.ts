// ═══════════════════════════════════════════════════════════════════════════════
// GENESIS FORGE v1.1.2 — Hash Utilities
// ═══════════════════════════════════════════════════════════════════════════════
// Fonctions de hachage deterministes pour preuves et traçabilite
// ═══════════════════════════════════════════════════════════════════════════════

import * as crypto from 'crypto';

/**
 * Calcule SHA-256 d'une chaine
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Calcule SHA-256 d'un buffer
 */
export function sha256Buffer(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash un objet de maniere deterministe
 * Trie les cles pour garantir le meme hash quel que soit l'ordre
 */
export function hashObject(obj: unknown): string {
  const str = JSON.stringify(obj, sortObjectKeys);
  return sha256(str);
}

/**
 * Tri recursif des cles d'objet pour serialisation deterministe
 */
function sortObjectKeys(key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const k of keys) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

/**
 * Combine plusieurs hashes en un seul
 */
export function combineHashes(...hashes: string[]): string {
  return sha256(hashes.join('|'));
}

/**
 * Genere un hash de verification pour un fichier
 */
export function hashFile(content: string | Buffer): string {
  if (typeof content === 'string') {
    return sha256(content);
  }
  return sha256Buffer(content);
}

/**
 * Verifie si un hash correspond au contenu
 */
export function verifyHash(content: string | Buffer, expectedHash: string): boolean {
  const actualHash = hashFile(content);
  return actualHash === expectedHash;
}

/**
 * Genere un hash court (8 premiers caracteres)
 */
export function shortHash(data: string): string {
  return sha256(data).substring(0, 8);
}

/**
 * Genere un ID unique base sur timestamp + random
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  const id = `${timestamp}-${random}`;
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Hash d'un TruthBundle (sans le bundleHash lui-meme)
 */
export function hashTruthBundle(bundle: {
  id: string;
  timestamp: string;
  sourceHash: string;
  vectorSchemaId: string;
  targetEmotionField: unknown;
  targetOxygenResult: unknown;
  timeline?: unknown[];
  constraints?: unknown;
}): string {
  const toHash = {
    id: bundle.id,
    timestamp: bundle.timestamp,
    sourceHash: bundle.sourceHash,
    vectorSchemaId: bundle.vectorSchemaId,
    targetEmotionField: bundle.targetEmotionField,
    targetOxygenResult: bundle.targetOxygenResult,
    timeline: bundle.timeline,
    constraints: bundle.constraints,
  };
  return hashObject(toHash);
}

export default {
  sha256,
  sha256Buffer,
  hashObject,
  combineHashes,
  hashFile,
  verifyHash,
  shortHash,
  generateId,
  hashTruthBundle,
};
