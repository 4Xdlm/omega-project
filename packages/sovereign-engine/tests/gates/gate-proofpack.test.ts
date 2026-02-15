/**
 * Tests for Gate ProofPack — Sprint 8 Commit 8.2 (HARDEN-GATE-PP-01)
 * Invariants: GP-PP-01 to GP-PP-04
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { verifyProofPack } from '../../../../scripts/gate-proofpack.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = resolve(__dirname, 'temp-gate-proofpack-test');
const VALID_FIXTURE = resolve(__dirname, '..', 'fixtures', 'proofpack-valid');

describe('Gate ProofPack (HARDEN-GATE-PP-01)', () => {
  beforeEach(() => {
    // Clean test dir
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean test dir
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('GP-PP-01: FAIL if MANIFEST absent', () => {
    // Create only HASHES and EVIDENCE
    writeFileSync(resolve(TEST_DIR, 'HASHES.sha256'), 'test', 'utf-8');
    writeFileSync(resolve(TEST_DIR, 'EVIDENCE.md'), 'test', 'utf-8');

    const result = verifyProofPack({ dir: TEST_DIR });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('MANIFEST.json not found');
  });

  it('GP-PP-02: FAIL if HASHES absent', () => {
    // Create only MANIFEST and EVIDENCE
    writeFileSync(resolve(TEST_DIR, 'MANIFEST.json'), '{}', 'utf-8');
    writeFileSync(resolve(TEST_DIR, 'EVIDENCE.md'), 'test', 'utf-8');

    const result = verifyProofPack({ dir: TEST_DIR });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('HASHES.sha256 not found');
  });

  it('GP-PP-03: FAIL if ROADMAP_CHECKPOINT.md absent from HASHES', () => {
    // Create files but HASHES missing required files
    writeFileSync(resolve(TEST_DIR, 'MANIFEST.json'), '{}', 'utf-8');
    writeFileSync(resolve(TEST_DIR, 'HASHES.sha256'), 'abc123  some/other/file.ts\n', 'utf-8');
    writeFileSync(resolve(TEST_DIR, 'EVIDENCE.md'), 'test', 'utf-8');

    const result = verifyProofPack({ dir: TEST_DIR });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ROADMAP_CHECKPOINT.md'))).toBe(true);
  });

  it('GP-PP-04: PASS on valid proofpack fixture', () => {
    const result = verifyProofPack({ dir: VALID_FIXTURE });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
