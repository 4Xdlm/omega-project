// ═══════════════════════════════════════════════════════════════════════════
// OMEGA SCRIBE v1.0 — CANONICALIZATION
// Version: 1.0.0
// Date: 01 janvier 2026
// Certification: NASA-GRADE AS9100D / DO-178C
// ═══════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';
import stringify from 'fast-json-stable-stringify';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unicode quote characters to normalize
 */
const QUOTE_PAIRS: [RegExp, string][] = [
  [/[\u201C\u201D]/g, '"'],  // Smart double quotes → straight
  [/[\u2018\u2019]/g, "'"],  // Smart single quotes → straight
  [/[\u00AB\u00BB]/g, '"'],  // Guillemets « » → straight
  [/[\u2039\u203A]/g, "'"],  // Single guillemets ‹ › → straight
];

/**
 * Whitespace patterns
 */
const MULTIPLE_SPACES = /[ \t]+/g;
const TRAILING_SPACE_BEFORE_NEWLINE = / +\n/g;
const MULTIPLE_NEWLINES = /\n{3,}/g;
const CRLF = /\r\n/g;
const CR = /\r/g;

// ─────────────────────────────────────────────────────────────────────────────
// TEXT CANONICALIZATION (NFKC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonicalizes text using NFKC normalization + whitespace normalization
 * 
 * @invariant SCRIBE-I05: Same semantic content = same hash
 * 
 * Steps:
 * 1. NFKC Unicode normalization
 * 2. Line ending normalization (CRLF/CR → LF)
 * 3. Quote normalization (smart quotes → straight)
 * 4. Multiple spaces/tabs → single space
 * 5. Trailing spaces before newlines removed
 * 6. Multiple consecutive newlines → max 2
 * 7. Trim start and end
 * 
 * @param input Raw text
 * @returns Canonicalized text
 */
export function canonicalizeText(input: string): string {
  // 1. NFKC normalization (handles ligatures, compatibility chars, etc.)
  let result = input.normalize('NFKC');
  
  // 2. Line ending normalization
  result = result.replace(CRLF, '\n');
  result = result.replace(CR, '\n');
  
  // 3. Quote normalization
  for (const [pattern, replacement] of QUOTE_PAIRS) {
    result = result.replace(pattern, replacement);
  }
  
  // 4. Multiple spaces/tabs → single space (but preserve newlines)
  result = result.replace(MULTIPLE_SPACES, ' ');
  
  // 5. Trailing spaces before newlines
  result = result.replace(TRAILING_SPACE_BEFORE_NEWLINE, '\n');
  
  // 6. Multiple consecutive newlines → max 2 (paragraph break)
  result = result.replace(MULTIPLE_NEWLINES, '\n\n');
  
  // 7. Trim
  result = result.trim();
  
  return result;
}

/**
 * Canonicalizes text for output comparison
 * More aggressive normalization for comparing generated texts
 * 
 * @param input Raw text
 * @returns Canonical output text
 */
export function canonicalizeOutput(input: string): string {
  // Base canonicalization
  let result = canonicalizeText(input);
  
  // Additional: normalize em-dashes and en-dashes
  result = result.replace(/[\u2013\u2014]/g, '-');
  
  // Additional: normalize ellipsis
  result = result.replace(/\u2026/g, '...');
  
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON CANONICALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonicalizes JSON object for deterministic hashing
 * 
 * Uses fast-json-stable-stringify for key ordering
 * Then applies NFKC to all string values
 * 
 * @invariant SCRIBE-I02: Same input = same hash (deterministic)
 * 
 * @param obj Any JSON-serializable object
 * @returns Canonical JSON string
 */
export function canonicalizeJson(obj: unknown): string {
  // Deep clone and normalize string values
  const normalized = normalizeStringsInObject(obj);
  
  // Stable stringify (sorted keys)
  return stringify(normalized);
}

/**
 * Recursively normalizes all strings in an object using NFKC
 * 
 * @param obj Input object
 * @returns Object with all strings NFKC-normalized
 */
function normalizeStringsInObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return obj.normalize('NFKC');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(normalizeStringsInObject);
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      // Also normalize keys
      const normalizedKey = key.normalize('NFKC');
      result[normalizedKey] = normalizeStringsInObject((obj as Record<string, unknown>)[key]);
    }
    return result;
  }
  
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// HASH COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes SHA-256 hash of a string
 * 
 * @param input Input string (should be canonicalized first)
 * @returns 64-character hex hash
 */
export function sha256(input: string): string {
  const hash = createHash('sha256');
  hash.update(input, 'utf-8');
  return hash.digest('hex');
}

