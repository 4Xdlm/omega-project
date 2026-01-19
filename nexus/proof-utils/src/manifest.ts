/**
 * Manifest Builder
 * Standard: NASA-Grade L4
 * CORRECTION #2: Time injection (no direct Date.now())
 */

import { createHash } from 'crypto';
import { readFileSync, statSync } from 'fs';
import type { Manifest, ManifestEntry } from './types.js';

export function buildManifest(
  filePaths: readonly string[],
  timestampProvider: () => number = () => Date.now()
): Manifest {
  const entries: ManifestEntry[] = filePaths.map((path) => {
    const content = readFileSync(path);
    const stats = statSync(path);
    const hash = createHash('sha256').update(content).digest('hex');

    return Object.freeze({
      path,
      size: stats.size,
      sha256: hash,
    });
  });

  return Object.freeze({
    entries: Object.freeze(entries),
    timestamp: timestampProvider(),
    version: '1.0.0',
  });
}
