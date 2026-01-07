/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — CANONICAL SERIALIZATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta/canonical
 * @version 2.0.0
 * @license MIT
 * 
 * CANONICAL SERIALIZATION RULES
 * =============================
 * 
 * For deterministic hashing, serialization must be:
 * 1. SORTED: Object keys sorted alphabetically at all depths
 * 2. STABLE: Same input = same output, cross-platform
 * 3. STRICT: NaN, Infinity, -0, undefined, BigInt → ERROR
 * 4. QUANTIZED: Floats rounded to fixed precision
 * 5. NORMALIZED: Line endings (LF), paths (forward slash)
 * 
 * INVARIANTS:
 * - INV-CAN-01: Same object = same canonical string
 * - INV-CAN-02: Invalid values (NaN, Infinity) throw error
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Float quantization precision (digits after decimal)
 * 1e-9 = 9 decimal places
 */
export const FLOAT_PRECISION = 9 as const;

/**
 * Float epsilon for comparison
 */
export const FLOAT_EPSILON = 1e-9 as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if value is a "dangerous" number that breaks determinism
 */
export function isDangerousNumber(value: number): boolean {
  return Number.isNaN(value) || 
         !Number.isFinite(value) || 
         Object.is(value, -0);
}

/**
 * Validate value for canonical serialization
 * @throws Error if value is not serializable
 */
export function validateForSerialization(value: unknown, path: string = 'root'): void {
  if (value === undefined) {
    throw new Error(`Canonical: undefined not allowed at ${path}`);
  }
  
  if (typeof value === 'bigint') {
    throw new Error(`Canonical: BigInt not allowed at ${path}`);
  }
  
  if (typeof value === 'number' && isDangerousNumber(value)) {
    throw new Error(`Canonical: NaN/Infinity/-0 not allowed at ${path} (got ${value})`);
  }
  
  if (typeof value === 'function') {
    throw new Error(`Canonical: Function not allowed at ${path}`);
  }
  
  if (typeof value === 'symbol') {
    throw new Error(`Canonical: Symbol not allowed at ${path}`);
  }
  
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateForSerialization(item, `${path}[${index}]`);
    });
  } else if (value !== null && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      validateForSerialization(val, `${path}.${key}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOAT QUANTIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quantize a float to fixed precision
 */
export function quantizeFloat(value: number): number {
  if (Number.isInteger(value)) {
    return value;
  }
  
  // Round to FLOAT_PRECISION decimal places
  const factor = Math.pow(10, FLOAT_PRECISION);
  return Math.round(value * factor) / factor;
}

/**
 * Quantize all floats in an object recursively
 */
export function quantizeFloats<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'number') {
    return quantizeFloat(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => quantizeFloats(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = quantizeFloats(value);
    }
    return result as T;
  }
  
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEY SORTING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sort object keys alphabetically, recursively
 */
export function sortKeysDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sortKeysDeep(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};
    
    for (const key of sortedKeys) {
      result[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
    }
    
    return result as T;
  }
  
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRING NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize line endings to LF
 */
export function normalizeLF(str: string): string {
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Normalize file path to forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Normalize all strings in an object (LF + paths)
 */
export function normalizeStrings<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return normalizeLF(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeStrings(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = normalizeStrings(value);
    }
    return result as T;
  }
  
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARRAY NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sort and deduplicate a string array
 */
export function sortUnique(arr: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(arr)].sort());
}

/**
 * Check if array is sorted and unique
 */
export function isSortedUnique(arr: readonly string[]): boolean {
  const sorted = sortUnique(arr);
  if (sorted.length !== arr.length) return false;
  return arr.every((val, idx) => val === sorted[idx]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prepare object for canonical serialization
 * - Validate (no NaN, Infinity, undefined, BigInt)
 * - Normalize strings (LF)
 * - Quantize floats
 * - Sort keys
 */
export function prepareForCanonical<T>(obj: T): T {
  // 1. Validate
  validateForSerialization(obj);
  
  // 2. Normalize strings
  let result = normalizeStrings(obj);
  
  // 3. Quantize floats
  result = quantizeFloats(result);
  
  // 4. Sort keys
  result = sortKeysDeep(result);
  
  return result;
}

/**
 * Convert object to canonical JSON string
 * @throws Error if object contains invalid values
 */
export function canonicalize(obj: unknown): string {
  const prepared = prepareForCanonical(obj);
  return JSON.stringify(prepared);
}

/**
 * Compute SHA-256 hash of canonical form
 */
export function canonicalHash(obj: unknown): string {
  const canonical = canonicalize(obj);
  return createHash('sha256').update(canonical).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compare two objects canonically
 */
export function canonicalEquals(a: unknown, b: unknown): boolean {
  try {
    return canonicalize(a) === canonicalize(b);
  } catch {
    return false;
  }
}

/**
 * Compare two floats with epsilon
 */
export function floatEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < FLOAT_EPSILON;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE HASH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute deterministic hash of file content
 * - Normalize line endings to LF
 */
export function hashFileContent(content: string): string {
  const normalized = normalizeLF(content);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Compute Merkle-style hash from sorted file hashes
 * Input: Array of { path: string, hash: string }
 * - Paths normalized (forward slash)
 * - Sorted by path
 * - Hash = SHA256(concat of "path:hash" lines)
 */
export function computeMerkleHash(
  files: readonly { path: string; hash: string }[]
): string {
  // Sort by normalized path
  const sorted = [...files].sort((a, b) => 
    normalizePath(a.path).localeCompare(normalizePath(b.path))
  );
  
  // Build content: "path:hash\n" for each file
  const content = sorted
    .map(f => `${normalizePath(f.path)}:${f.hash}`)
    .join('\n');
  
  return createHash('sha256').update(content).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if value is safe for canonical serialization
 */
export function isCanonicalizable(value: unknown): boolean {
  try {
    validateForSerialization(value);
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get canonical serialization rules as documentation
 */
export function getCanonicalRules(): string {
  return `
OMEGA SENTINEL — CANONICAL SERIALIZATION RULES
═══════════════════════════════════════════════

1. VALIDATION (throws on invalid)
   - undefined: NOT ALLOWED
   - NaN: NOT ALLOWED
   - Infinity/-Infinity: NOT ALLOWED
   - -0: NOT ALLOWED
   - BigInt: NOT ALLOWED
   - Function: NOT ALLOWED
   - Symbol: NOT ALLOWED

2. STRING NORMALIZATION
   - Line endings: CRLF/CR → LF
   - Paths: backslash → forward slash

3. FLOAT QUANTIZATION
   - Precision: ${FLOAT_PRECISION} decimal places
   - Method: Math.round(value * 10^${FLOAT_PRECISION}) / 10^${FLOAT_PRECISION}

4. KEY SORTING
   - Object keys: alphabetically sorted (recursive)
   - Arrays: order preserved (not sorted)

5. OUTPUT
   - Format: JSON.stringify (no whitespace)
   - Hash: SHA-256 hex

6. FILE HASHING
   - Content: LF-normalized before hash
   - Merkle: sorted by normalized path, "path:hash" lines
`.trim();
}
