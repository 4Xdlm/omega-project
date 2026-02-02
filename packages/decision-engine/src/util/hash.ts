/**
 * @fileoverview Simple hash utility for decision-engine.
 * @module @omega/decision-engine/util/hash
 */

/**
 * Simple hash function using Web Crypto API or fallback.
 * @param data - String to hash
 * @returns Hex-encoded hash
 */
export function simpleHash(data: string): string {
  // Simple djb2 hash for consistency
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Hash a JSON-serializable value.
 * @param value - Value to hash
 * @returns Hash string
 */
export function hashJson(value: unknown): string {
  const json = JSON.stringify(value, Object.keys(value as object).sort());
  return simpleHash(json);
}
