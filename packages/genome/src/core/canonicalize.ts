/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — CANONICALIZE & FLOAT QUANTIZE
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * 
 * INVARIANTS:
 * - INV-GEN-13: Sérialisation canonique (clés triées, UTF-8, no whitespace)
 * - INV-GEN-14: Float quantifié à 1e-6 avant hash
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { FLOAT_PRECISION, FLOAT_DECIMALS } from "./version.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FLOAT QUANTIZATION (INV-GEN-14)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quantifie un float à la précision définie
 * INV-GEN-14: Arrondi à 1e-6 pour stabilité cross-runtime
 */
export function quantizeFloat(value: number): number {
  const quantized = Math.round(value / FLOAT_PRECISION) * FLOAT_PRECISION;
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
// CANONICAL SERIALIZATION (INV-GEN-13)
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
