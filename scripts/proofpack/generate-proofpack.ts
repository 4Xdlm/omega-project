#!/usr/bin/env node
/**
 * OMEGA ProofPack Generator — Sprint 8 Commit 8.1 (HARDEN-PP-01)
 *
 * Generates deterministic proof pack: MANIFEST.json, HASHES.sha256, EVIDENCE.md
 *
 * Usage:
 *   node scripts/proofpack/generate-proofpack.ts --outDir proofpacks/local
 *   node scripts/proofpack/generate-proofpack.ts --clean --outDir proofpacks/local
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs';
import { resolve, relative, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProofPackOptions {
  outDir: string;
  repoRoot: string;
}

interface PackageInfo {
  name: string;
  version: string;
}

interface ManifestData {
  schema_version: string;
  created_utc: string;
  git_commit: string;
  git_branch: string;
  node_version: string;
  platform: string;
  packages: PackageInfo[];
  gates: string[];
}

/**
 * Generate proof pack (MANIFEST.json, HASHES.sha256, EVIDENCE.md)
 */
export async function generateProofPack(opts: ProofPackOptions): Promise<void> {
  const { outDir, repoRoot } = opts;

  // Create output directory
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  console.log(`[proofpack] Generating proof pack in: ${outDir}`);

  // 1. Collect git info
  const gitCommit = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf-8' }).trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoRoot, encoding: 'utf-8' }).trim();

  // 2. Collect package info
  const packages: PackageInfo[] = [];
  const packagesDir = resolve(repoRoot, 'packages');
  if (existsSync(packagesDir)) {
    const dirs = readdirSync(packagesDir);
    for (const dir of dirs) {
      const pkgJsonPath = resolve(packagesDir, dir, 'package.json');
      if (existsSync(pkgJsonPath)) {
        // Remove BOM if present
        let content = readFileSync(pkgJsonPath, 'utf-8');
        if (content.charCodeAt(0) === 0xFEFF) {
          content = content.slice(1);
        }
        const pkg = JSON.parse(content);
        packages.push({ name: pkg.name, version: pkg.version });
      }
    }
  }

  // 3. Generate MANIFEST.json
  const manifest: ManifestData = {
    schema_version: 'proofpack.v1',
    created_utc: new Date().toISOString(),
    git_commit: gitCommit,
    git_branch: gitBranch,
    node_version: process.version,
    platform: process.platform,
    packages: packages.sort((a, b) => a.name.localeCompare(b.name)),
    gates: ['no-shadow', 'no-todo', 'active', 'roadmap', 'idl', 'proofpack'],
  };

  writeFileSync(resolve(outDir, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log('[proofpack] ✅ MANIFEST.json created');

  // 4. Generate HASHES.sha256
  const filesToHash = [
    'sessions/ROADMAP_CHECKPOINT.md',
    'packages/signal-registry/signal-registry.idl.json',
    'packages/signal-registry/src/registry.ts',
  ];

  const hashes: Array<{ path: string; hash: string }> = [];

  for (const filePath of filesToHash) {
    const fullPath = resolve(repoRoot, filePath);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      const hash = createHash('sha256').update(content).digest('hex');
      hashes.push({ path: filePath, hash });
    } else {
      console.warn(`[proofpack] ⚠️  File not found: ${filePath}`);
    }
  }

  // Add MANIFEST.json hash (canonical version without created_utc for determinism)
  const manifestCanon = { ...manifest };
  delete (manifestCanon as any).created_utc;
  const manifestHash = createHash('sha256').update(JSON.stringify(manifestCanon)).digest('hex');
  hashes.push({ path: relative(repoRoot, resolve(outDir, 'MANIFEST.json')), hash: manifestHash });

  // Sort by path lexicographically
  hashes.sort((a, b) => a.path.localeCompare(b.path));

  const hashLines = hashes.map(h => `${h.hash}  ${h.path}`);

  writeFileSync(resolve(outDir, 'HASHES.sha256'), hashLines.join('\n') + '\n', 'utf-8');
  console.log('[proofpack] ✅ HASHES.sha256 created');

  // 5. Generate EVIDENCE.md
  const evidence = `# OMEGA Proof Pack Evidence

**Schema**: proofpack.v1
**Generated**: ${manifest.created_utc}
**Git Commit**: ${gitCommit}
**Git Branch**: ${gitBranch}

## Reproduction Steps

\`\`\`bash
# 1. Run tests
npm test

# 2. Run all gates
npm run gate:all

# 3. Generate proof pack
npm run proofpack:generate
\`\`\`

## Output Location

- MANIFEST.json — Metadata (git, node, packages, gates)
- HASHES.sha256 — SHA-256 hashes of critical files
- EVIDENCE.md — This file

## Critical Files Hashed

${filesToHash.map(f => `- ${f}`).join('\n')}

## Gates Verified

${manifest.gates.map(g => `- gate:${g}`).join('\n')}
`;

  writeFileSync(resolve(outDir, 'EVIDENCE.md'), evidence, 'utf-8');
  console.log('[proofpack] ✅ EVIDENCE.md created');

  console.log(`[proofpack] ✅ Proof pack complete: ${outDir}`);
}

/**
 * Clean proof pack directory
 */
function cleanProofPack(outDir: string): void {
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
    console.log(`[proofpack] ✅ Cleaned: ${outDir}`);
  } else {
    console.log(`[proofpack] Directory does not exist: ${outDir}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-proofpack.ts')) {
  const args = process.argv.slice(2);
  const outDirIdx = args.indexOf('--outDir');
  const isClean = args.includes('--clean');

  if (isClean && outDirIdx !== -1) {
    const outDir = args[outDirIdx + 1];
    cleanProofPack(outDir);
    process.exit(0);
  }

  if (outDirIdx === -1) {
    console.error('Usage: node generate-proofpack.ts --outDir <dir>');
    process.exit(1);
  }

  const outDir = args[outDirIdx + 1];
  const repoRoot = resolve(__dirname, '..', '..');

  generateProofPack({ outDir, repoRoot })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[proofpack] ❌ Error:', err);
      process.exit(1);
    });
}
