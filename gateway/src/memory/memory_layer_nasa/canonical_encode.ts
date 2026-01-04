// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — canonical_encode.ts
// Phase 8 — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// C01 FIX: Encodage déterministe strict pour floats et BigInt
// CNC-300 §7.1 — CANONICAL_ENCODE
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash, randomUUID } from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

export class CanonicalEncodeError extends Error {
  constructor(
    public readonly code: "FLOAT_NOT_FINITE" | "BIGINT_OVERFLOW" | "CIRCULAR_REFERENCE",
    message: string
  ) {
    super(message);
    this.name = "CanonicalEncodeError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FLOAT NORMALIZATION (C01 FIX)
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie qu'un nombre est fini.
 * REJECT: NaN, Infinity, -Infinity
 * 
 * @throws CanonicalEncodeError si non fini
 */
function assertFiniteNumber(n: number, path: string): void {
  if (!Number.isFinite(n)) {
    throw new CanonicalEncodeError(
      "FLOAT_NOT_FINITE",
      `Non-finite number at path "${path}": ${n}`
    );
  }
}

/**
 * Normalise -0 en 0.
 * JSON.stringify fait ça nativement mais on est explicite.
 */
function normalizeZero(n: number): number {
  return Object.is(n, -0) ? 0 : n;
}

// ─────────────────────────────────────────────────────────────────────────────────
// BIGINT HANDLING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * BigInt vers string avec suffixe "n" pour identification.
 * Format: "123456789n"
 */
function bigIntToString(b: bigint): string {
  return `${b.toString()}n`;
}

// ─────────────────────────────────────────────────────────────────────────────────
// RECURSIVE NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Normalise récursivement une valeur pour encodage canonique.
 * 
 * Règles (CNC-300 §7.1):
 * 1. FORMAT : JSON (UTF-8)
 * 2. CLÉS : Triées alphabétiquement (récursif)
 * 3. ESPACES : Aucun (compact)
 * 4. NOMBRES : Validation + normalisation -0
 * 5. BIGINT : Converti en string suffixé "n"
 * 6. STRINGS : Échappement JSON standard
 * 7. BOOLEANS/NULL : Lowercase
 * 8. ARRAYS : Ordre préservé
 * 9. UNDEFINED : Ignoré (comme JSON.stringify)
 * 
 * @param value - Valeur à normaliser
 * @param path - Chemin pour debug (erreurs)
 * @param seen - Set pour détection de cycles
 */
function normalizeValue(
  value: unknown,
  path: string,
  seen: WeakSet<object>
): unknown {
  // Null
  if (value === null) {
    return null;
  }

  // Undefined - ignoré
  if (value === undefined) {
    return undefined;
  }

  // Boolean
  if (typeof value === "boolean") {
    return value;
  }

  // String
  if (typeof value === "string") {
    return value;
  }

  // Number - validation + normalisation
  if (typeof value === "number") {
    assertFiniteNumber(value, path);
    return normalizeZero(value);
  }

  // BigInt - conversion en string
  if (typeof value === "bigint") {
    return bigIntToString(value);
  }

  // Symbol - non supporté en JSON, ignoré
  if (typeof value === "symbol") {
    return undefined;
  }

  // Function - non supporté en JSON, ignoré
  if (typeof value === "function") {
    return undefined;
  }

  // Object ou Array
  if (typeof value === "object") {
    // Détection de cycle
    if (seen.has(value)) {
      throw new CanonicalEncodeError(
        "CIRCULAR_REFERENCE",
        `Circular reference detected at path "${path}"`
      );
    }
    seen.add(value);

    // Array - préserve l'ordre
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      for (let i = 0; i < value.length; i++) {
        const normalized = normalizeValue(value[i], `${path}[${i}]`, seen);
        // undefined devient null dans les arrays (comportement JSON)
        result.push(normalized === undefined ? null : normalized);
      }
      return result;
    }

    // Object - tri des clés
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};
    
    for (const key of keys) {
      const v = obj[key];
      // Skip undefined values
      if (v === undefined) {
        continue;
      }
      const normalized = normalizeValue(v, `${path}.${key}`, seen);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }
    
    return result;
  }

  // Fallback - ne devrait pas arriver
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Encode une valeur en JSON canonique.
 * 
 * Garanties:
 * - Déterministe: même input → même output
 * - Clés triées alphabétiquement (récursif)
 * - Format compact (pas d'espaces)
 * - Floats validés (pas de NaN/Infinity)
 * - BigInt → string avec suffixe "n"
 * 
 * @param payload - Valeur à encoder
 * @returns JSON string canonique
 * @throws CanonicalEncodeError si payload invalide
 */
export function canonicalEncode(payload: unknown): string {
  const seen = new WeakSet<object>();
  const normalized = normalizeValue(payload, "$", seen);
  return JSON.stringify(normalized);
}

/**
 * Calcule SHA-256 d'une string UTF-8.
 * 
 * @param input - String à hasher
 * @returns Hash hexadécimal lowercase
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Génère un UUID v4.
 * 
 * Note: Utilise crypto.randomUUID() (Node 18+)
 */
export function uuid(): string {
  return randomUUID();
}

/**
 * Retourne l'horodatage courant en ISO 8601 UTC.
 * Format: YYYY-MM-DDTHH:mm:ss.sssZ
 */
export function nowUtcIso(): string {
  return new Date().toISOString();
}

/**
 * Valide qu'une string est un timestamp ISO 8601 UTC (format Z).
 * Accepte: YYYY-MM-DDTHH:mm:ss.sssZ ou YYYY-MM-DDTHH:mm:ssZ
 */
export function isIso8601UtcZ(s: string): boolean {
  if (typeof s !== "string") return false;
  // Match ISO 8601 avec timezone Z
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(s);
}

/**
 * Calcule la taille en bytes d'une string encodée en UTF-8.
 */
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HASH UTILITIES (pour chain_hash)
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le chain_hash pour la première entrée d'une clé.
 * Formule: SHA256(canonical_key + ":" + entry_hash)
 */
export function chainHashFirst(canonicalKey: string, entryHash: string): string {
  return sha256Hex(`${canonicalKey}:${entryHash}`);
}

/**
 * Calcule le chain_hash pour les entrées suivantes.
 * Formule: SHA256(previous_chain_hash + ":" + entry_hash)
 */
export function chainHashNext(prevChainHash: string, entryHash: string): string {
  return sha256Hex(`${prevChainHash}:${entryHash}`);
}
