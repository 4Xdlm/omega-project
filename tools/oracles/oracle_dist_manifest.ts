/**
 * ORACLE-2: Production Artefact Hash Manifest
 *
 * Creates a deterministic hash manifest of production artefacts.
 * This proves the build output is reproducible.
 *
 * Output format: SHA256  path  size (one per line, sorted by path)
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { ManifestEntry, OracleResult } from './types.js';

const OUTPUT_DIR = 'artefacts/oracles';
const MANIFEST_FILE = 'dist_manifest.txt';
const HASH_FILE = 'dist_manifest.sha256';

// Production files to include in manifest (allowlist)
const PRODUCTION_FILES = [
  'dist/runner/main.js',
  'dist/auditpack/index.js',
];

function sha256File(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex').toUpperCase();
}

function sha256String(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').toUpperCase();
}

function collectEntries(): ManifestEntry[] {
  const entries: ManifestEntry[] = [];

  for (const pattern of PRODUCTION_FILES) {
    if (existsSync(pattern)) {
      const stat = statSync(pattern);
      entries.push({
        hash: sha256File(pattern),
        path: pattern.replace(/\\/g, '/'), // Normalize to forward slashes
        size: stat.size,
      });
    } else {
      console.warn(`ORACLE-2 WARNING: Production file not found: ${pattern}`);
    }
  }

  // Sort lexicographically by path for determinism
  entries.sort((a, b) => a.path.localeCompare(b.path));

  return entries;
}

function formatManifest(entries: ManifestEntry[]): string {
  // Format: SHA256  path  size
  // Sorted lexicographically
  const lines = entries.map(e => `${e.hash}  ${e.path}  ${e.size}`);
  return lines.join('\n') + '\n';
}

export async function generateDistManifest(): Promise<OracleResult> {
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Collect and format
  const entries = collectEntries();

  if (entries.length === 0) {
    console.error('ORACLE-2 ERROR: No production files found. Run npm run build first.');
    return {
      success: false,
      manifestPath: '',
      hashPath: '',
      hash: '',
      entryCount: 0,
    };
  }

  const manifestContent = formatManifest(entries);
  const manifestHash = sha256String(manifestContent);

  // Write outputs
  const manifestPath = join(OUTPUT_DIR, MANIFEST_FILE);
  const hashPath = join(OUTPUT_DIR, HASH_FILE);

  writeFileSync(manifestPath, manifestContent, 'utf8');
  writeFileSync(hashPath, manifestHash + '\n', 'utf8');

  console.log(`ORACLE-2: dist manifest generated`);
  console.log(`  Entries: ${entries.length}`);
  console.log(`  Hash: ${manifestHash}`);
  console.log(`  Output: ${manifestPath}`);

  return {
    success: true,
    manifestPath,
    hashPath,
    hash: manifestHash,
    entryCount: entries.length,
  };
}

// CLI entry point
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
                     process.argv[1]?.endsWith('oracle_dist_manifest.ts');

if (isMainModule) {
  generateDistManifest()
    .then(result => {
      if (!result.success) process.exit(1);
    })
    .catch(err => {
      console.error('ORACLE-2 FAILED:', err);
      process.exit(1);
    });
}
