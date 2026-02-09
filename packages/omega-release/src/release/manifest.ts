/**
 * OMEGA Release — Manifest Generator
 * Phase G.0 — Generate MANIFEST.json for release
 *
 * INV-G0-05: MANIFEST_COMPLETE
 */

import { createHash } from 'node:crypto';
import type { ReleaseManifest, ReleaseArtifact, Platform } from './types.js';

/** Required manifest fields */
export const REQUIRED_MANIFEST_FIELDS: readonly string[] = [
  'version', 'release_date', 'commit', 'tag', 'platforms',
  'artifacts', 'tests', 'invariants', 'node_minimum', 'hash',
];

/** Generate release manifest */
export function generateManifest(params: {
  version: string;
  commit: string;
  platforms: readonly Platform[];
  artifacts: readonly ReleaseArtifact[];
  testTotal: number;
  testPassed: number;
  invariantTotal: number;
  invariantVerified: number;
  releaseDate?: string;
}): ReleaseManifest {
  const manifestData = {
    version: params.version,
    release_date: params.releaseDate ?? '2026-02-10T00:00:00.000Z',
    commit: params.commit,
    tag: `v${params.version}`,
    platforms: params.platforms,
    artifacts: params.artifacts,
    tests: { total: params.testTotal, passed: params.testPassed },
    invariants: { total: params.invariantTotal, verified: params.invariantVerified },
    node_minimum: '18.0.0',
  };

  const hash = createHash('sha256')
    .update(JSON.stringify(manifestData), 'utf-8')
    .digest('hex');

  return { ...manifestData, hash };
}

/** Validate manifest has all required fields */
export function validateManifest(manifest: ReleaseManifest): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if ((manifest as unknown as Record<string, unknown>)[field] === undefined) {
      missing.push(field);
    }
  }
  return { valid: missing.length === 0, missing };
}
