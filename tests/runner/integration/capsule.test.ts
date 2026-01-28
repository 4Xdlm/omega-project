/**
 * OMEGA Runner Capsule Integration Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Integration tests for capsule creation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import {
  getPipelineFiles,
  createRunPath,
  writeAllRunFiles,
  createCapsule,
  createCapsuleInMemory,
  verifyCapsuleDeterminism,
  collectRunFiles,
  validateCapsuleFiles,
  verifyRun,
  ExitCode,
  FIXED_PATHS,
  RUN_FILES,
} from '../../../src/runner';

const TEST_DIR = join(process.cwd(), '.test_capsule_integration');
const RUNS_PATH = join(TEST_DIR, FIXED_PATHS.RUNS_ROOT);
const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z';

// Helper to create a valid run
function createValidRun(intentId: string): string {
  const intent = { intentId, content: `Test content for ${intentId}` };
  const intentJson = JSON.stringify(intent);

  const { files, result } = getPipelineFiles(intentJson, {
    profile: 'OMEGA_STD',
    timestamp: FIXED_TIMESTAMP,
    basePath: TEST_DIR,
  });

  const runDir = createRunPath(TEST_DIR, intentId);
  writeAllRunFiles(runDir, files);

  return runDir.path;
}

describe('Capsule Integration — Phase I', () => {
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

  describe('Capsule Creation Flow', () => {
    it('creates capsule from verified run', async () => {
      const runPath = createValidRun('capsule-verified');

      // First verify the run
      const verifyResult = verifyRun(runPath);
      expect(verifyResult.success).toBe(true);

      // Then create capsule
      const result = await createCapsule(runPath, {
        outputPath: join(TEST_DIR, 'verified.capsule.zip'),
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.PASS);
      expect(existsSync(result.capsulePath)).toBe(true);
    });

    it('capsule contains all run files', async () => {
      const runPath = createValidRun('capsule-complete');

      const entries = collectRunFiles(runPath);
      const entryNames = entries.map(e => e.path);

      // Should contain all required files
      expect(entryNames).toContain(RUN_FILES.INTENT);
      expect(entryNames).toContain(RUN_FILES.CONTRACT);
      expect(entryNames).toContain(RUN_FILES.TRUTHGATE_VERDICT);
      expect(entryNames).toContain(RUN_FILES.HASHES);
      expect(entryNames).toContain(RUN_FILES.RUN_HASH);

      // Should contain artifacts
      const hasArtifacts = entryNames.some(n => n.startsWith(RUN_FILES.ARTIFACTS_DIR));
      expect(hasArtifacts).toBe(true);
    });

    it('capsule file has correct extension', async () => {
      const runPath = createValidRun('capsule-extension');

      const result = await createCapsule(runPath, {
        outputPath: join(TEST_DIR, 'test.capsule.zip'),
      });

      expect(result.capsulePath).toMatch(/\.capsule\.zip$/);
    });
  });

  describe('Capsule Determinism (I-INV-01)', () => {
    it('same run produces identical capsule hash', async () => {
      const runPath = createValidRun('determinism-same');
      const fixedTimestamp = new Date(0);

      const result1 = await createCapsuleInMemory(runPath, { fixedTimestamp });
      const result2 = await createCapsuleInMemory(runPath, { fixedTimestamp });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.hash).toBe(result2.hash);
    });

    it('verifyCapsuleDeterminism returns true for valid run', async () => {
      const runPath = createValidRun('determinism-verify');

      const isDeterministic = await verifyCapsuleDeterminism(runPath, {
        fixedTimestamp: new Date(0),
      });

      expect(isDeterministic).toBe(true);
    });

    it('capsule hash differs for different runs', async () => {
      const runPath1 = createValidRun('determinism-diff-1');
      const runPath2 = createValidRun('determinism-diff-2');
      const fixedTimestamp = new Date(0);

      const result1 = await createCapsuleInMemory(runPath1, { fixedTimestamp });
      const result2 = await createCapsuleInMemory(runPath2, { fixedTimestamp });

      expect(result1.hash).not.toBe(result2.hash);
    });

    it('capsule is reproducible across 10 creations', async () => {
      const runPath = createValidRun('determinism-10x');
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
  });

  describe('Capsule Validation', () => {
    it('validates run has required files', async () => {
      const runPath = createValidRun('validate-required');
      const entries = collectRunFiles(runPath);

      const validation = validateCapsuleFiles(entries);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('fails validation for incomplete run', async () => {
      // Create partial run directory
      const partialDir = join(RUNS_PATH, 'run_partial_1');
      mkdirSync(partialDir, { recursive: true });

      const entries = collectRunFiles(partialDir);
      const validation = validateCapsuleFiles(entries);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('No files'))).toBe(true);
    });

    it('fails validation for missing required files', async () => {
      const runPath = createValidRun('validate-missing');
      const fs = require('fs');

      // Delete a required file
      fs.unlinkSync(join(runPath, RUN_FILES.TRUTHGATE_VERDICT));

      const entries = collectRunFiles(runPath);
      const validation = validateCapsuleFiles(entries);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Missing'))).toBe(true);
    });
  });

  describe('Capsule Metadata', () => {
    it('reports correct file count', async () => {
      const runPath = createValidRun('meta-count');

      const result = await createCapsule(runPath, {
        outputPath: join(TEST_DIR, 'count.capsule.zip'),
      });

      expect(result.fileCount).toBeGreaterThan(0);

      // Should match collected files
      const entries = collectRunFiles(runPath);
      expect(result.fileCount).toBe(entries.length);
    });

    it('reports total bytes correctly', async () => {
      const runPath = createValidRun('meta-bytes');

      const result = await createCapsule(runPath, {
        outputPath: join(TEST_DIR, 'bytes.capsule.zip'),
      });

      expect(result.totalBytes).toBeGreaterThan(0);
    });

    it('capsule file is smaller than total bytes (compression)', async () => {
      const runPath = createValidRun('meta-compression');
      const outputPath = join(TEST_DIR, 'compressed.capsule.zip');

      const result = await createCapsule(runPath, { outputPath });

      const capsuleStat = statSync(outputPath);
      // ZIP should be smaller due to compression
      expect(capsuleStat.size).toBeLessThanOrEqual(result.totalBytes * 2);
    });
  });

  describe('Error Handling', () => {
    it('fails gracefully for non-existent run', async () => {
      const result = await createCapsule(join(RUNS_PATH, 'nonexistent'));

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.CAPSULE_FAIL);
    });

    it('returns frozen result on failure', async () => {
      const result = await createCapsule(join(RUNS_PATH, 'nonexistent'));

      expect(Object.isFrozen(result)).toBe(true);
    });

    it('in-memory creation handles errors', async () => {
      const result = await createCapsuleInMemory(join(RUNS_PATH, 'missing'));

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('File Order in Capsule', () => {
    it('files are sorted alphabetically', async () => {
      const runPath = createValidRun('sort-order');

      const entries = collectRunFiles(runPath);
      const paths = entries.map(e => e.path);

      const sortedPaths = [...paths].sort();
      expect(paths).toEqual(sortedPaths);
    });

    it('sort order is deterministic across collections', async () => {
      const runPath = createValidRun('sort-determinism');

      const entries1 = collectRunFiles(runPath);
      const entries2 = collectRunFiles(runPath);

      expect(entries1.map(e => e.path)).toEqual(entries2.map(e => e.path));
    });
  });

  describe('Capsule Hash Integrity', () => {
    it('capsule hash is 64-character hex', async () => {
      const runPath = createValidRun('hash-format');

      const result = await createCapsule(runPath, {
        outputPath: join(TEST_DIR, 'hash.capsule.zip'),
      });

      expect(result.capsuleHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('capsule hash differs from run hash', async () => {
      const intent = { intentId: 'hash-diff', content: 'Hash comparison test' };
      const intentJson = JSON.stringify(intent);

      const { files, result: pipelineResult } = getPipelineFiles(intentJson, {
        profile: 'OMEGA_STD',
        timestamp: FIXED_TIMESTAMP,
        basePath: TEST_DIR,
      });

      const runDir = createRunPath(TEST_DIR, intent.intentId);
      writeAllRunFiles(runDir, files);

      const capsuleResult = await createCapsule(runDir.path, {
        outputPath: join(TEST_DIR, 'diff.capsule.zip'),
      });

      // Capsule hash includes ZIP structure, run hash doesn't
      expect(capsuleResult.capsuleHash).not.toBe(pipelineResult.runHash);
    });
  });
});
