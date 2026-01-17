// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — SEGMENT ENGINE v1.0.0 — CANONICAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
// Hash SHA-256 + JSON canonique (tri des clés) pour déterminisme absolu
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";

/**
 * JSON stable avec tri des clés (ordre alphabétique)
 * 
 * Supporte: string, number, boolean, null, array, object
 * Refuse: NaN, Infinity, undefined, functions, symbols
 * 
 * @throws Error si type non supporté ou nombre non-fini
 */
export function stableStringify(value: unknown): string {
  return _stringify(value);
}

function _stringify(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) throw new Error("stableStringify: undefined not allowed");

  const t = typeof v;

  if (t === "string") return JSON.stringify(v);
  if (t === "boolean") return v ? "true" : "false";

  if (t === "number") {
    if (!Number.isFinite(v as number)) {
      throw new Error(`stableStringify: non-finite number (${v})`);
    }
    return JSON.stringify(v);
  }

  if (Array.isArray(v)) {
    return "[" + v.map(_stringify).join(",") + "]";
  }

  if (t === "object") {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(k => JSON.stringify(k) + ":" + _stringify(obj[k]));
    return "{" + pairs.join(",") + "}";
  }

  throw new Error(`stableStringify: unsupported type ${t}`);
}

/**
 * Hash SHA-256 (64 caractères hex lowercase)
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Hash court déterministe (pour IDs)
 * @param input Chaîne à hasher
 * @param len Longueur du hash (défaut: 12)
 */
export function shortHash(input: string, len: number = 12): string {
  return sha256Hex(input).slice(0, len);
}

/**
 * Hash déterministe d'un objet (via JSON canonique)
 */
export function hashObject(obj: unknown): string {
  return sha256Hex(stableStringify(obj));
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS INLINE
// ═══════════════════════════════════════════════════════════════════════════════

export function selfTest(): boolean {
  // Test ordre des clés
  const a = stableStringify({ b: 1, a: 2 });
  const b = stableStringify({ a: 2, b: 1 });
  if (a !== b) {
    console.error("FAIL: key order not stable");
    return false;
  }

  // Test hash déterministe
  const h1 = sha256Hex("test");
  const h2 = sha256Hex("test");
  if (h1 !== h2 || h1.length !== 64) {
    console.error("FAIL: hash not deterministic");
    return false;
  }

  // Test shortHash
  const s = shortHash("test", 8);
  if (s.length !== 8) {
    console.error("FAIL: shortHash length wrong");
    return false;
  }

  // Test refus NaN
  try {
    stableStringify(NaN);
    console.error("FAIL: NaN should throw");
    return false;
  } catch {
    // Expected: NaN must throw - test passes
  }

  // Test refus Infinity
  try {
    stableStringify(Infinity);
    console.error("FAIL: Infinity should throw");
    return false;
  } catch {
    // Expected: Infinity must throw - test passes
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  stableStringify,
  sha256Hex,
  shortHash,
  hashObject,
  selfTest
};
