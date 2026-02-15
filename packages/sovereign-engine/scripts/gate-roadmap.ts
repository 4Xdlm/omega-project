#!/usr/bin/env node
/**
 * OMEGA Sovereign — Gate: Roadmap Integrity
 * Sprint 5 — Commit 5.2 + Hotfix 5.4
 *
 * Vérifie l'intégrité du fichier OMEGA_ROADMAP_OMNIPOTENT.md via hash SHA256.
 * Implémente ADR-002: Hashing Policy for Governance Documents.
 * Implémente RULE-ROADMAP-02: Checkpoint structure verification.
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
const checkpointPath = path.join(repoRoot, 'sessions/ROADMAP_CHECKPOINT.md');

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTED TYPES AND FUNCTIONS (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CheckpointEntry {
  roadmap_item: string | null;
  deviation: string | null;
  evidence: string | null;
}

/**
 * Parse structured fields from the LAST checkpoint block.
 * Looks for lines starting with:
 *   roadmap_item:
 *   deviation:
 *   evidence:
 * OR lines containing these as bold/plain text in the last ### section.
 */
export function parseLastCheckpoint(content: string): CheckpointEntry {
  // Split by ### headers to find the last section
  const sections = content.split(/^###\s/m);
  const lastSection = sections[sections.length - 1] || '';

  const extractField = (field: string): string | null => {
    // Match "roadmap_item: value" or "**Roadmap Sprint**: value"
    const patterns = [
      new RegExp(`^\\s*${field}:\\s*(.+)$`, 'mi'),
      new RegExp(`\\*\\*${field}\\*\\*:\\s*(.+)`, 'mi'),
    ];
    for (const pattern of patterns) {
      const match = lastSection.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  return {
    roadmap_item: extractField('roadmap_item') ?? extractField('Roadmap Sprint'),
    deviation: extractField('deviation'),
    evidence: extractField('evidence') ?? extractField('Files Modified'),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GATE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

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

function main(): void {
  const isUpdateMode = process.argv.includes('--update');

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

  // ═══════════════════════════════════════════════════════════════════════════════
  // RULE-ROADMAP-02: Checkpoint structure verification
  // ═══════════════════════════════════════════════════════════════════════════════

  if (!fs.existsSync(checkpointPath)) {
    console.error('❌ RULE-ROADMAP-02 FAIL: sessions/ROADMAP_CHECKPOINT.md not found.');
    process.exit(1);
  }

  const checkpointContent = fs.readFileSync(checkpointPath, 'utf-8');
  const checkpoint = parseLastCheckpoint(checkpointContent);

  // RULE-ROADMAP-02 validation
  const errors: string[] = [];

  if (!checkpoint.roadmap_item) {
    errors.push('Missing "roadmap_item:" or "Roadmap Sprint:" in last checkpoint block');
  }

  if (!checkpoint.deviation) {
    // Deviation field is NEW — we accept its absence for backward compat
    // but log a warning. After this hotfix, it becomes mandatory.
    console.warn('⚠️  RULE-ROADMAP-02 WARNING: no "deviation:" field in last checkpoint.');
    console.warn('   Future commits MUST include deviation: none | proposed');
  }

  if (checkpoint.deviation && !['none', 'proposed'].includes(checkpoint.deviation.toLowerCase())) {
    errors.push(`Invalid deviation value: "${checkpoint.deviation}". Must be "none" or "proposed".`);
  }

  if (!checkpoint.evidence) {
    errors.push('Missing "evidence:" or "Files Modified:" in last checkpoint block');
  }

  if (errors.length > 0) {
    console.error('❌ RULE-ROADMAP-02 FAIL:');
    for (const err of errors) {
      console.error(`   - ${err}`);
    }
    process.exit(1);
  }

  console.log('✅ RULE-ROADMAP-02 passed — checkpoint structured');
  console.log(`   roadmap_item: ${checkpoint.roadmap_item}`);

  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTE ONLY IF RUN DIRECTLY (not imported)
// ═══════════════════════════════════════════════════════════════════════════════

const scriptPath = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(scriptPath);

if (isMainModule) {
  main();
}
