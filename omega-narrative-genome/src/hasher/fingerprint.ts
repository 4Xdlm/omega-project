/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NARRATIVE GENOME — HASHER
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * Responsabilité: Calcul déterministe du fingerprint
 * 
 * INVARIANTS:
 * - INV-GEN-02: fingerprint = SHA256(canonical payload)
 * - INV-GEN-13: Sérialisation canonique (clés triées, UTF-8, no whitespace)
 * - INV-GEN-14: Float quantifié à 1e-6 avant hash
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "crypto";
import type { GenomeFingerprint, EmotionAxis, StyleAxis, StructureAxis, TempoAxis } from "../types";
import { FLOAT_PRECISION, FLOAT_DECIMALS, GENOME_VERSION } from "../constants";

// ═══════════════════════════════════════════════════════════════════════════════
// QUANTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quantifie un float à la précision définie
 * INV-GEN-14: Arrondi à 1e-6 pour stabilité cross-runtime
 */
export function quantizeFloat(value: number): number {
  const quantized = Math.round(value / FLOAT_PRECISION) * FLOAT_PRECISION;
  // Arrondi final pour éviter les erreurs de représentation
  return Number(quantized.toFixed(FLOAT_DECIMALS));
}

/**
 * Quantifie un objet récursivement
 */
export function quantizeObject<T>(obj: T): T {
  if (typeof obj === "number") {
    return quantizeFloat(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(quantizeObject) as T;
  }
  
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = quantizeObject(value);
    }
    return result as T;
  }
  
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SÉRIALISATION CANONIQUE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sérialise un objet en JSON canonique
 * INV-GEN-13: Clés triées alphabétiquement, pas de whitespace, UTF-8
 */
export function canonicalSerialize(obj: unknown): string {
  return JSON.stringify(obj, sortedReplacer);
}

/**
 * Replacer qui trie les clés alphabétiquement
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const k of keys) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payload pour le fingerprint
 * Seuls ces éléments entrent dans le hash (INV-GEN-11)
 */
interface FingerprintPayload {
  version: string;
  sourceHash: string;
  axes: {
    emotion: EmotionAxis;
    style: StyleAxis;
    structure: StructureAxis;
    tempo: TempoAxis;
  };
}

/**
 * Calcule le fingerprint SHA-256 d'un genome
 * 
 * INV-GEN-02: fingerprint = SHA256(canonical(version + sourceHash + axes))
 * INV-GEN-13: Sérialisation canonique
 * INV-GEN-14: Floats quantifiés
 */
export function computeFingerprint(
  sourceHash: string,
  axes: {
    emotion: EmotionAxis;
    style: StyleAxis;
    structure: StructureAxis;
    tempo: TempoAxis;
  }
): GenomeFingerprint {
  // 1. Construire le payload
  const payload: FingerprintPayload = {
    version: GENOME_VERSION,
    sourceHash,
    axes,
  };
  
  // 2. Quantifier les floats
  const quantized = quantizeObject(payload);
  
  // 3. Sérialisation canonique
  const serialized = canonicalSerialize(quantized);
  
  // 4. SHA-256
  const hash = createHash("sha256");
  hash.update(serialized, "utf8");
  
  return hash.digest("hex").toLowerCase();
}

/**
 * Vérifie qu'un fingerprint est valide (format)
 */
export function isValidFingerprint(fingerprint: string): fingerprint is GenomeFingerprint {
  return /^[a-f0-9]{64}$/.test(fingerprint);
}
