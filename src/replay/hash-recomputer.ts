/**
 * OMEGA Hash Recomputer
 * Phase L - Recomputes all hashes from scratch
 */
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { FileVerifyResult } from './types';

/**
 * Computes SHA256 of file contents.
 */
export function computeFileHash(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Parses hashes.txt format: "hash *filepath"
 */
export function parseHashesFile(hashesPath: string): Map<string, string> {
  const hashes = new Map<string, string>();

  if (!existsSync(hashesPath)) {
    return hashes;
  }

  const content = readFileSync(hashesPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  for (const line of lines) {
    // Format: "hash *path" or "hash path"
    const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
    if (match) {
      hashes.set(match[2].trim(), match[1].toLowerCase());
    }
  }

  return hashes;
}

/**
 * Verifies all files in a run directory against recorded hashes.
 */
export function verifyRunHashes(runPath: string): FileVerifyResult[] {
  const results: FileVerifyResult[] = [];
  const hashesPath = join(runPath, 'hashes.txt');
  const recordedHashes = parseHashesFile(hashesPath);

  // Check each recorded hash
  for (const [relPath, expectedHash] of recordedHashes) {
    const fullPath = join(runPath, relPath);
    const result: FileVerifyResult = {
      path: relPath,
      exists: existsSync(fullPath),
      expectedHash,
      match: false,
    };

    if (result.exists) {
      try {
        result.actualHash = computeFileHash(fullPath);
        result.match = result.actualHash === expectedHash;
      } catch (e) {
        result.error = (e as Error).message;
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Computes the run hash (hash of all hashes).
 */
export function computeRunHash(runPath: string): string {
  const hashesPath = join(runPath, 'hashes.txt');

  if (!existsSync(hashesPath)) {
    throw new Error('hashes.txt not found');
  }

  const content = readFileSync(hashesPath, 'utf-8');
  // Normalize: sort lines, trim, LF-only
  const lines = content.split('\n').filter(l => l.trim()).sort();
  const normalized = lines.join('\n') + '\n';

  return createHash('sha256').update(normalized, 'utf-8').digest('hex');
}
