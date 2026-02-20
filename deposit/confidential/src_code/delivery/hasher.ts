/**
 * OMEGA Delivery Hasher v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * SHA256 hashing and hash chain utilities for delivery artifacts.
 *
 * INVARIANTS:
 * - H-INV-05: Stable hashes (deterministic output)
 * - H-INV-09: Hash chain continuity
 *
 * SPEC: DELIVERY_SPEC v1.0 §H2
 */

import { createHash } from 'crypto';
import type { Sha256, ISO8601 } from './types';
import { isSha256 } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes SHA256 hash of string content.
 *
 * @param content - Content to hash
 * @returns SHA256 hash
 */
export function hashString(content: string): Sha256 {
  return createHash('sha256').update(content, 'utf-8').digest('hex') as Sha256;
}

/**
 * Computes SHA256 hash of Buffer.
 *
 * @param buffer - Buffer to hash
 * @returns SHA256 hash
 */
export function hashBuffer(buffer: Buffer): Sha256 {
  return createHash('sha256').update(buffer).digest('hex') as Sha256;
}

/**
 * Computes SHA256 hash of multiple values concatenated.
 *
 * @param values - Values to concatenate and hash
 * @returns SHA256 hash
 */
export function hashConcat(...values: string[]): Sha256 {
  const combined = values.join('');
  return hashString(combined);
}

/**
 * Computes SHA256 hash of JSON object (deterministic).
 *
 * @param obj - Object to hash
 * @returns SHA256 hash
 */
export function hashObject(obj: unknown): Sha256 {
  // Use sorted keys for deterministic serialization
  const json = JSON.stringify(obj, Object.keys(obj as object).sort());
  return hashString(json);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifies content against expected hash.
 *
 * @param content - Content to verify
 * @param expectedHash - Expected SHA256 hash
 * @returns true if hash matches
 */
export function verifyHash(content: string, expectedHash: Sha256): boolean {
  const computed = hashString(content);
  return computed === expectedHash;
}

/**
 * Verifies multiple hashes match.
 *
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns true if hashes match
 */
export function hashesMatch(hash1: Sha256, hash2: Sha256): boolean {
  return hash1 === hash2;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hash chain entry for delivery tracking.
 */
export interface HashChainEntry {
  readonly index: number;
  readonly hash: Sha256;
  readonly previousHash: Sha256 | null;
  readonly timestamp: ISO8601;
  readonly contentType: string;
  readonly contentHash: Sha256;
}

/**
 * Hash chain for artifact delivery.
 */
export interface HashChain {
  readonly version: '1.0';
  readonly created: ISO8601;
  readonly entries: readonly HashChainEntry[];
  readonly chainHash: Sha256;
}

/**
 * Genesis hash for empty chain (deterministic).
 */
export const GENESIS_HASH = hashString('OMEGA_GENESIS_v1.0') as Sha256;

/**
 * Computes chain link hash from previous hash and content.
 *
 * @param previousHash - Previous chain hash (or GENESIS_HASH)
 * @param contentHash - Hash of content being added
 * @param timestamp - ISO8601 timestamp
 * @returns Chain link hash
 */
export function computeChainLink(
  previousHash: Sha256,
  contentHash: Sha256,
  timestamp: ISO8601
): Sha256 {
  return hashConcat(previousHash, contentHash, timestamp);
}

/**
 * Creates a new hash chain entry.
 *
 * @param index - Entry index (0-based)
 * @param contentHash - Hash of content
 * @param contentType - Type of content
 * @param previousHash - Previous entry hash (null for genesis)
 * @param timestamp - ISO8601 timestamp
 * @returns New hash chain entry
 */
export function createChainEntry(
  index: number,
  contentHash: Sha256,
  contentType: string,
  previousHash: Sha256 | null,
  timestamp: ISO8601
): HashChainEntry {
  const effectivePrevious = previousHash ?? GENESIS_HASH;
  const hash = computeChainLink(effectivePrevious, contentHash, timestamp);

  return Object.freeze({
    index,
    hash,
    previousHash: previousHash,
    timestamp,
    contentType,
    contentHash,
  });
}

/**
 * Creates a new empty hash chain.
 *
 * @param timestamp - Creation timestamp
 * @returns Empty hash chain
 */
export function createChain(timestamp: ISO8601): HashChain {
  return Object.freeze({
    version: '1.0' as const,
    created: timestamp,
    entries: Object.freeze([]),
    chainHash: GENESIS_HASH,
  });
}

/**
 * Adds entry to hash chain.
 *
 * @param chain - Existing chain
 * @param contentHash - Hash of content to add
 * @param contentType - Type of content
 * @param timestamp - Entry timestamp
 * @returns Updated chain with new entry
 */
export function addToChain(
  chain: HashChain,
  contentHash: Sha256,
  contentType: string,
  timestamp: ISO8601
): HashChain {
  const index = chain.entries.length;
  const previousHash = index === 0 ? null : chain.entries[index - 1].hash;

  const entry = createChainEntry(
    index,
    contentHash,
    contentType,
    previousHash,
    timestamp
  );

  const newEntries = Object.freeze([...chain.entries, entry]);

  return Object.freeze({
    ...chain,
    entries: newEntries,
    chainHash: entry.hash,
  });
}

/**
 * Verifies hash chain integrity.
 * H-INV-09: Hash chain continuity
 *
 * @param chain - Chain to verify
 * @returns Verification result
 */
export function verifyChain(chain: HashChain): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (chain.version !== '1.0') {
    errors.push(`Invalid chain version: ${chain.version}`);
  }

  if (chain.entries.length === 0) {
    // Empty chain is valid
    if (chain.chainHash !== GENESIS_HASH) {
      errors.push('Empty chain must have genesis hash');
    }
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) as unknown as string[] });
  }

  for (let i = 0; i < chain.entries.length; i++) {
    const entry = chain.entries[i];

    // Verify index
    if (entry.index !== i) {
      errors.push(`Entry ${i} has incorrect index: ${entry.index}`);
    }

    // Verify previous hash link
    if (i === 0) {
      if (entry.previousHash !== null) {
        errors.push('First entry must have null previousHash');
      }
    } else {
      const prevEntry = chain.entries[i - 1];
      if (entry.previousHash !== prevEntry.hash) {
        errors.push(`Entry ${i} previousHash mismatch`);
      }
    }

    // Verify hash computation
    const effectivePrevious = entry.previousHash ?? GENESIS_HASH;
    const expectedHash = computeChainLink(
      effectivePrevious,
      entry.contentHash,
      entry.timestamp
    );
    if (entry.hash !== expectedHash) {
      errors.push(`Entry ${i} hash mismatch: expected ${expectedHash}, got ${entry.hash}`);
    }
  }

  // Verify final chain hash
  const lastEntry = chain.entries[chain.entries.length - 1];
  if (chain.chainHash !== lastEntry.hash) {
    errors.push('Chain hash does not match last entry hash');
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors) as unknown as string[],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH CHAIN SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serializes hash chain to text format.
 *
 * @param chain - Chain to serialize
 * @returns Text representation
 */
