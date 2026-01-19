/**
 * Manifest Verification
 * Standard: NASA-Grade L4
 */

import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import type { Manifest, VerificationResult } from './types.js';

export function verifyManifest(manifest: Manifest): VerificationResult {
  const errors: string[] = [];
  const tamperedFiles: string[] = [];

  for (const entry of manifest.entries) {
    if (!existsSync(entry.path)) {
      errors.push(`File not found: ${entry.path}`);
      continue;
    }

    const content = readFileSync(entry.path);
    const actualHash = createHash('sha256').update(content).digest('hex');

    if (actualHash !== entry.sha256) {
      tamperedFiles.push(entry.path);
      errors.push(`Hash mismatch: ${entry.path}`);
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    tamperedFiles: Object.freeze(tamperedFiles),
  });
}
