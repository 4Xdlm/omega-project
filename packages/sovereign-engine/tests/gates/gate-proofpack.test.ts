/**
 * Tests for Gate ProofPack — Sprint 8 Commit 8.2 (HARDEN-GATE-PP-01)
 * Invariants: GP-PP-01 to GP-PP-04
 */

import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { verifyProofPack } from '../../../../scripts/gate-proofpack.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR_BASE = resolve(__dirname, 'temp-gate-proofpack-test');
const VALID_FIXTURE = resolve(__dirname, '..', 'fixtures', 'proofpack-valid');

// Each test gets its own isolated subdirectory to avoid cross-mount rmSync issues
let testCounter = 0;
function freshTestDir(): string {
  testCounter++;
  const dir = resolve(TEST_DIR_BASE, `t${testCounter}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('Gate ProofPack (HARDEN-GATE-PP-01)', () => {
  afterAll(() => {
    try {
      if (existsSync(TEST_DIR_BASE)) {
        rmSync(TEST_DIR_BASE, { recursive: true, force: true });
      }
    } catch { /* EPERM on cross-mount — temp dir persists until manual cleanup */ }
  });

  it('GP-PP-01: FAIL if MANIFEST absent', () => {
    const dir = freshTestDir();
    writeFileSync(resolve(dir, 'HASHES.sha256'), 'test', 'utf-8');
    writeFileSync(resolve(dir, 'EVIDENCE.md'), 'test', 'utf-8');

    const result = verifyProofPack({ dir });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('MANIFEST.json not found');
  });

  it('GP-PP-02: FAIL if HASHES absent', () => {
    const dir = freshTestDir();
    writeFileSync(resolve(dir, 'MANIFEST.json'), '{}', 'utf-8');
    writeFileSync(resolve(dir, 'EVIDENCE.md'), 'test', 'utf-8');

    const result = verifyProofPack({ dir });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('HASHES.sha256 not found');
  });

  it('GP-PP-03: FAIL if ROADMAP_CHECKPOINT.md absent from HASHES', () => {
    const dir = freshTestDir();
    writeFileSync(resolve(dir, 'MANIFEST.json'), '{}', 'utf-8');
    writeFileSync(resolve(dir, 'HASHES.sha256'), 'abc123  some/other/file.ts\n', 'utf-8');
    writeFileSync(resolve(dir, 'EVIDENCE.md'), 'test', 'utf-8');

    const result = verifyProofPack({ dir });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ROADMAP_CHECKPOINT.md'))).toBe(true);
  });

  it('GP-PP-04: PASS on valid proofpack fixture', () => {
    const result = verifyProofPack({ dir: VALID_FIXTURE });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
