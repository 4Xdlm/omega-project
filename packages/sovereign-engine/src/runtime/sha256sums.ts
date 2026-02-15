/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SHA256SUMS GENERATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: runtime/sha256sums.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Generates SHA256SUMS.txt with deterministic stable ordering.
 * Format: <64-char-hex-hash>  <relative-path> (two spaces between)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

interface FileHash {
  readonly relativePath: string;
  readonly hash: string;
}

/**
 * Compute SHA256 hash of file content
 */
function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Walk directory recursively and collect all files
 * Skip SHA256SUMS.txt itself
 */
function walkDirectory(dirPath: string): readonly FileHash[] {
  const results: FileHash[] = [];

  function walk(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(dirPath, fullPath);

      // Skip SHA256SUMS.txt itself
      if (entry.name === 'SHA256SUMS.txt') {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const hash = computeFileHash(fullPath);
        results.push({ relativePath: relativePath.replace(/\\/g, '/'), hash }); // Normalize to forward slashes
      }
    }
  }

  walk(dirPath);

  return results;
}

/**
 * Generate SHA256SUMS.txt for directory
 * Entries sorted alphabetically by relative path for deterministic output
 */
export function generateSHA256SUMS(dirPath: string, outputPath: string): void {
  const fileHashes = walkDirectory(dirPath);

  // Sort alphabetically by relative path (case-sensitive, stable)
  const sorted = [...fileHashes].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  // Format: <64-hex>  <relpath> (two spaces)
  const lines = sorted.map((fh) => `${fh.hash}  ${fh.relativePath}`);

  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
}

/**
 * Verify SHA256SUMS.txt against directory
 * Returns list of mismatches
 */
export function verifySHA256SUMS(
  dirPath: string,
  sha256sumsPath: string,
): { readonly valid: boolean; readonly mismatches: readonly string[] } {
  if (!fs.existsSync(sha256sumsPath)) {
    return { valid: false, mismatches: ['SHA256SUMS.txt not found'] };
  }

  const content = fs.readFileSync(sha256sumsPath, 'utf8');
  const lines = content.trim().split('\n');

  const mismatches: string[] = [];

  for (const line of lines) {
    if (line.trim() === '') continue;

    // Parse: <hash>  <path> (two spaces)
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) {
      mismatches.push(`Invalid line format: ${line}`);
      continue;
    }

    const [, expectedHash, relativePath] = match;
    const fullPath = path.join(dirPath, relativePath);

    if (!fs.existsSync(fullPath)) {
      mismatches.push(`File not found: ${relativePath}`);
      continue;
    }

    const actualHash = computeFileHash(fullPath);
    if (actualHash !== expectedHash) {
      mismatches.push(`Hash mismatch: ${relativePath}`);
    }
  }

  return {
    valid: mismatches.length === 0,
    mismatches,
  };
}
