/**
 * OMEGA Release — Builder
 * Phase G.0 — Orchestrate release build
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ReleaseConfig, ReleaseResult, ReleaseArtifact } from './types.js';
import { createArtifact } from './packager.js';
import { generateManifest } from './manifest.js';
import { writeChecksumFile } from './hasher.js';

/** Build release artifacts for all specified platforms */
export function buildRelease(config: ReleaseConfig, sourceDir: string, commit: string): ReleaseResult {
  mkdirSync(config.outputDir, { recursive: true });

  const artifacts: ReleaseArtifact[] = [];

  for (const platform of config.platforms) {
    const artifact = createArtifact(config.version, platform, sourceDir, config.outputDir);
    artifacts.push(artifact);
  }

  // Generate manifest
  const manifest = generateManifest({
    version: config.version,
    commit,
    platforms: config.platforms,
    artifacts,
    testTotal: 0,
    testPassed: 0,
    invariantTotal: 10,
    invariantVerified: 0,
  });

  // Write checksums file
  const checksumPath = join(config.outputDir, `omega-${config.version}-checksums.sha256`);
  writeChecksumFile(checksumPath, artifacts);

  return {
    version: config.version,
    artifacts,
    manifest,
    checksumFile: checksumPath,
  };
}
