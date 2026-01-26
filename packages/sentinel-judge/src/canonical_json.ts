/**
 * OMEGA Phase C.1.1 - Canonical JSON
 * Deterministic JSON serialization for hash stability
 * 
 * @module canonical_json
 * @version 1.0.0
 */

// =============================================================================
// CANONICAL JSON SERIALIZATION
// =============================================================================

/**
 * Recursively sort object keys for deterministic serialization
 */
function sortObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }

  if (typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  return obj;
}

/**
 * Serialize object to canonical JSON string
 * - Keys sorted alphabetically at all levels
 * - No whitespace
 * - Deterministic output
 */
export function toCanonicalJson(obj: unknown): string {
  const sorted = sortObject(obj);
  return JSON.stringify(sorted);
}

/**
 * Parse canonical JSON and return sorted object
 */
export function fromCanonicalJson<T = unknown>(json: string): T {
  const parsed = JSON.parse(json);
  return sortObject(parsed) as T;
}

/**
 * Compare two values for deep equality after canonical sorting
 */
export function canonicalEquals(a: unknown, b: unknown): boolean {
  return toCanonicalJson(a) === toCanonicalJson(b);
}

/**
 * Create a canonical copy of an object (sorted keys at all levels)
 */
export function canonicalize<T>(obj: T): T {
  return fromCanonicalJson<T>(toCanonicalJson(obj));
}

// =============================================================================
// DETERMINISM VERIFICATION
// =============================================================================

/**
 * Verify that an object serializes deterministically
 * Runs multiple serializations and compares results
 */
export function verifyDeterminism(obj: unknown, iterations: number = 10): boolean {
  const first = toCanonicalJson(obj);
  for (let i = 0; i < iterations; i++) {
    if (toCanonicalJson(obj) !== first) {
      return false;
    }
  }
  return true;
}

/**
 * Get canonical JSON with formatted output for debugging
 */
export function toCanonicalJsonPretty(obj: unknown): string {
  const sorted = sortObject(obj);
  return JSON.stringify(sorted, null, 2);
}
