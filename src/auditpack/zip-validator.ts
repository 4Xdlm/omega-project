/**
 * OMEGA Zip Validator
 * Phase M - Secure zip handling with zip-slip defense
 */
import { readFileSync, existsSync } from 'fs';
import { normalize, isAbsolute, resolve } from 'path';
import { createHash } from 'crypto';
import type { ZipValidationResult, ZipEntry } from './types';

/**
 * Checks if a path is safe (no traversal).
 */
export function isSafePath(entryPath: string, targetDir: string): boolean {
  // Normalize and resolve
  const normalizedEntry = normalize(entryPath);

  // Check for absolute paths
  if (isAbsolute(normalizedEntry)) {
    return false;
  }

  // Check for parent directory traversal
  if (normalizedEntry.includes('..')) {
    return false;
  }

  // Check that resolved path stays within target
  const resolvedPath = resolve(targetDir, normalizedEntry);
  const resolvedTarget = resolve(targetDir);

  return resolvedPath.startsWith(resolvedTarget);
}

/**
 * Validates zip structure for security issues.
 */
export function validateZipStructure(
  entries: Array<{ filename: string; isDirectory: boolean; compressedSize: number; uncompressedSize: number }>,
  targetDir: string
): ZipValidationResult {
  const errors: string[] = [];
  let hasZipSlip = false;
  let hasDangerousFiles = false;

  const validatedEntries: ZipEntry[] = [];

  for (const entry of entries) {
    // Check for zip-slip
    if (!isSafePath(entry.filename, targetDir)) {
      hasZipSlip = true;
      errors.push(`Zip-slip detected: ${entry.filename}`);
    }

    // Check for dangerous filenames
    if (entry.filename.includes('\0') || entry.filename.includes('\\')) {
      hasDangerousFiles = true;
      errors.push(`Dangerous filename: ${entry.filename}`);
    }

    validatedEntries.push({
      filename: entry.filename,
      compressedSize: entry.compressedSize,
      uncompressedSize: entry.uncompressedSize,
      isDirectory: entry.isDirectory,
    });
  }

  return {
    valid: !hasZipSlip && !hasDangerousFiles && errors.length === 0,
    entries: validatedEntries,
    errors,
    hasZipSlip,
    hasDangerousFiles,
  };
}

/**
 * Computes SHA256 hash of zip file.
 */
export function computeZipHash(zipPath: string): string {
  const content = readFileSync(zipPath);
  return createHash('sha256').update(content).digest('hex');
}
