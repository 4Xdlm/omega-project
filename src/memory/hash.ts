/**
 * OMEGA Memory System - Hash Utilities
 * Phase D2 - NASA-Grade L4
 * 
 * Deterministic hashing for chain integrity.
 * Canonical JSON serialization for reproducibility.
 */

import { createHash } from 'crypto';
import type { HashValue, MemoryEntry } from './types.js';
import { toHashValue } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SHA-256 COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute SHA-256 hex hash of string or buffer
 */
export function sha256Hex(data: string | Buffer): HashValue {
  const hash = createHash('sha256').update(data).digest('hex');
  return toHashValue(hash);
}

/**
 * Compute SHA-256 of a file (streaming, memory-bounded)
 */
export async function sha256File(filePath: string): Promise<HashValue> {
  const { createReadStream } = await import('fs');
  
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('end', () => resolve(toHashValue(hash.digest('hex'))));
    stream.on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL JSON - Deterministic serialization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sort object keys recursively for deterministic serialization.
 * Arrays preserve order. Null/primitives pass through.
 */
function sortKeysRecursive(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map(sortKeysRecursive);
  }
  
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    
    for (const key of keys) {
      sorted[key] = sortKeysRecursive((value as Record<string, unknown>)[key]);
    }
    
    return sorted;
  }
  
  return value;
}

/**
 * Canonical JSON: sorted keys, no whitespace, deterministic.
 * Same input ALWAYS produces same output.
 */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(sortKeysRecursive(value));
}

/**
 * Stable JSON: sorted keys with formatting (2-space indent + newline).
 * For human-readable outputs that remain deterministic.
 */
export function stableJSON(value: unknown): string {
  return JSON.stringify(sortKeysRecursive(value), null, 2) + '\n';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY HASH COMPUTATION - Chain integrity
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute hash for a memory entry.
 * Hash = SHA256(prevHash + canonicalJSON(entry))
 * 
 * @param entry - The entry to hash (without internal _hash/_prevHash)
 * @param prevHash - Previous entry's hash (null for genesis)
 * @returns Computed hash value
 */
export function computeEntryHash(entry: MemoryEntry, prevHash: HashValue | null): HashValue {
  // Create clean entry without internal fields
  const cleanEntry: MemoryEntry = {
    id: entry.id,
    ts_utc: entry.ts_utc,
    author: entry.author,
    class: entry.class,
    scope: entry.scope,
    payload: entry.payload,
    meta: entry.meta,
  };
  
  const content = canonicalJSON(cleanEntry);
  const hashInput = prevHash !== null ? `${prevHash}${content}` : content;
  
  return sha256Hex(hashInput);
}

/**
 * Verify entry hash matches expected
 */
export function verifyEntryHash(
  entry: MemoryEntry,
  prevHash: HashValue | null,
  expectedHash: HashValue
): boolean {
  const computed = computeEntryHash(entry, prevHash);
  return computed === expectedHash;
}
