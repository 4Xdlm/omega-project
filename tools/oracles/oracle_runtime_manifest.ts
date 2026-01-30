/**
 * ORACLE-X: Runtime Artifact Manifest (Radical Variant)
 *
 * Proves runtime determinism by hashing actual output files (not stdout).
 * Executes the runner with a known fixture, hashes all output files.
 *
 * This is the strongest form of determinism proof.
 */

import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import type { ManifestEntry, OracleResult } from './types.js';

const OUTPUT_DIR = 'artefacts/oracles';
const RUNTIME_DIR = 'artefacts/oracles/runtime_sandbox';
const MANIFEST_FILE = 'runtime_manifest.txt';
const HASH_FILE = 'runtime_manifest.sha256';
const FIXTURE = 'intents/intent_mvp.json';

function sha256File(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex').toUpperCase();
}

function sha256String(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').toUpperCase();
}

function collectFilesRecursive(dir: string, base: string = ''): ManifestEntry[] {
  const entries: ManifestEntry[] = [];

  if (!existsSync(dir)) {
    return entries;
  }

  for (const item of readdirSync(dir)) {
    const fullPath = join(dir, item);
    const relativePath = base ? `${base}/${item}` : item;
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      entries.push(...collectFilesRecursive(fullPath, relativePath));
    } else {
      entries.push({
        hash: sha256File(fullPath),
        path: relativePath.replace(/\\/g, '/'),
        size: stat.size,
      });
    }
  }

  return entries;
}

export async function generateRuntimeManifest(): Promise<OracleResult> {
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check fixture exists
  if (!existsSync(FIXTURE)) {
    console.error(`ORACLE-X ERROR: Fixture not found: ${FIXTURE}`);
    return {
      success: false,
      manifestPath: '',
      hashPath: '',
      hash: '',
      entryCount: 0,
    };
  }

  // Check build exists
  if (!existsSync('dist/runner/main.js')) {
    console.error('ORACLE-X ERROR: Build not found. Run npm run build first.');
    return {
      success: false,
      manifestPath: '',
      hashPath: '',
      hash: '',
      entryCount: 0,
    };
  }

  // Execute runner with fixture
  // The runner will write to artefacts/runs/ by default
  console.log('ORACLE-X: Executing runner with fixture...');

  try {
    execSync(`node dist/runner/main.js run --intent ${FIXTURE}`, {
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' },
    });
  } catch (err) {
    console.error('ORACLE-X ERROR: Runner execution failed');
    return {
      success: false,
      manifestPath: '',
      hashPath: '',
      hash: '',
      entryCount: 0,
    };
  }

  // Find the latest run directory
  const runsDir = 'artefacts/runs';
  if (!existsSync(runsDir)) {
    console.error('ORACLE-X ERROR: No runs directory found');
    return {
      success: false,
      manifestPath: '',
      hashPath: '',
      hash: '',
      entryCount: 0,
    };
  }

  // Find run directory for intent_mvp
  const runDirs = readdirSync(runsDir)
    .filter(d => d.startsWith('run_intent_mvp'))
    .sort()
    .reverse();

  if (runDirs.length === 0) {
    console.error('ORACLE-X ERROR: No run directory found for intent_mvp');
    return {
      success: false,
      manifestPath: '',
      hashPath: '',
      hash: '',
      entryCount: 0,
    };
  }

  const latestRunDir = join(runsDir, runDirs[0]);
  console.log(`ORACLE-X: Hashing run directory: ${latestRunDir}`);

  // Collect all output files
  const entries = collectFilesRecursive(latestRunDir);
  entries.sort((a, b) => a.path.localeCompare(b.path));

  if (entries.length === 0) {
    console.error('ORACLE-X ERROR: No files found in run directory');
    return {
      success: false,
      manifestPath: latestRunDir,
      hashPath: '',
      hash: '',
      entryCount: 0,
    };
  }

  // Format manifest
  const lines = entries.map(e => `${e.hash}  ${e.path}  ${e.size}`);
  const manifestContent = lines.join('\n') + '\n';
  const manifestHash = sha256String(manifestContent);

  // Write outputs
  const manifestPath = join(OUTPUT_DIR, MANIFEST_FILE);
  const hashPath = join(OUTPUT_DIR, HASH_FILE);

  writeFileSync(manifestPath, manifestContent, 'utf8');
  writeFileSync(hashPath, manifestHash + '\n', 'utf8');

  console.log(`ORACLE-X: runtime manifest generated`);
  console.log(`  Run Dir: ${latestRunDir}`);
  console.log(`  Files: ${entries.length}`);
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
                     process.argv[1]?.endsWith('oracle_runtime_manifest.ts');

if (isMainModule) {
  generateRuntimeManifest()
    .then(result => {
      if (!result.success) process.exit(1);
    })
    .catch(err => {
      console.error('ORACLE-X FAILED:', err);
      process.exit(1);
    });
}
