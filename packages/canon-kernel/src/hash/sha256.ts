/**
 * OMEGA Canon Kernel — SHA-256 Wrapper
 * Uses Node.js crypto (no external dependencies).
 */

import { createHash } from 'crypto';
import { type RootHash, isValidRootHash } from '../types/identifiers';

/**
 * Compute SHA-256 hash of a UTF-8 string.
 * @returns lowercase hex string (64 characters)
 */
export function sha256(input: string): RootHash {
  const hash = createHash('sha256').update(input, 'utf8').digest('hex');
  // Sanity check (should never fail)
  if (!isValidRootHash(hash)) {
    throw new Error('sha256: produced invalid hash (internal error)');
  }
  return hash;
}

/**
 * Compute SHA-256 hash of a Buffer.
 * @returns lowercase hex string (64 characters)
 */
export function sha256Buffer(input: Buffer): RootHash {
  const hash = createHash('sha256').update(input).digest('hex');
  return hash as RootHash;
}

/**
 * Compute SHA-256 hash of multiple inputs concatenated.
 * Inputs are joined with null byte separator for unambiguous concatenation.
 */
export function sha256Multi(...inputs: readonly string[]): RootHash {
  const combined = inputs.join('\0');
  return sha256(combined);
}

/**
 * Verify that a hash matches expected value.
 */
export function verifyHash(input: string, expectedHash: RootHash): boolean {
  return sha256(input) === expectedHash.toLowerCase();
}
