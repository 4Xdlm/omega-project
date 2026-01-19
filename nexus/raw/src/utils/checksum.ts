/**
 * Checksum Utilities
 * Standard: NASA-Grade L4
 *
 * Uses SHA-256 for data integrity verification
 */

import { createHash } from 'node:crypto';
import { RawChecksumMismatchError } from '../errors.js';

// ============================================================
// Checksum Generation
// ============================================================

/**
 * Computes SHA-256 checksum of data.
 */
export function computeChecksum(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Verifies data against expected checksum.
 */
export function verifyChecksum(data: Buffer, expected: string): boolean {
  const actual = computeChecksum(data);
  return actual === expected;
}

/**
 * Verifies data and throws if checksum doesn't match.
 */
export function assertChecksum(
  data: Buffer,
  expected: string,
  context: Record<string, unknown> = {}
): void {
  const actual = computeChecksum(data);
  if (actual !== expected) {
    throw new RawChecksumMismatchError('Checksum verification failed', {
      ...context,
      expected,
      actual,
    });
  }
}
