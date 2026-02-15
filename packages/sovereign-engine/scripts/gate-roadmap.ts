#!/usr/bin/env node
/**
 * OMEGA Sovereign — Gate: Roadmap Integrity
 * Sprint 5 — Commit 5.2
 *
 * Vérifie l'intégrité du fichier OMEGA_ROADMAP_OMNIPOTENT.md via hash SHA256.
 * Implémente ADR-002: Hashing Policy for Governance Documents.
 *
 * Usage:
 *   npm run gate:roadmap        # Verify integrity
 *   npm run gate:roadmap:update # Update hash reference
 *
 * Exit 0 if hash matches or file doesn't exist.
 * Exit 1 if hash mismatch (roadmap modified without gate update).
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const roadmapPath = path.join(repoRoot, 'docs/OMEGA_ROADMAP_OMNIPOTENT_v1.md');
const hashFilePath = path.join(repoRoot, '.roadmap-hash.json');

const isUpdateMode = process.argv.includes('--update');

function computeSHA256(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

function loadHashFile(): { hash: string; timestamp: string } | null {
  if (!fs.existsSync(hashFilePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(hashFilePath, 'utf-8'));
}

function saveHashFile(hash: string): void {
  const data = {
    hash,
    timestamp: new Date().toISOString(),
    file: 'docs/OMEGA_ROADMAP_OMNIPOTENT_v1.md',
  };
  fs.writeFileSync(hashFilePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// Check if roadmap file exists
if (!fs.existsSync(roadmapPath)) {
  console.log('⚠️  Roadmap file not found (optional) — gate skipped');
  process.exit(0);
}

const currentHash = computeSHA256(roadmapPath);

if (isUpdateMode) {
  saveHashFile(currentHash);
  console.log('✅ Roadmap hash updated');
  console.log(`   Hash: ${currentHash.slice(0, 16)}...`);
  console.log(`   File: ${hashFilePath}`);
  process.exit(0);
}

// Verification mode
const stored = loadHashFile();

if (!stored) {
  console.error('❌ Gate ROADMAP violated [ADR-002]:');
  console.error('');
  console.error('  No hash reference found (.roadmap-hash.json missing).');
  console.error('  Run: npm run gate:roadmap:update');
  console.error('');
  process.exit(1);
}

if (stored.hash !== currentHash) {
  console.error('❌ Gate ROADMAP violated [ADR-002]:');
  console.error('');
  console.error('  Roadmap file modified without hash update.');
  console.error(`  Expected: ${stored.hash.slice(0, 16)}...`);
  console.error(`  Actual:   ${currentHash.slice(0, 16)}...`);
  console.error('');
  console.error('  To accept changes, run: npm run gate:roadmap:update');
  console.error('');
  process.exit(1);
}

console.log('✅ Gate ROADMAP passed — Hash matches reference');
process.exit(0);
