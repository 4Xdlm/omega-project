/**
 * Path Utilities
 * Standard: NASA-Grade L4
 *
 * Security-focused path handling
 */

import { RawPathTraversalError, RawPathInvalidError } from '../errors.js';

// ============================================================
// Path Sanitization
// ============================================================

/**
 * Sanitizes a key to prevent path traversal attacks.
 * - Normalizes path separators
 * - Removes .. and . components
 * - Validates characters
 * - Ensures relative path
 */
export function sanitizeKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new RawPathInvalidError('Key must be a non-empty string', { key });
  }

  // Normalize separators
  let normalized = key.replace(/\\/g, '/');

  // Decode URL encoding
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // If decoding fails, use original
  }

  // Split and filter path components
  const parts = normalized.split('/').filter((part) => part.length > 0);
  const safeParts: string[] = [];

  for (const part of parts) {
    // Block path traversal
    if (part === '..') {
      throw new RawPathTraversalError('Path traversal detected: ".."', { key });
    }

    // Skip current directory markers
    if (part === '.') {
      continue;
    }

    // Validate characters (alphanumeric, dash, underscore, dot)
    if (!/^[a-zA-Z0-9._-]+$/.test(part)) {
      throw new RawPathInvalidError(
        `Invalid characters in path component: ${part}`,
        { key, part }
      );
    }

    // Block hidden files/directories
    if (part.startsWith('.') && part !== '.') {
      throw new RawPathInvalidError(
        `Hidden files not allowed: ${part}`,
        { key, part }
      );
    }

    safeParts.push(part);
  }

  if (safeParts.length === 0) {
    throw new RawPathInvalidError('Key results in empty path', { key });
  }

  return safeParts.join('/');
}

/**
 * Creates a safe file path from a key within a root directory.
 */
export function createSafePath(rootDir: string, key: string): string {
  const safeKey = sanitizeKey(key);
  // Use forward slashes consistently, Node.js handles it on Windows
  return `${rootDir.replace(/\\/g, '/')}/${safeKey}`;
}

/**
 * Extracts the key from a full path given the root directory.
 */
export function extractKey(rootDir: string, fullPath: string): string {
  const normalizedRoot = rootDir.replace(/\\/g, '/').replace(/\/$/, '');
  const normalizedPath = fullPath.replace(/\\/g, '/');

  if (!normalizedPath.startsWith(normalizedRoot + '/')) {
    throw new RawPathInvalidError('Path is not within root directory', {
      rootDir,
      fullPath,
    });
  }

  return normalizedPath.slice(normalizedRoot.length + 1);
}

/**
 * Gets the metadata file path for a given data file path.
 */
export function getMetadataPath(dataPath: string): string {
  return `${dataPath}.meta.json`;
}

/**
 * Checks if a path is a metadata file.
 */
export function isMetadataPath(path: string): boolean {
  return path.endsWith('.meta.json');
}

/**
 * Gets the data file path from a metadata file path.
 */
export function getDataPathFromMetadata(metadataPath: string): string {
  if (!isMetadataPath(metadataPath)) {
    throw new RawPathInvalidError('Not a metadata path', { metadataPath });
  }
  return metadataPath.slice(0, -'.meta.json'.length);
}
