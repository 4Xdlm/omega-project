/**
 * OMEGA Canon Kernel — Canonical Serialization
 *
 * CRITICAL: This is the ONLY way to serialize objects for hashing.
 * JSON.stringify is FORBIDDEN for hash computation.
 *
 * Rules:
 * - Objects: keys sorted lexicographically, recursive
 * - Arrays: preserve order (caller must sort if needed)
 * - Primitives: string/number/boolean/null only
 * - undefined: FORBIDDEN (throws error)
 * - Functions: FORBIDDEN (throws error)
 * - Symbols: FORBIDDEN (throws error)
 * - BigInt: converted to string with "n" suffix
 * - Date: converted to ISO string
 */

export type CanonicalPrimitive = string | number | boolean | null;
export type CanonicalValue = CanonicalPrimitive | CanonicalArray | CanonicalObject;
export type CanonicalArray = readonly CanonicalValue[];
export type CanonicalObject = { readonly [key: string]: CanonicalValue };

/**
 * Canonicalize any value for deterministic hashing.
 * @throws Error if value contains undefined, functions, or symbols
 */
export function canonicalize(value: unknown): string {
  return canonicalizeValue(value);
}

function canonicalizeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    throw new Error('canonicalize: undefined is forbidden');
  }

  const type = typeof value;

  if (type === 'string') {
    // JSON.stringify handles proper escaping for strings
    return JSON.stringify(value);
  }

  if (type === 'number') {
    const num = value as number;
    if (!Number.isFinite(num)) {
      throw new Error('canonicalize: Infinity and NaN are forbidden');
    }
    // Normalize -0 to 0
    if (Object.is(num, -0)) {
      return '0';
    }
    return String(num);
  }

  if (type === 'boolean') {
    return String(value);
  }

  if (type === 'bigint') {
    // BigInt serialized as string with 'n' suffix for clarity
    return `"${String(value)}n"`;
  }

  if (type === 'function') {
    throw new Error('canonicalize: function is forbidden');
  }

  if (type === 'symbol') {
    throw new Error('canonicalize: symbol is forbidden');
  }

  // Date handling
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new Error('canonicalize: Invalid Date is forbidden');
    }
    return JSON.stringify(value.toISOString());
  }

  // Array handling (preserve order)
  if (Array.isArray(value)) {
    const items = value.map(canonicalizeValue);
    return `[${items.join(',')}]`;
  }

  // Object handling (sort keys)
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort(); // Lexicographic sort
  const pairs: string[] = [];

  for (const key of keys) {
    const v = obj[key];
    // Skip undefined values (they don't exist in canonical form)
    if (v === undefined) {
      continue;
    }
    pairs.push(`${JSON.stringify(key)}:${canonicalizeValue(v)}`);
  }

  return `{${pairs.join(',')}}`;
}

/**
 * Verify that canonicalize produces identical output for equivalent inputs.
 */
export function verifyCanonicalEquivalence(a: unknown, b: unknown): boolean {
  try {
    return canonicalize(a) === canonicalize(b);
  } catch {
    return false;
  }
}

/**
 * Deep sort arrays at specified paths (for unordered collections).
 * Returns a new object with arrays sorted.
 */
export function sortArraysAtPaths(
  value: unknown,
  paths: readonly string[][],
  sortKey?: string
): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sortArraysAtPaths(item, paths, sortKey));
  }

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const v = obj[key];
    const matchingPaths = paths.filter(p => p[0] === key);

    if (matchingPaths.length > 0 && Array.isArray(v)) {
      // This is an array that should be sorted
      const sorted = [...v].sort((a, b) => {
        if (sortKey && typeof a === 'object' && typeof b === 'object' && a && b) {
          const aKey = String((a as Record<string, unknown>)[sortKey] ?? '');
          const bKey = String((b as Record<string, unknown>)[sortKey] ?? '');
          return aKey.localeCompare(bKey);
        }
        return canonicalize(a).localeCompare(canonicalize(b));
      });
      result[key] = sorted.map(item =>
        sortArraysAtPaths(item, matchingPaths.map(p => p.slice(1)).filter(p => p.length > 0), sortKey)
      );
    } else {
      result[key] = sortArraysAtPaths(v, paths.map(p => p[0] === key ? p.slice(1) : p).filter(p => p.length > 0), sortKey);
    }
  }

  return result;
}
