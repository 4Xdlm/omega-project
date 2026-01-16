/**
 * OMEGA Phase 93 - Atlas Auto-Regeneration Tests
 * @version 3.93.0
 * @standard NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();

// Import the module for testing (use dynamic import for CommonJS)
let atlasModule: any;

beforeAll(async () => {
  atlasModule = require('../scripts/atlas/auto-regen.cjs');
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function fileExists(relativePath: string): boolean {
  return existsSync(join(ROOT_DIR, relativePath));
}

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT_DIR, relativePath), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCRIPT EXISTENCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Atlas Auto-Regen Script', () => {
  const scriptPath = 'scripts/atlas/auto-regen.cjs';

  it('should have auto-regen.cjs', () => {
    expect(fileExists(scriptPath)).toBe(true);
  });

  it('should have version 3.93.0', () => {
    const content = readFile(scriptPath);
    expect(content).toMatch(/version:\s*['"]3\.93\.0['"]/);
  });

  it('should export autoRegen function', () => {
    expect(typeof atlasModule.autoRegen).toBe('function');
  });

  it('should export calculateHashes function', () => {
    expect(typeof atlasModule.calculateHashes).toBe('function');
  });

  it('should export calculateMerkleRoot function', () => {
    expect(typeof atlasModule.calculateMerkleRoot).toBe('function');
  });

  it('should export hashFile function', () => {
    expect(typeof atlasModule.hashFile).toBe('function');
  });

  it('should export hashString function', () => {
    expect(typeof atlasModule.hashString).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HASH FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Hash Functions', () => {
  it('should compute consistent hash for same string', () => {
    const hash1 = atlasModule.hashString('test');
    const hash2 = atlasModule.hashString('test');
    expect(hash1).toBe(hash2);
  });

  it('should compute different hash for different strings', () => {
    const hash1 = atlasModule.hashString('test1');
    const hash2 = atlasModule.hashString('test2');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce 64-character hex hash', () => {
    const hash = atlasModule.hashString('test');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('should hash empty string deterministically', () => {
    const hash = atlasModule.hashString('');
    expect(hash).toHaveLength(64);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MERKLE ROOT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Merkle Root Calculation', () => {
  it('should compute merkle root for single hash', () => {
    const hash = atlasModule.hashString('test');
    const merkle = atlasModule.calculateMerkleRoot([hash]);
    expect(merkle).toBe(hash);
  });

  it('should compute merkle root for multiple hashes', () => {
    const hashes = ['abc', 'def', 'ghi'].map(atlasModule.hashString);
    const merkle = atlasModule.calculateMerkleRoot(hashes);
    expect(merkle).toHaveLength(64);
  });

  it('should be deterministic regardless of input order', () => {
    const hashes = ['c', 'a', 'b'].map(atlasModule.hashString);
    const merkle1 = atlasModule.calculateMerkleRoot(hashes);
    const merkle2 = atlasModule.calculateMerkleRoot([...hashes].reverse());
    expect(merkle1).toBe(merkle2);
  });

  it('should handle empty array', () => {
    const merkle = atlasModule.calculateMerkleRoot([]);
    expect(merkle).toHaveLength(64);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE HASHING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('File Hashing', () => {
  it('should hash existing file', () => {
    const hash = atlasModule.hashFile(join(ROOT_DIR, 'package.json'));
    expect(hash).toHaveLength(64);
  });

  it('should produce consistent hash for same file', () => {
    const hash1 = atlasModule.hashFile(join(ROOT_DIR, 'package.json'));
    const hash2 = atlasModule.hashFile(join(ROOT_DIR, 'package.json'));
    expect(hash1).toBe(hash2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-REGEN TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Auto-Regen Function', () => {
  it('should run in dry-run mode', () => {
    const result = atlasModule.autoRegen({ dryRun: true });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should return hashes', () => {
    const result = atlasModule.autoRegen({ dryRun: true });
    expect(result.hashes).toBeDefined();
    expect(result.hashes.merkleRoot).toBeDefined();
    expect(result.hashes.atlasMetaHash).toBeDefined();
  });

  it('should include file hashes', () => {
    const result = atlasModule.autoRegen({ dryRun: true });
    expect(result.hashes.fileHashes).toBeDefined();
    expect(Array.isArray(result.hashes.fileHashes)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Hash Terminology Documentation', () => {
  const docPath = 'docs/HASH_TERMINOLOGY.md';

  it('should have HASH_TERMINOLOGY.md', () => {
    expect(fileExists(docPath)).toBe(true);
  });

  it('should document merkleRoot', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/merkleRoot/);
  });

  it('should document atlasMetaHash', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/atlasMetaHash/);
  });

  it('should document determinism requirements', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/Determinism/i);
  });

  it('should reference Phase 93', () => {
    const content = readFile(docPath);
    expect(content).toMatch(/Phase 93/);
  });
});
