/**
 * OMEGA Release — Packager
 * Phase G.0 — Create ZIP/tar.gz archives
 *
 * INV-G0-09: RELEASE_REPRODUCIBLE
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform, ReleaseArtifact } from './types.js';
import { PLATFORM_FORMAT } from './types.js';
import { sha256File, sha512File } from './hasher.js';

/** Generate artifact filename */
export function generateArtifactFilename(version: string, platform: Platform): string {
  const format = PLATFORM_FORMAT[platform];
  return `omega-${version}-${platform}.${format}`;
}

/** Create a release artifact (simulated — creates a manifest-based package) */
export function createArtifact(
  version: string,
  platform: Platform,
  sourceDir: string,
  outputDir: string,
): ReleaseArtifact {
  mkdirSync(outputDir, { recursive: true });

  const filename = generateArtifactFilename(version, platform);
  const outputPath = join(outputDir, filename);
  const format = PLATFORM_FORMAT[platform];

  // Create a deterministic archive content (JSON manifest of files)
  const fileList = collectFileList(sourceDir);
  const content = JSON.stringify({
    omega_version: version,
    platform,
    format,
    files: fileList,
    created_at: '2026-02-10T00:00:00.000Z', // deterministic
  }, null, 2);

  writeFileSync(outputPath, content, 'utf-8');

  const size = Buffer.byteLength(content, 'utf-8');
  const sha256 = sha256File(outputPath);
  const sha512 = sha512File(outputPath);

  return { filename, platform, format, path: outputPath, size, sha256, sha512 };
}

function collectFileList(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...collectFileList(fullPath).map((f) => `${item.name}/${f}`));
    } else {
      files.push(item.name);
    }
  }
  return files.sort();
}
