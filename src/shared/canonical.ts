/**
 * OMEGA Canonical JSON v1.0 (Francky: Option 2 - custom)
 * Phase C - NASA-Grade L4
 *
 * EXHAUSTIVE RULES (no interpretation):
 * 1. Recursive key sorting (lexicographic UTF-8)
 * 2. No spaces between elements
 * 3. Strings escaped per RFC 8259
 * 4. Numbers: no trailing zeros, no +, no leading zeros
 * 5. null, true, false in lowercase
 * 6. Arrays preserved in original order
 * 7. UTF-8 strict, no BOM
 *
 * INVARIANTS:
 * - INV-CANONICAL-01: All hashes = SHA256(canonicalize(obj))
 * - INV-CANONICAL-02: Idempotent after parse
 * - INV-CANONICAL-03: Unsupported type = throw
 */

import { createHash } from 'crypto';

export class CanonicalizeError extends Error {
  constructor(message: string) {
    super(`INV-CANONICAL: ${message}`);
    this.name = 'CanonicalizeError';
  }
}

export function canonicalize(value: unknown): string {
  if (value === null) return 'null';

  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CanonicalizeError('non-finite number not allowed');
    }
    return JSON.stringify(value);
  }

  if (typeof value === 'string') return JSON.stringify(value);

  if (typeof value === 'bigint') {
    // Convert bigint to string representation for JSON
    return `"${value.toString()}"`;
  }

  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k]));
    return '{' + pairs.join(',') + '}';
  }

  throw new CanonicalizeError(`unsupported type: ${typeof value}`);
}

export function verifyCanonical(str: string): boolean {
  try {
    return canonicalize(JSON.parse(str)) === str;
  } catch {
    return false;
  }
}

export function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function hashCanonical(obj: unknown): string {
  return sha256(canonicalize(obj));
}
