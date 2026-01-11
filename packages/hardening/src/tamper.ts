/**
 * @fileoverview OMEGA Hardening - Tamper Detection
 * @module @omega/hardening/tamper
 *
 * Tamper detection and integrity verification.
 */

import { sha256, stableStringify } from '@omega/orchestrator-core';
import type {
  TamperCheckResult,
  TamperCheck,
  HashVerificationResult,
  IntegrityCheckResult,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HASH VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify content against expected hash.
 */
export function verifyHash(
  content: string,
  expectedHash: string
): HashVerificationResult {
  const actualHash = sha256(content);
  return {
    valid: actualHash === expectedHash,
    expected: expectedHash,
    actual: actualHash,
    algorithm: 'sha256',
  };
}

/**
 * Compute hash for content.
 */
export function computeHash(content: string): string {
  return sha256(content);
}

/**
 * Verify object against expected hash (uses stable JSON).
 */
export function verifyObjectHash(
  obj: unknown,
  expectedHash: string
): HashVerificationResult {
  const content = stableStringify(obj);
  return verifyHash(content, expectedHash);
}

/**
 * Compute hash for object (uses stable JSON).
 */
export function computeObjectHash(obj: unknown): string {
  return sha256(stableStringify(obj));
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRITY VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify multiple files against a hash manifest.
 */
export function verifyManifest(
  manifest: Record<string, string>,
  contents: Record<string, string>
): readonly IntegrityCheckResult[] {
  const results: IntegrityCheckResult[] = [];

  for (const [path, expectedHash] of Object.entries(manifest)) {
    const content = contents[path];

    if (content === undefined) {
      results.push({
        valid: false,
        path,
        hashResult: {
          valid: false,
          expected: expectedHash,
          actual: '',
          algorithm: 'sha256',
        },
        error: 'File not found',
      });
      continue;
    }

    const hashResult = verifyHash(content, expectedHash);
    results.push({
      valid: hashResult.valid,
      path,
      hashResult,
      error: hashResult.valid ? undefined : 'Hash mismatch',
    });
  }

  return results;
}

/**
 * Generate a hash manifest from contents.
 */
export function generateManifest(
  contents: Record<string, string>
): Record<string, string> {
  const manifest: Record<string, string> = {};

  for (const [path, content] of Object.entries(contents)) {
    manifest[path] = computeHash(content);
  }

  return manifest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAMPER DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check for tampering in an object.
 */
export function checkTamper(
  obj: unknown,
  expectedHash: string
): TamperCheckResult {
  const checks: TamperCheck[] = [];

  // Check 1: Object type
  const isObject = obj !== null && typeof obj === 'object';
  checks.push({
    name: 'object_type',
    passed: isObject,
    message: isObject ? undefined : 'Value is not an object',
  });

  if (!isObject) {
    return { tampered: true, checks };
  }

  // Check 2: Prototype chain
  const proto = Object.getPrototypeOf(obj);
  const hasCleanPrototype = proto === Object.prototype || proto === null || Array.isArray(obj);
  checks.push({
    name: 'prototype_chain',
    passed: hasCleanPrototype,
    message: hasCleanPrototype ? undefined : 'Object has modified prototype',
  });

  // Check 3: No __proto__ property
  const hasProtoKey = Object.prototype.hasOwnProperty.call(obj, '__proto__');
  checks.push({
    name: 'no_proto_key',
    passed: !hasProtoKey,
    message: hasProtoKey ? 'Object has __proto__ key' : undefined,
  });

  // Check 4: Hash verification
  const hashResult = verifyObjectHash(obj, expectedHash);
  checks.push({
    name: 'hash_match',
    passed: hashResult.valid,
    message: hashResult.valid
      ? undefined
      : `Hash mismatch: expected ${expectedHash.slice(0, 8)}..., got ${hashResult.actual.slice(0, 8)}...`,
  });

  const tampered = checks.some((c) => !c.passed);
  return { tampered, checks };
}

/**
 * Create a protected copy of an object with embedded hash.
 */
export function protectObject<T extends object>(
  obj: T,
  timestamp: string = new Date().toISOString()
): T & { __hash: string; __timestamp: string } {
  const hash = computeObjectHash(obj);

  const protected_ = {
    ...obj,
    __hash: hash,
    __timestamp: timestamp,
  };

  return Object.freeze(protected_) as T & { __hash: string; __timestamp: string };
}

/**
 * Verify a protected object.
 */
export function verifyProtectedObject(
  obj: unknown
): TamperCheckResult {
  const checks: TamperCheck[] = [];

  // Check 1: Is object
  if (obj === null || typeof obj !== 'object') {
    return {
      tampered: true,
      checks: [{
        name: 'object_type',
        passed: false,
        message: 'Value is not an object',
      }],
    };
  }

  const record = obj as Record<string, unknown>;

  // Check 2: Has __hash
  const hasHash = typeof record.__hash === 'string' && record.__hash.length === 64;
  checks.push({
    name: 'has_hash',
    passed: hasHash,
    message: hasHash ? undefined : 'Missing or invalid __hash',
  });

  if (!hasHash) {
    return { tampered: true, checks };
  }

  // Check 3: Has __timestamp
  const hasTimestamp = typeof record.__timestamp === 'string';
  checks.push({
    name: 'has_timestamp',
    passed: hasTimestamp,
    message: hasTimestamp ? undefined : 'Missing __timestamp',
  });

  // Check 4: Verify hash (excluding metadata fields)
  const { __hash, __timestamp, ...content } = record;
  const expectedHash = __hash as string;
  const hashResult = verifyObjectHash(content, expectedHash);
  checks.push({
    name: 'hash_match',
    passed: hashResult.valid,
    message: hashResult.valid
      ? undefined
      : `Hash mismatch: content has been modified`,
  });

  const tampered = checks.some((c) => !c.passed);
  return { tampered, checks };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Seal data for storage.
 */
export interface SealedData {
  readonly version: '1.0.0';
  readonly algorithm: 'sha256';
  readonly hash: string;
  readonly sealedAt: string;
  readonly payload: string;
}

/**
 * Seal a payload for secure storage.
 */
export function seal(payload: unknown): SealedData {
  const payloadStr = stableStringify(payload);
  const hash = computeHash(payloadStr);

  return Object.freeze({
    version: '1.0.0' as const,
    algorithm: 'sha256' as const,
    hash,
    sealedAt: new Date().toISOString(),
    payload: payloadStr,
  });
}

/**
 * Unseal and verify sealed data.
 */
export function unseal<T = unknown>(
  sealed: SealedData
): { valid: boolean; payload: T | null; error?: string } {
  // Verify version
  if (sealed.version !== '1.0.0') {
    return { valid: false, payload: null, error: 'Unsupported seal version' };
  }

  // Verify algorithm
  if (sealed.algorithm !== 'sha256') {
    return { valid: false, payload: null, error: 'Unsupported algorithm' };
  }

  // Verify hash
  const actualHash = computeHash(sealed.payload);
  if (actualHash !== sealed.hash) {
    return { valid: false, payload: null, error: 'Hash verification failed' };
  }

  // Parse payload
  try {
    const payload = JSON.parse(sealed.payload) as T;
    return { valid: true, payload };
  } catch {
    return { valid: false, payload: null, error: 'Payload parse error' };
  }
}
