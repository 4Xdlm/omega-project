/**
 * OMEGA Release — Hash Engine Check
 * Phase G.0 — Verify SHA-256 engine works
 */

import type { TestCheck } from '../types.js';
import { createHash } from 'node:crypto';

/** Check that SHA-256 hash engine produces correct results */
export function checkHashEngine(): TestCheck {
  const start = Date.now();

  // Known test vector: SHA-256 of empty string
  const emptyHash = createHash('sha256').update('', 'utf-8').digest('hex');
  const expectedEmpty = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  if (emptyHash !== expectedEmpty) {
    return {
      id: 'HASH_ENGINE', name: 'Hash Engine', status: 'FAIL',
      message: `SHA-256 of empty string mismatch: got ${emptyHash}`,
      duration_ms: Date.now() - start,
    };
  }

  // Test vector: SHA-256 of "OMEGA"
  const omegaHash = createHash('sha256').update('OMEGA', 'utf-8').digest('hex');
  if (omegaHash.length !== 64) {
    return {
      id: 'HASH_ENGINE', name: 'Hash Engine', status: 'FAIL',
      message: `SHA-256 hash length invalid: ${omegaHash.length}`,
      duration_ms: Date.now() - start,
    };
  }

  return {
    id: 'HASH_ENGINE', name: 'Hash Engine', status: 'PASS',
    message: 'SHA-256 engine operational',
    duration_ms: Date.now() - start,
    details: { emptyHash, omegaHash },
  };
}
