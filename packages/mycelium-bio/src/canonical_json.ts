// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — CANONICAL JSON v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════
// Sérialisation JSON déterministe
// Garantie: même objet → même string à 100%
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sérialise un objet en JSON canonique (déterministe)
 * 
 * Règles:
 * - Clés triées alphabétiquement (récursif)
 * - Pas d'espaces ni indentation
 * - undefined → null (explicite)
 * - Numbers: pas de trailing zeros
 * 
 * @param obj - Objet à sérialiser
 * @returns String JSON canonique
 */
export function canonicalStringify(obj: unknown): string {
  return stringify(obj);
}

function stringify(value: unknown): string {
  // null
  if (value === null) {
    return "null";
  }

  // undefined → null (explicite, pas omis)
  if (value === undefined) {
    return "null";
  }

  // boolean
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  // number
  if (typeof value === "number") {
    // NaN et Infinity → null (JSON standard)
    if (!Number.isFinite(value)) {
      return "null";
    }
    // Pas de -0
    if (Object.is(value, -0)) {
      return "0";
    }
    return String(value);
  }

  // string
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  // array
  if (Array.isArray(value)) {
    const items = value.map(item => stringify(item));
    return "[" + items.join(",") + "]";
  }

  // object (Record)
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    
    const pairs = keys.map(key => {
      const val = record[key];
      // Skip undefined keys (standard JSON behavior)
      if (val === undefined) {
        return null;
      }
      return JSON.stringify(key) + ":" + stringify(val);
    }).filter((pair): pair is string => pair !== null);

    return "{" + pairs.join(",") + "}";
  }

  // Fallback: convert to string
  return JSON.stringify(String(value));
}

/**
 * Parse JSON canonique (identique à JSON.parse standard)
 * Fourni pour symétrie
 */
export function canonicalParse<T = unknown>(json: string): T {
  return JSON.parse(json) as T;
}

/**
 * Calcule un hash SHA-256 à partir d'un objet via canonical JSON
 * Utilise SubtleCrypto (navigateur/Node 15+)
 */
export async function canonicalHash(obj: unknown): Promise<string> {
  const canonical = canonicalStringify(obj);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  
  // SubtleCrypto API
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Version synchrone du hash (pour Node.js avec crypto)
 * Fallback si SubtleCrypto non disponible
 */
export function canonicalHashSync(obj: unknown): string {
  const canonical = canonicalStringify(obj);
  
  // Essai Node.js crypto
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(canonical).digest("hex");
  } catch {
    // Fallback: simple hash (NON CRYPTOGRAPHIQUE - dev only)
    let hash = 0;
    for (let i = 0; i < canonical.length; i++) {
      const char = canonical.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, "0");
  }
}

/**
 * Compare deux objets via leur forme canonique
 * Plus fiable que JSON.stringify direct
 */
export function canonicalEquals(a: unknown, b: unknown): boolean {
  return canonicalStringify(a) === canonicalStringify(b);
}

/**
 * Clone profond via canonical JSON
 * Garantit la stabilité des clés
 */
export function canonicalClone<T>(obj: T): T {
  return canonicalParse<T>(canonicalStringify(obj));
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS INLINE (Dev mode)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-test du module
 * @returns true si tous les tests passent
 */
export function selfTest(): boolean {
  const tests: Array<{ input: unknown; expected: string }> = [
    // Primitives
    { input: null, expected: "null" },
    { input: true, expected: "true" },
    { input: false, expected: "false" },
    { input: 42, expected: "42" },
    { input: 3.14, expected: "3.14" },
    { input: -0, expected: "0" },
    { input: "hello", expected: '"hello"' },
    
    // Arrays
    { input: [], expected: "[]" },
    { input: [1, 2, 3], expected: "[1,2,3]" },
    { input: [null, true, "x"], expected: '[null,true,"x"]' },
    
    // Objects (clés triées)
    { input: {}, expected: "{}" },
    { input: { b: 2, a: 1 }, expected: '{"a":1,"b":2}' },
    { input: { z: { y: 1, x: 2 } }, expected: '{"z":{"x":2,"y":1}}' },
    
    // Nested
    { 
      input: { arr: [{ b: 2, a: 1 }], num: 42 }, 
      expected: '{"arr":[{"a":1,"b":2}],"num":42}' 
    },
    
    // Edge cases
    { input: NaN, expected: "null" },
    { input: Infinity, expected: "null" },
    { input: undefined, expected: "null" },
  ];

  for (const test of tests) {
    const result = canonicalStringify(test.input);
    if (result !== test.expected) {
      console.error(`FAIL: canonicalStringify(${JSON.stringify(test.input)})`);
      console.error(`  Expected: ${test.expected}`);
      console.error(`  Got: ${result}`);
      return false;
    }
  }

  // Test déterminisme: 100 runs même résultat
  const complex = {
    emotions: { joy: 0.8, fear: 0.2, anger: 0.0 },
    metadata: { version: "1.0.0", seed: 42 },
    nodes: [{ id: "n1", value: 100 }, { id: "n2", value: 200 }]
  };
  
  const baseline = canonicalStringify(complex);
  for (let i = 0; i < 100; i++) {
    if (canonicalStringify(complex) !== baseline) {
      console.error("FAIL: Determinism test failed at iteration", i);
      return false;
    }
  }

  console.log("✅ canonical_json.ts: All tests passed");
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  stringify: canonicalStringify,
  parse: canonicalParse,
  hash: canonicalHash,
  hashSync: canonicalHashSync,
  equals: canonicalEquals,
  clone: canonicalClone,
  selfTest
};
