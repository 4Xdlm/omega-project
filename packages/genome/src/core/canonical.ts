/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — CANONICAL BYTES
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * CE FICHIER DÉFINIT LA VÉRITÉ DU FINGERPRINT.
 * 
 * INVARIANTS:
 * - INV-GEN-02: fingerprint = SHA256(canonicalBytes(payloadSansMetadata))
 * - INV-GEN-13: Sérialisation canonique (clés triées, UTF-8, no whitespace)
 * - INV-GEN-14: Float quantifié à 1e-6 avant hash
 * 
 * RÈGLES CANONIQUES (FROZEN):
 * - Tri lexicographique des clés (Unicode code point)
 * - UTF-8 strict
 * - Pas de whitespace
 * - Float quantifié à 1e-6, 6 décimales max
 * - NaN/Infinity = REJET
 * - Metadata EXCLUE du hash
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { FLOAT_PRECISION, FLOAT_DECIMALS } from "./version.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

export class CanonicalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalizeError";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOAT VALIDATION & QUANTIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valide qu'un nombre est canonicalisable
 * @throws CanonicalizeError si NaN ou Infinity
 */
export function validateNumber(value: number, path: string): void {
  if (Number.isNaN(value)) {
    throw new CanonicalizeError(`NaN detected at path: ${path}`);
  }
  if (!Number.isFinite(value)) {
    throw new CanonicalizeError(`Infinity detected at path: ${path}`);
  }
}

/**
 * Quantifie un float à la précision définie
 * INV-GEN-14: Arrondi à 1e-6 pour stabilité cross-runtime
 * 
 * @throws CanonicalizeError si NaN ou Infinity
 */
export function quantizeFloat(value: number, path: string = "root"): number {
  validateNumber(value, path);
  const quantized = Math.round(value / FLOAT_PRECISION) * FLOAT_PRECISION;
  return Number(quantized.toFixed(FLOAT_DECIMALS));
}

/**
 * Quantifie un objet récursivement avec validation stricte
 * @throws CanonicalizeError si NaN ou Infinity trouvé
 */
export function quantizeObject<T>(obj: T, path: string = "root"): T {
  if (typeof obj === "number") {
    return quantizeFloat(obj, path) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item, idx) => quantizeObject(item, `${path}[${idx}]`)) as T;
  }
  
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = quantizeObject(value, `${path}.${key}`);
    }
    return result as T;
  }
  
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sérialise un objet en JSON canonique
 * 
 * RÈGLES:
 * - Clés triées lexicographiquement (Unicode code point via sort())
 * - Pas de whitespace
 * - UTF-8 (garanti par JSON.stringify)
 * - Nombres en notation décimale standard (pas de 1e-7)
 */
export function canonicalSerialize(obj: unknown): string {
  return JSON.stringify(obj, canonicalReplacer);
}

/**
 * Replacer canonique qui:
 * 1. Trie les clés alphabétiquement
 * 2. Valide les nombres (pas de NaN/Infinity via JSON.stringify naturel)
 */
function canonicalReplacer(_key: string, value: unknown): unknown {
  // Les objets sont reconstruits avec clés triées
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    // sort() = tri lexicographique Unicode (stable, déterministe)
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const k of keys) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL BYTES (LA VÉRITÉ)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convertit un payload en bytes canoniques.
 * C'EST LA FONCTION RACINE QUI DÉFINIT LE FINGERPRINT.
 * 
 * @param payload - Payload SANS metadata (déjà strippé)
 * @returns Uint8Array en UTF-8
 * @throws CanonicalizeError si payload invalide
 */
export function canonicalBytes(payload: unknown): Uint8Array {
  // 1. Quantifier tous les floats (avec validation NaN/Infinity)
  const quantized = quantizeObject(payload);
  
  // 2. Sérialiser en JSON canonique
  const json = canonicalSerialize(quantized);
  
  // 3. Encoder en UTF-8
  const encoder = new TextEncoder();
  return encoder.encode(json);
}

/**
 * Convertit un payload en string canonique (pour debug/test)
 */
export function canonicalString(payload: unknown): string {
  const quantized = quantizeObject(payload);
  return canonicalSerialize(quantized);
}

// ═══════════════════════════════════════════════════════════════════════════════
// METADATA STRIPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Liste des champs metadata à exclure du fingerprint
 * FROZEN - ne pas modifier sans NCR
 */
const METADATA_FIELDS = new Set([
  "metadata",
  "meta",
  "extractedAt",
  "timestamp",
  "createdAt",
  "updatedAt",
  "source",
  "trace",
  "host",
  "user",
  "path",
  "runId",
  "environment",
]);

/**
 * Supprime les champs metadata d'un objet (récursif niveau 1 seulement)
 * INV-GEN-11: Metadata hors fingerprint
 */
export function stripMetadata<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (!METADATA_FIELDS.has(key)) {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT (FINAL)
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash } from "crypto";

/**
 * Calcule le fingerprint SHA-256 d'un payload.
 * 
 * fingerprint = SHA256(canonicalBytes(stripMetadata(payload)))
 * 
 * @param payload - Payload complet (metadata sera ignorée)
 * @returns Hash SHA-256 en hex lowercase (64 caractères)
 * @throws CanonicalizeError si payload contient NaN/Infinity
 */
export function computeFingerprintFromPayload(payload: Record<string, unknown>): string {
  // 1. Strip metadata
  const clean = stripMetadata(payload);
  
  // 2. Get canonical bytes
  const bytes = canonicalBytes(clean);
  
  // 3. SHA-256
  const hash = createHash("sha256");
  hash.update(bytes);
  
  return hash.digest("hex").toLowerCase();
}
