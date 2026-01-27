/**
 * OMEGA Phase C.1.2 - Digest / Hash Computation (FIXED)
 * 
 * Version: 1.2.0
 * Date: 2026-01-26
 * Standard: NASA-Grade L4
 * 
 * Purpose:
 * - SHA-256 computation for deterministic hashing
 * - Volatile field exclusion
 * - Byte-identical digests for same structural content
 */

import { createHash } from 'crypto';
import { canonicalStringify } from './canonical_json.js';
import {
  SentinelJudgeError,
  ERROR_CODES,
  DECISION_REQUEST_VOLATILE_FIELDS,
  JUDGEMENT_VOLATILE_FIELDS,
} from './types.js';

// =============================================================================
// VOLATILE FIELD STRIPPING
// =============================================================================

/**
 * Recursively strips specified fields from an object.
 * Creates a new object without mutating the original.
 * 
 * @param obj - Object to strip fields from
 * @param fieldsToStrip - Array of field names to remove
 * @returns New object with fields removed
 */
export function stripVolatileFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToStrip: readonly string[]
): Partial<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' && item !== null
        ? stripVolatileFields(item as Record<string, unknown>, fieldsToStrip)
        : item
    ) as unknown as Partial<T>;
  }
  
  const result: Record<string, unknown> = {};
  const stripSet = new Set(fieldsToStrip);
  
  for (const [key, value] of Object.entries(obj)) {
    if (stripSet.has(key)) {
      continue; // Skip volatile field
    }
    
    if (typeof value === 'object' && value !== null) {
      result[key] = stripVolatileFields(
        value as Record<string, unknown>,
        fieldsToStrip
      );
    } else {
      result[key] = value;
    }
  }
  
  return result as Partial<T>;
}

/**
 * Strips volatile fields from a DecisionRequest.
 * Removes: submittedAt
 */
export function stripDecisionRequestVolatile<T extends Record<string, unknown>>(
  request: T
): Partial<T> {
  return stripVolatileFields(request, DECISION_REQUEST_VOLATILE_FIELDS);
}

/**
 * Strips volatile fields from a Judgement.
 * Removes: executedAt, executionDurationMs, judgementHash
 */
export function stripJudgementVolatile<T extends Record<string, unknown>>(
  judgement: T
): Partial<T> {
  return stripVolatileFields(judgement, JUDGEMENT_VOLATILE_FIELDS);
}

// =============================================================================
// SHA-256 COMPUTATION
// =============================================================================

/**
 * Computes SHA-256 hash of a string.
 * Returns lowercase hexadecimal string (64 characters).
 * 
 * @param input - String to hash
 * @returns SHA-256 hash as lowercase hex string
 */
export function computeSha256(input: string): string {
  try {
    return createHash('sha256').update(input, 'utf8').digest('hex');
  } catch (error) {
    throw new SentinelJudgeError(
      ERROR_CODES.DIGEST_01,
      `Hash computation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: String(error) }
    );
  }
}

/**
 * Shorthand alias for computeSha256.
 * Commonly used in tests and gates.
 */
export const sha256 = computeSha256;

/**
 * Computes SHA-256 hash of a buffer.
 * Returns lowercase hexadecimal string (64 characters).
 * 
 * @param input - Buffer to hash
 * @returns SHA-256 hash as lowercase hex string
 */
export function computeSha256Buffer(input: Buffer): string {
  try {
    return createHash('sha256').update(input).digest('hex');
  } catch (error) {
    throw new SentinelJudgeError(
      ERROR_CODES.DIGEST_01,
      `Hash computation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: String(error) }
    );
  }
}

// =============================================================================
// DIGEST COMPUTATION
// =============================================================================

/**
 * Computes digest of an object.
 * 
 * Process:
 * 1. Strip volatile fields
 * 2. Convert to canonical JSON
 * 3. Compute SHA-256
 * 
 * @param obj - Object to compute digest for
 * @param volatileFields - Fields to exclude from hash
 * @returns SHA-256 digest as lowercase hex string
 */
export function computeDigest(
  obj: Record<string, unknown>,
  volatileFields: readonly string[] = []
): string {
  const stripped = stripVolatileFields(obj, volatileFields);
  const canonical = canonicalStringify(stripped);
  return computeSha256(canonical);
}

/**
 * Computes digest of a DecisionRequest.
 * Excludes: submittedAt
 */
export function computeDecisionRequestDigest(
  request: Record<string, unknown>
): string {
  return computeDigest(request, DECISION_REQUEST_VOLATILE_FIELDS);
}

/**
 * Computes digest of a Judgement.
 * Excludes: executedAt, executionDurationMs, judgementHash
 */
export function computeJudgementDigest(
  judgement: Record<string, unknown>
): string {
  return computeDigest(judgement, JUDGEMENT_VOLATILE_FIELDS);
}

/**
 * Verifies that a hash matches the computed digest.
 * 
 * @param obj - Object to verify
 * @param expectedHash - Expected hash value
 * @param volatileFields - Fields to exclude from hash
 * @returns true if hash matches
 */
export function verifyDigest(
  obj: Record<string, unknown>,
  expectedHash: string,
  volatileFields: readonly string[] = []
): boolean {
  const computed = computeDigest(obj, volatileFields);
  return computed === expectedHash.toLowerCase();
}

/**
 * Computes digest of a claim payload for payloadHash field.
 */
export function computePayloadHash(payload: Record<string, unknown>): string {
  const canonical = canonicalStringify(payload);
  return computeSha256(canonical);
}
