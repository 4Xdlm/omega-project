/**
 * OMEGA Zip Validator
 * Phase M - Secure zip handling with zip-slip defense
 * 
 * CI HARDENING: Cross-platform path detection (Windows + Unix)
 */
import { readFileSync, existsSync } from 'fs';
import { normalize, isAbsolute, resolve } from 'path';
import { createHash } from 'crypto';
import type { ZipValidationResult, ZipEntry } from './types';

/**
 * Check if a path is an absolute path on any platform.
 * Handles both Unix (/path) and Windows (C:\path, \\server) patterns.
 * 
 * CRITICAL: This function must detect Windows absolute paths even on Linux
 * because a zip file can contain Windows paths that would be absolute on Windows.
 */
function isAbsoluteAnywhere(entryPath: string): boolean {
  // Unix absolute
  if (entryPath.startsWith('/')) {
    return true;
  }
  
  // Windows drive letter (C:, D:, etc.) - with any separator
  if (/^[A-Za-z]:[\\/]/.test(entryPath)) {
    return true;
  }
  
  // Windows UNC path (\\server\share)
  if (entryPath.startsWith('\\\\')) {
    return true;
  }
  
  // Node.js isAbsolute for current platform
  return isAbsolute(entryPath);
}

/**
 * Checks if a path is safe (no traversal).
 * Cross-platform: detects both Unix and Windows absolute paths.
 */
export function isSafePath(entryPath: string, targetDir: string): boolean {
  // Check for absolute paths (cross-platform)
  if (isAbsoluteAnywhere(entryPath)) {
    return false;
  }
  
  // Normalize: convert backslashes to forward slashes for traversal check
  const normalizedEntry = entryPath.replace(/\\/g, '/');
  
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

    // Check for dangerous filenames:
    // - Null bytes (injection attack)
    // - Backslashes (Windows path separator - potential cross-platform zip-slip)
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
