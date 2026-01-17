// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — SEGMENT ENGINE v1.0.0 — CANONICAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
// Hash SHA-256 + JSON canonique (tri des clés) pour déterminisme absolu
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";

/**
 * Serialize a value to deterministic JSON with sorted object keys.
 *
 * Unlike JSON.stringify, object keys are sorted alphabetically ensuring
 * identical output for semantically equivalent objects. This is critical
 * for hash computation where {a:1,b:2} must equal {b:2,a:1}.
 *
 * Supports: string, number, boolean, null, array, object
 *
 * @throws Error for NaN, Infinity, undefined, functions, symbols
 *
 * @example
 * ```ts
 * // Key order is normalized
 * stableStringify({ z: 1, a: 2 }); // '{"a":2,"z":1}'
 * stableStringify({ a: 2, z: 1 }); // '{"a":2,"z":1}'
 *
 * // Use for hash computation
 * const hash = sha256Hex(stableStringify(config));
 * ```
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
 * Compute SHA-256 hash of a string, returning 64 lowercase hex characters.
 *
 * Uses UTF-8 encoding. Result is always 64 characters regardless of input.
 *
 * @example
 * ```ts
 * const hash = sha256Hex('hello world');
 * // hash.length === 64
 * // hash === 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
 * ```
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Generate a short deterministic hash suitable for IDs.
 *
 * Truncates the full SHA-256 to the specified length. Default 12 characters
 * provides ~48 bits of entropy, sufficient for local uniqueness.
 *
 * @example
 * ```ts
 * const id = shortHash('unique-input', 8);  // '9f86d081'
 * const id2 = shortHash('unique-input', 12); // '9f86d081884c'
 * ```
 */
export function shortHash(input: string, len: number = 12): string {
  return sha256Hex(input).slice(0, len);
}

/**
 * Hash an object deterministically via canonical JSON serialization.
 *
 * Combines stableStringify (for key ordering) with sha256Hex.
 * Two objects with identical content produce identical hashes,
 * regardless of property insertion order.
 *
 * @example
 * ```ts
 * const h1 = hashObject({ b: 2, a: 1 });
 * const h2 = hashObject({ a: 1, b: 2 });
 * // h1 === h2 (key order doesn't matter)
 * ```
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
