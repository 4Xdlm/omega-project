/**
 * OMEGA Runner Capsule Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Tests for hermetic capsule creation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  collectRunFiles,
  validateCapsuleFiles,
  createCapsuleBuffer,
  computeCapsuleHash,
  generateCapsulePath,
  writeCapsuleFile,
  createCapsule,
  createCapsuleInMemory,
  verifyCapsuleDeterminism,
  DEFAULT_CAPSULE_OPTIONS,
} from '../../src/runner/capsule';
import type { CapsuleEntry } from '../../src/runner/capsule';
import {
  createRunPath,
  writeAllRunFiles,
  getRunDirectory,
} from '../../src/runner/run-directory';
import { getPipelineFiles } from '../../src/runner/pipeline';
import { ExitCode, FIXED_PATHS, RUN_FILES } from '../../src/runner/types';

const TEST_DIR = join(process.cwd(), '.test_capsule');
const RUNS_PATH = join(TEST_DIR, FIXED_PATHS.RUNS_ROOT);
const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z';

// Helper to create a valid run
function createValidRun(intentId: string): string {
  const intentJson = JSON.stringify({ intentId, content: 'Test content' });
  const { files, result } = getPipelineFiles(intentJson, {
    profile: 'OMEGA_STD',
    timestamp: FIXED_TIMESTAMP,
    basePath: TEST_DIR,
  });

  const runDir = createRunPath(TEST_DIR, intentId);
  writeAllRunFiles(runDir, files);

  return runDir.path;
}

describe('Capsule — Phase I', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(RUNS_PATH, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('DEFAULT_CAPSULE_OPTIONS', () => {
    it('has fixed timestamp at epoch 0', () => {
      expect(DEFAULT_CAPSULE_OPTIONS.fixedTimestamp.getTime()).toBe(0);
    });

    it('has compression level 6', () => {
      expect(DEFAULT_CAPSULE_OPTIONS.compressionLevel).toBe(6);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(DEFAULT_CAPSULE_OPTIONS)).toBe(true);
    });
  });

  describe('collectRunFiles', () => {
    it('collects all files from run directory', () => {
      const runPath = createValidRun('test-collect');

      const entries = collectRunFiles(runPath);

      expect(entries.length).toBeGreaterThan(0);
    });

    it('includes required files', () => {
      const runPath = createValidRun('test-required');

      const entries = collectRunFiles(runPath);
      const paths = entries.map(e => e.path);

      expect(paths).toContain(RUN_FILES.INTENT);
      expect(paths).toContain(RUN_FILES.CONTRACT);
      expect(paths).toContain(RUN_FILES.HASHES);
      expect(paths).toContain(RUN_FILES.RUN_HASH);
    });

    it('includes artifacts', () => {
      const runPath = createValidRun('test-artifacts');

      const entries = collectRunFiles(runPath);
      const artifactPaths = entries.filter(e => e.path.startsWith('artifacts/'));

      expect(artifactPaths.length).toBeGreaterThan(0);
    });

    it('computes hash for each file', () => {
      const runPath = createValidRun('test-hashes');

      const entries = collectRunFiles(runPath);

      for (const entry of entries) {
        expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    it('returns sorted entries (I-INV-09)', () => {
      const runPath = createValidRun('test-sorted');

      const entries = collectRunFiles(runPath);
      const paths = entries.map(e => e.path);
      const sortedPaths = [...paths].sort();

      expect(paths).toEqual(sortedPaths);
    });

    it('returns frozen array', () => {
      const runPath = createValidRun('test-frozen');

      const entries = collectRunFiles(runPath);

      expect(Object.isFrozen(entries)).toBe(true);
    });

    it('returns empty for non-existent directory', () => {
      const entries = collectRunFiles(join(RUNS_PATH, 'missing'));

      expect(entries).toHaveLength(0);
    });
  });

  describe('validateCapsuleFiles', () => {
    it('validates valid entries', () => {
      const runPath = createValidRun('test-valid');
      const entries = collectRunFiles(runPath);

      const result = validateCapsuleFiles(entries);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails for empty entries', () => {
      const result = validateCapsuleFiles([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No files to package');
    });

    it('fails for missing required files', () => {
      const entries: CapsuleEntry[] = [
        { path: 'random.txt', content: 'test', size: 4, hash: 'a'.repeat(64) },
      ];

      const result = validateCapsuleFiles(entries);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing required file'))).toBe(true);
    });

    it('fails for unsafe paths', () => {
      const entries: CapsuleEntry[] = [
        { path: '../escape.txt', content: 'bad', size: 3, hash: 'b'.repeat(64) },
      ];

      const result = validateCapsuleFiles(entries);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unsafe path'))).toBe(true);
    });

    it('returns frozen errors array', () => {
      const result = validateCapsuleFiles([]);

      expect(Object.isFrozen(result.errors)).toBe(true);
    });
  });

  describe('createCapsuleBuffer', () => {
    it('creates ZIP buffer from entries', async () => {
      const entries: CapsuleEntry[] = [
        { path: 'test.txt', content: 'hello', size: 5, hash: 'a'.repeat(64) },
      ];

      const buffer = await createCapsuleBuffer(entries);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('respects compression level', async () => {
      const entries: CapsuleEntry[] = [
        { path: 'test.txt', content: 'a'.repeat(1000), size: 1000, hash: 'a'.repeat(64) },
      ];

      const buffer0 = await createCapsuleBuffer(entries, { compressionLevel: 0 });
      const buffer9 = await createCapsuleBuffer(entries, { compressionLevel: 9 });

      // Higher compression should produce smaller output
      expect(buffer9.length).toBeLessThan(buffer0.length);
    });

    it('uses fixed timestamp for determinism', async () => {
      const entries: CapsuleEntry[] = [
        { path: 'test.txt', content: 'hello', size: 5, hash: 'a'.repeat(64) },
      ];
      const fixedDate = new Date(0);

      const buffer1 = await createCapsuleBuffer(entries, { fixedTimestamp: fixedDate });
      const buffer2 = await createCapsuleBuffer(entries, { fixedTimestamp: fixedDate });

      expect(buffer1.equals(buffer2)).toBe(true);
    });

    it('handles multiple files', async () => {
      const entries: CapsuleEntry[] = [
        { path: 'a.txt', content: 'aaa', size: 3, hash: 'a'.repeat(64) },
        { path: 'b.txt', content: 'bbb', size: 3, hash: 'b'.repeat(64) },
        { path: 'c.txt', content: 'ccc', size: 3, hash: 'c'.repeat(64) },
      ];

      const buffer = await createCapsuleBuffer(entries);

      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('computeCapsuleHash', () => {
    it('computes SHA256 hash of buffer', async () => {
      const buffer = Buffer.from('test content');

      const hash = computeCapsuleHash(buffer);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic', async () => {
      const buffer = Buffer.from('deterministic');

      const hash1 = computeCapsuleHash(buffer);
      const hash2 = computeCapsuleHash(buffer);

      expect(hash1).toBe(hash2);
    });

    it('different content produces different hash', async () => {
      const buffer1 = Buffer.from('content1');
      const buffer2 = Buffer.from('content2');

      const hash1 = computeCapsuleHash(buffer1);
      const hash2 = computeCapsuleHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateCapsulePath', () => {
    it('generates path with .capsule.zip extension', () => {
      const runPath = join(RUNS_PATH, 'run_test_1');

      const capsulePath = generateCapsulePath(runPath);

      expect(capsulePath).toContain('run_test_1.capsule.zip');
    });

    it('uses run directory as default base', () => {
      const runPath = join(RUNS_PATH, 'run_test_1');

      const capsulePath = generateCapsulePath(runPath);

      expect(capsulePath).toContain(RUNS_PATH);
    });

    it('respects custom base path', () => {
      const runPath = join(RUNS_PATH, 'run_test_1');
      const customBase = join(TEST_DIR, 'custom');

      const capsulePath = generateCapsulePath(runPath, customBase);

      expect(capsulePath).toContain('custom');
    });
  });

  describe('createCapsule', () => {
    it('creates capsule from valid run', async () => {
      const runPath = createValidRun('test-capsule');

      const result = await createCapsule(runPath, {
        outputPath: join(TEST_DIR, 'test.capsule.zip'),
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.PASS);
      expect(result.capsuleHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('creates file on disk', async () => {
      const runPath = createValidRun('test-file');
      const outputPath = join(TEST_DIR, 'output.capsule.zip');

      await createCapsule(runPath, { outputPath });

      expect(existsSync(outputPath)).toBe(true);
    });

    it('reports correct file count', async () => {
      const runPath = createValidRun('test-count');

      const result = await createCapsule(runPath, {
        outputPath: join(TEST_DIR, 'count.capsule.zip'),
      });

      expect(result.fileCount).toBeGreaterThan(0);
    });

    it('reports total bytes', async () => {
      const runPath = createValidRun('test-bytes');

      const result = await createCapsule(runPath, {
        outputPath: join(TEST_DIR, 'bytes.capsule.zip'),
      });

      expect(result.totalBytes).toBeGreaterThan(0);
    });

    it('fails for non-existent run', async () => {
      const result = await createCapsule(join(RUNS_PATH, 'missing'));

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.CAPSULE_FAIL);
    });

    it('returns frozen result', async () => {
      const runPath = createValidRun('test-frozen');

      const result = await createCapsule(runPath, {
        outputPath: join(TEST_DIR, 'frozen.capsule.zip'),
      });

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('createCapsuleInMemory', () => {
    it('creates capsule without writing to disk', async () => {
      const runPath = createValidRun('test-memory');

      const result = await createCapsuleInMemory(runPath);

      expect(result.success).toBe(true);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('returns entries', async () => {
      const runPath = createValidRun('test-entries');

      const result = await createCapsuleInMemory(runPath);

      expect(result.entries.length).toBeGreaterThan(0);
    });

    it('reports errors for invalid run', async () => {
      const result = await createCapsuleInMemory(join(RUNS_PATH, 'missing'));

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('verifyCapsuleDeterminism (I-INV-01)', () => {
    it('verifies same run produces same capsule', async () => {
      const runPath = createValidRun('test-determinism');

      const isDeterministic = await verifyCapsuleDeterminism(runPath);

      expect(isDeterministic).toBe(true);
    });

    it('returns false for non-existent run', async () => {
      const isDeterministic = await verifyCapsuleDeterminism(join(RUNS_PATH, 'missing'));

      expect(isDeterministic).toBe(false);
    });
  });

  describe('Determinism (I-INV-01)', () => {
    it('same run produces identical capsule hash 10 times', async () => {
      const runPath = createValidRun('test-10x');
      const fixedTimestamp = new Date(0);

      const hashes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const result = await createCapsuleInMemory(runPath, { fixedTimestamp });
        if (result.hash) {
          hashes.push(result.hash);
        }
      }

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1);
    });

    it('different runs produce different capsule hashes', async () => {
      const runPath1 = createValidRun('test-diff-1');
      const runPath2 = createValidRun('test-diff-2');
      const fixedTimestamp = new Date(0);

      const result1 = await createCapsuleInMemory(runPath1, { fixedTimestamp });
      const result2 = await createCapsuleInMemory(runPath2, { fixedTimestamp });

      expect(result1.hash).not.toBe(result2.hash);
    });
  });

  describe('Edge cases', () => {
    it('handles large files', async () => {
      const runPath = createValidRun('test-large');
      const runDir = getRunDirectory(runPath);

      // Write a large file
      const largeContent = 'x'.repeat(100000);
      const { writeRunFile } = await import('../../src/runner/run-directory');
      writeRunFile(runDir, 'large.txt', largeContent);

      const result = await createCapsuleInMemory(runPath);

      expect(result.success).toBe(true);
    });

    it('handles special characters in content', async () => {
      const entries: CapsuleEntry[] = [
        { path: 'special.txt', content: 'Hello\n\r\n\t\0World', size: 17, hash: 'a'.repeat(64) },
      ];

      const buffer = await createCapsuleBuffer(entries);

      expect(buffer.length).toBeGreaterThan(0);
    });

    it('preserves file order in capsule', async () => {
      const runPath = createValidRun('test-order');
      const fixedTimestamp = new Date(0);

      const result1 = await createCapsuleInMemory(runPath, { fixedTimestamp });
      const result2 = await createCapsuleInMemory(runPath, { fixedTimestamp });

      expect(result1.entries.map(e => e.path)).toEqual(result2.entries.map(e => e.path));
    });
  });
});
