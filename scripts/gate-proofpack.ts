#!/usr/bin/env npx tsx
/**
 * OMEGA Gate ProofPack — Sprint 8 Commit 8.2 (HARDEN-GATE-PP-01)
 *
 * Fail-closed gate: verify proof pack exists with all required files and hashes.
 *
 * Usage:
 *   npx tsx scripts/gate-proofpack.ts --dir proofpacks/local
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface VerifyResult {
  valid: boolean;
  errors: string[];
}

/**
 * Verify proof pack directory contains all required files and hashes
 */
export function verifyProofPack(opts: { dir: string }): VerifyResult {
  const { dir } = opts;
  const errors: string[] = [];

  // 1. Check MANIFEST.json exists
  const manifestPath = resolve(dir, 'MANIFEST.json');
  if (!existsSync(manifestPath)) {
    errors.push('MANIFEST.json not found');
  }

  // 2. Check HASHES.sha256 exists
  const hashesPath = resolve(dir, 'HASHES.sha256');
  if (!existsSync(hashesPath)) {
    errors.push('HASHES.sha256 not found');
  } else {
    // 3. Verify HASHES.sha256 contains required files
    const hashesContent = readFileSync(hashesPath, 'utf-8');
    const lines = hashesContent.trim().split('\n');
    const paths = lines.map(line => line.split('  ')[1]);

    const requiredFiles = [
      'sessions/ROADMAP_CHECKPOINT.md',
      'packages/signal-registry/signal-registry.idl.json',
      'packages/signal-registry/src/registry.ts',
    ];

    for (const required of requiredFiles) {
      if (!paths.some(p => p === required)) {
        errors.push(`HASHES.sha256 missing required file: ${required}`);
      }
    }
  }

  // 4. Check EVIDENCE.md exists
  const evidencePath = resolve(dir, 'EVIDENCE.md');
  if (!existsSync(evidencePath)) {
    errors.push('EVIDENCE.md not found');
  }

  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('gate-proofpack.ts')) {
  const args = process.argv.slice(2);
  const dirIdx = args.indexOf('--dir');

  if (dirIdx === -1) {
    console.error('Usage: npx tsx scripts/gate-proofpack.ts --dir <dir>');
    process.exit(1);
  }

  const dir = args[dirIdx + 1];
  const result = verifyProofPack({ dir });

  if (result.valid) {
    console.log('✅ Gate PROOFPACK passed — All required files present');
    process.exit(0);
  } else {
    console.error('❌ Gate PROOFPACK FAIL:');
    for (const error of result.errors) {
      console.error(`   - ${error}`);
    }
    process.exit(1);
  }
}
