/**
 * OMEGA Release — Version File
 * Phase G.0 — Read/write VERSION file
 *
 * INV-G0-01: VERSION_TAG_SYNC
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { VersionFile } from './types.js';

/** Read VERSION file */
export function readVersionFile(path: string): VersionFile {
  if (!existsSync(path)) {
    throw new Error(`VERSION file not found: ${path}`);
  }
  const content = readFileSync(path, 'utf-8').trim();
  const hash = createHash('sha256').update(content, 'utf-8').digest('hex');
  return { path, version: content, hash };
}

/** Write VERSION file (no trailing newline) */
export function writeVersionFile(path: string, version: string): VersionFile {
  const trimmed = version.trim();
  writeFileSync(path, trimmed, 'utf-8');
  const hash = createHash('sha256').update(trimmed, 'utf-8').digest('hex');
  return { path, version: trimmed, hash };
}

/** Extract version from artifact filename */
export function extractVersionFromFilename(filename: string): string | null {
  // Match omega-X.Y.Z[-prerelease]-platform.ext (exclude platform names from prerelease)
  const match = /omega-(\d+\.\d+\.\d+(?:-(?!win|linux|macos)[a-zA-Z0-9.]+)?)/.exec(filename);
  return match ? match[1] : null;
}