/**
 * Computes canonical hash of text
 * 
 * @invariant SCRIBE-I05: Same semantic text = same hash
 * 
 * @param text Raw text
 * @returns SHA-256 hash of canonicalized text
 */
export function hashText(text: string): string {
  const canonical = canonicalizeText(text);
  return sha256(canonical);
}

/**
 * Computes canonical hash of JSON object
 * 
 * @invariant SCRIBE-I02: Same object = same hash (deterministic)
 * 
 * @param obj JSON-serializable object
 * @returns SHA-256 hash of canonicalized JSON
 */
export function hashJson(obj: unknown): string {
  const canonical = canonicalizeJson(obj);
  return sha256(canonical);
}

/**
 * Computes hash of output text (more aggressive canonicalization)
 * 
 * @param text Output text
 * @returns SHA-256 hash
 */
export function hashOutput(text: string): string {
  const canonical = canonicalizeOutput(text);
  return sha256(canonical);
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies two texts are semantically equivalent
 * (same canonical form)
 * 
 * @param text1 First text
 * @param text2 Second text
 * @returns true if canonically equivalent
 */
export function textsEquivalent(text1: string, text2: string): boolean {
  return canonicalizeText(text1) === canonicalizeText(text2);
}

/**
 * Verifies two JSON objects are canonically equivalent
 * 
 * @param obj1 First object
 * @param obj2 Second object
 * @returns true if canonically equivalent
 */
export function jsonEquivalent(obj1: unknown, obj2: unknown): boolean {
  return canonicalizeJson(obj1) === canonicalizeJson(obj2);
}

/**
 * Computes hash and returns both the canonical form and hash
 * Useful for debugging
 * 
 * @param text Input text
 * @returns Object with canonical text and hash
 */
export function hashWithCanonical(text: string): { canonical: string; hash: string } {
  const canonical = canonicalizeText(text);
  return {
    canonical,
    hash: sha256(canonical)
  };
}

/**
 * Computes JSON hash and returns both the canonical form and hash
 * Useful for debugging
 * 
 * @param obj Input object
 * @returns Object with canonical JSON and hash
 */
export function hashJsonWithCanonical(obj: unknown): { canonical: string; hash: string } {
  const canonical = canonicalizeJson(obj);
  return {
    canonical,
    hash: sha256(canonical)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tests determinism: runs hash N times and verifies consistency
 * 
 * @param input Input string or object
 * @param runs Number of runs (default 100)
 * @returns Result object with pass/fail and details
 */
export function testDeterminism(
  input: string | object,
  runs: number = 100
): { passed: boolean; hash: string; runs: number; inconsistencies: string[] } {
  const isString = typeof input === 'string';
  const firstHash = isString ? hashText(input as string) : hashJson(input);
  const inconsistencies: string[] = [];
  
  for (let i = 0; i < runs; i++) {
    const currentHash = isString ? hashText(input as string) : hashJson(input);
    if (currentHash !== firstHash) {
      inconsistencies.push(`Run ${i}: ${currentHash} !== ${firstHash}`);
    }
  }
  
  return {
    passed: inconsistencies.length === 0,
    hash: firstHash,
    runs,
    inconsistencies
  };
}

/**
 * Tests semantic equivalence across different encodings
 * 
 * @param variants Array of strings that should be semantically equivalent
 * @returns Result object
 */
export function testEquivalence(
  variants: string[]
): { passed: boolean; hash: string; nonMatching: Array<{ index: number; hash: string }> } {
  if (variants.length === 0) {
    return { passed: true, hash: '', nonMatching: [] };
  }
  
  const firstHash = hashText(variants[0]);
  const nonMatching: Array<{ index: number; hash: string }> = [];
  
  for (let i = 1; i < variants.length; i++) {
    const hash = hashText(variants[i]);
    if (hash !== firstHash) {
      nonMatching.push({ index: i, hash });
    }
  }
  
  return {
    passed: nonMatching.length === 0,
    hash: firstHash,
    nonMatching
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const Canonicalize = {
  // Text
  text: canonicalizeText,
  output: canonicalizeOutput,
  
  // JSON
  json: canonicalizeJson,
  
  // Hashing
  sha256,
  hashText,
  hashJson,
  hashOutput,
  
  // With canonical
  hashWithCanonical,
  hashJsonWithCanonical,
  
  // Verification
  textsEquivalent,
  jsonEquivalent,
  
  // Testing
  testDeterminism,
  testEquivalence
};

export default Canonicalize;
