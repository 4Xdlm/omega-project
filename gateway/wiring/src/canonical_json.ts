// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — CANONICAL JSON
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-ADP-06: Payload sérialisé = byte stream identique
// @invariant INV-ENV-05: même input → même replay_protection_key
//
// RÈGLES CRITIQUES:
// - Les clés d'objets sont triées alphabétiquement (récursif)
// - Les arrays conservent leur ordre (pas de tri)
// - Les valeurs primitives restent inchangées
// - Pas de dates, pas de fonctions, pas d'undefined
// - NaN et Infinity sont rejetés
//
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Erreur de sérialisation canonique
 */
export class CanonicalJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanonicalJsonError';
  }
}

/**
 * Vérifie si une valeur est un objet plain (pas null, pas array, pas Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Trie récursivement les clés d'un objet
 * @throws CanonicalJsonError si valeur non sérialisable détectée
 */
function sortRecursive(value: unknown): unknown {
  // Null
  if (value === null) {
    return null;
  }

  // Undefined - interdit
  if (value === undefined) {
    throw new CanonicalJsonError('undefined is not allowed in canonical JSON');
  }

  // Fonction - interdit
  if (typeof value === 'function') {
    throw new CanonicalJsonError('Functions are not allowed in canonical JSON');
  }

  // Symbol - interdit
  if (typeof value === 'symbol') {
    throw new CanonicalJsonError('Symbols are not allowed in canonical JSON');
  }

  // BigInt - interdit (pas JSON standard)
  if (typeof value === 'bigint') {
    throw new CanonicalJsonError('BigInt is not allowed in canonical JSON');
  }

  // Number - vérifier NaN et Infinity
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CanonicalJsonError('NaN and Infinity are not allowed in canonical JSON');
    }
    return value;
  }

  // String, boolean - OK tel quel
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  // Array - conserver l'ordre, trier récursivement les éléments
  if (Array.isArray(value)) {
    return value.map(sortRecursive);
  }

  // Date - interdit (non déterministe en JSON)
  if (value instanceof Date) {
    throw new CanonicalJsonError('Date objects are not allowed in canonical JSON - use ISO string or timestamp');
  }

  // Autres objets spéciaux - interdit
  if (!isPlainObject(value)) {
    throw new CanonicalJsonError(`Non-plain objects are not allowed: ${Object.prototype.toString.call(value)}`);
  }

  // Objet plain - trier les clés alphabétiquement
  const keys = Object.keys(value).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of keys) {
    sorted[key] = sortRecursive(value[key]);
  }
  return sorted;
}

/**
 * Sérialise une valeur en JSON canonique (déterministe)
 * 
 * @param value - Valeur à sérialiser
 * @returns JSON string avec clés triées
 * @throws CanonicalJsonError si valeur non sérialisable
 * 
 * @example
 * canonicalStringify({ b: 2, a: 1 }) === '{"a":1,"b":2}'
 * canonicalStringify({ a: { c: 3, b: 2 } }) === '{"a":{"b":2,"c":3}}'
 */
export function canonicalStringify(value: unknown): string {
  const sorted = sortRecursive(value);
  return JSON.stringify(sorted);
}

/**
 * Parse un JSON et le re-sérialise en canonique
 * Utile pour normaliser des JSON existants
 */
export function canonicalNormalize(json: string): string {
  const parsed = JSON.parse(json);
  return canonicalStringify(parsed);
}

/**
 * Compare deux valeurs de manière canonique
 * @returns true si identiques après canonicalisation
 */
export function canonicalEquals(a: unknown, b: unknown): boolean {
  try {
    return canonicalStringify(a) === canonicalStringify(b);
  } catch {
    return false;
  }
}

/**
 * Calcule un hash de la forme canonique
 * Utile pour replay_protection_key
 */
export function canonicalHash(value: unknown): string {
  const { createHash } = require('crypto');
  const canonical = canonicalStringify(value);
  return createHash('sha256').update(canonical).digest('hex');
}