export function serializeChain(chain: HashChain): string {
  const lines: string[] = [
    `# OMEGA Hash Chain v${chain.version}`,
    `# Created: ${chain.created}`,
    `# Chain Hash: ${chain.chainHash}`,
    `# Entries: ${chain.entries.length}`,
    '',
  ];

  for (const entry of chain.entries) {
    lines.push(`[${entry.index}]`);
    lines.push(`Hash: ${entry.hash}`);
    lines.push(`Previous: ${entry.previousHash ?? 'GENESIS'}`);
    lines.push(`Content: ${entry.contentHash}`);
    lines.push(`Type: ${entry.contentType}`);
    lines.push(`Time: ${entry.timestamp}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parses hash chain from text format.
 *
 * @param text - Text representation
 * @returns Parsed hash chain or null if invalid
 */
export function parseChain(text: string): HashChain | null {
  try {
    const lines = text.split('\n');

    // Parse header
    const versionMatch = lines[0]?.match(/# OMEGA Hash Chain v(\d+\.\d+)/);
    if (!versionMatch || versionMatch[1] !== '1.0') {
      return null;
    }

    const createdMatch = lines[1]?.match(/# Created: (.+)/);
    if (!createdMatch) {
      return null;
    }

    const chainHashMatch = lines[2]?.match(/# Chain Hash: ([a-f0-9]{64})/);
    if (!chainHashMatch || !isSha256(chainHashMatch[1])) {
      return null;
    }

    const countMatch = lines[3]?.match(/# Entries: (\d+)/);
    if (!countMatch) {
      return null;
    }

    const entries: HashChainEntry[] = [];
    let i = 5; // Skip header + empty line

    while (i < lines.length) {
      const indexMatch = lines[i]?.match(/\[(\d+)\]/);
      if (!indexMatch) {
        i++;
        continue;
      }

      const index = parseInt(indexMatch[1], 10);
      const hashLine = lines[i + 1]?.match(/Hash: ([a-f0-9]{64})/);
      const prevLine = lines[i + 2]?.match(/Previous: (GENESIS|[a-f0-9]{64})/);
      const contentLine = lines[i + 3]?.match(/Content: ([a-f0-9]{64})/);
      const typeLine = lines[i + 4]?.match(/Type: (.+)/);
      const timeLine = lines[i + 5]?.match(/Time: (.+)/);

      if (!hashLine || !prevLine || !contentLine || !typeLine || !timeLine) {
        return null;
      }

      entries.push(Object.freeze({
        index,
        hash: hashLine[1] as Sha256,
        previousHash: prevLine[1] === 'GENESIS' ? null : prevLine[1] as Sha256,
        contentHash: contentLine[1] as Sha256,
        contentType: typeLine[1],
        timestamp: timeLine[1] as ISO8601,
      }));

      i += 7; // Move to next entry
    }

    return Object.freeze({
      version: '1.0' as const,
      created: createdMatch[1] as ISO8601,
      entries: Object.freeze(entries),
      chainHash: chainHashMatch[1] as Sha256,
    });
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE ROOT (Optional for batch verification)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes Merkle root of multiple hashes.
 * Used for batch verification of multiple artifacts.
 *
 * @param hashes - Array of hashes
 * @returns Merkle root hash
 */
export function computeMerkleRoot(hashes: readonly Sha256[]): Sha256 {
  if (hashes.length === 0) {
    return GENESIS_HASH;
  }

  if (hashes.length === 1) {
    return hashes[0];
  }

  // Build tree bottom-up
  let level = [...hashes];

  while (level.length > 1) {
    const nextLevel: Sha256[] = [];

    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        nextLevel.push(hashConcat(level[i], level[i + 1]));
      } else {
        // Odd element: hash with itself
        nextLevel.push(hashConcat(level[i], level[i]));
      }
    }

    level = nextLevel;
  }

  return level[0];
}
