/**
 * OMEGA V4.4 — Phase 2: Deterministic Hash Utilities
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * SHA-256 hashing for deterministic output verification.
 * Uses Node.js crypto module.
 */

import { createHash } from 'node:crypto';

/**
 * Compute SHA-256 hash of a string
 * @param data - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}

/**
 * Compute SHA-256 hash of an object (via JSON serialization)
 * Uses deterministic JSON serialization (sorted keys)
 * @param obj - Object to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function hashObject(obj: unknown): string {
  const json = deterministicStringify(obj);
  return sha256(json);
}

/**
 * Deterministic JSON stringify with sorted keys
 * Ensures same object always produces same string
 * @param obj - Object to stringify
 * @returns Deterministic JSON string
 */
export function deterministicStringify(obj: unknown): string {
  return JSON.stringify(obj, sortedReplacer);
}

/**
 * JSON replacer that sorts object keys
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Map) {
    // Convert Map to sorted array of entries
    const entries = Array.from(value.entries()).sort((a, b) => {
      const aKey = String(a[0]);
      const bKey = String(b[0]);
      return aKey.localeCompare(bKey);
    });
    return { __type: 'Map', entries };
  }

  if (value instanceof Set) {
    // Convert Set to sorted array
    const values = Array.from(value).sort((a, b) => {
      return String(a).localeCompare(String(b));
    });
    return { __type: 'Set', values };
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    // Sort object keys
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const k of keys) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }

  return value;
}

/**
 * Compute hash of configuration for traceability
 * @param config - Configuration object
 * @returns 8-character hash prefix
 */
export function computeConfigHash(config: unknown): string {
  const fullHash = hashObject(config);
  return fullHash.substring(0, 16);
}

/**
 * Verify two hashes match
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns True if hashes match
 */
export function verifyHash(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase();
}
