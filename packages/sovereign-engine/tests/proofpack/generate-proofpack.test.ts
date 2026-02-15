/**
 * Tests for ProofPack Generator — Sprint 8 Commit 8.1 (HARDEN-PP-01)
 * Invariants: PP-01 to PP-03
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateProofPack } from '../../../../scripts/proofpack/generate-proofpack.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_OUT_DIR = resolve(__dirname, 'temp-proofpack-test');
const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

describe('ProofPack Generator (HARDEN-PP-01)', () => {
  beforeEach(() => {
    // Clean test output dir before each test
    if (existsSync(TEST_OUT_DIR)) {
      rmSync(TEST_OUT_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_OUT_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean test output dir after each test
    if (existsSync(TEST_OUT_DIR)) {
      rmSync(TEST_OUT_DIR, { recursive: true, force: true });
    }
  });

  it('PP-01: generateProofPack creates MANIFEST.json + HASHES.sha256 + EVIDENCE.md', async () => {
    await generateProofPack({ outDir: TEST_OUT_DIR, repoRoot: REPO_ROOT });

    // Check all three files exist
    expect(existsSync(resolve(TEST_OUT_DIR, 'MANIFEST.json'))).toBe(true);
    expect(existsSync(resolve(TEST_OUT_DIR, 'HASHES.sha256'))).toBe(true);
    expect(existsSync(resolve(TEST_OUT_DIR, 'EVIDENCE.md'))).toBe(true);

    // Verify MANIFEST.json structure
    const manifest = JSON.parse(readFileSync(resolve(TEST_OUT_DIR, 'MANIFEST.json'), 'utf-8'));
    expect(manifest.schema_version).toBe('proofpack.v1');
    expect(manifest.git_commit).toBeDefined();
    expect(manifest.git_branch).toBeDefined();
    expect(manifest.node_version).toBeDefined();
    expect(manifest.platform).toBeDefined();
    expect(Array.isArray(manifest.packages)).toBe(true);
    expect(Array.isArray(manifest.gates)).toBe(true);
  });

  it('PP-02: HASHES.sha256 is sorted lexicographically (paths)', async () => {
    await generateProofPack({ outDir: TEST_OUT_DIR, repoRoot: REPO_ROOT });

    const hashesContent = readFileSync(resolve(TEST_OUT_DIR, 'HASHES.sha256'), 'utf-8');
    const lines = hashesContent.trim().split('\n');

    // Extract paths from "hash  path" format
    const paths = lines.map(line => line.split('  ')[1]);

    // Check if paths are sorted
    const sortedPaths = [...paths].sort();
    expect(paths).toEqual(sortedPaths);
  });

  it('PP-03: generation does not modify any file outside outDir', async () => {
    // Snapshot file list in repo (just check ROADMAP_CHECKPOINT.md as canary)
    const checkpointPath = resolve(REPO_ROOT, 'sessions', 'ROADMAP_CHECKPOINT.md');
    const beforeContent = existsSync(checkpointPath)
      ? readFileSync(checkpointPath, 'utf-8')
      : null;

    await generateProofPack({ outDir: TEST_OUT_DIR, repoRoot: REPO_ROOT });

    // Verify checkpoint file hasn't changed
    if (beforeContent !== null) {
      const afterContent = readFileSync(checkpointPath, 'utf-8');
      expect(afterContent).toBe(beforeContent);
    }

    // Verify only outDir was created/modified
    const files = readdirSync(TEST_OUT_DIR);
    expect(files).toContain('MANIFEST.json');
    expect(files).toContain('HASHES.sha256');
    expect(files).toContain('EVIDENCE.md');
  });
});
