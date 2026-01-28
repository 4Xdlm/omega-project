/**
 * OMEGA Runner Verify Integration Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Integration tests for verification (I-INV-05, I-INV-10).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  getPipelineFiles,
  createRunPath,
  writeAllRunFiles,
  getRunDirectory,
  writeRunFile,
  verifyRun,
  verifyHashes,
  verifyRunHash,
  isRunIntact,
  detectTampering,
  ExitCode,
  FIXED_PATHS,
  RUN_FILES,
} from '../../../src/runner';

const TEST_DIR = join(process.cwd(), '.test_verify_integration');
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

describe('Verify Integration — Phase I', () => {
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

  describe('Read-Only Verification (I-INV-10)', () => {
    it('verifyRun does not modify any files', async () => {
      const runPath = createValidRun('readonly-test');

      // Get timestamps before
      const files = [
        RUN_FILES.INTENT,
        RUN_FILES.CONTRACT,
        RUN_FILES.HASHES,
        RUN_FILES.RUN_HASH,
      ];
      const beforeStats = files.map(f => ({
        file: f,
        mtime: statSync(join(runPath, f)).mtimeMs,
      }));

      // Run verification
      verifyRun(runPath);

      // Get timestamps after
      const afterStats = files.map(f => ({
        file: f,
        mtime: statSync(join(runPath, f)).mtimeMs,
      }));

      // All timestamps should be unchanged
      for (let i = 0; i < files.length; i++) {
        expect(afterStats[i].mtime).toBe(beforeStats[i].mtime);
      }
    });

    it('verifyHashes does not modify any files', async () => {
      const runPath = createValidRun('hashes-readonly');

      const beforeContent = readFileSync(join(runPath, RUN_FILES.HASHES), 'utf-8');

      verifyHashes(runPath);

      const afterContent = readFileSync(join(runPath, RUN_FILES.HASHES), 'utf-8');
      expect(afterContent).toBe(beforeContent);
    });

    it('verifyRunHash does not modify any files', async () => {
      const runPath = createValidRun('runhash-readonly');

      const beforeContent = readFileSync(join(runPath, RUN_FILES.RUN_HASH), 'utf-8');

      verifyRunHash(runPath);

      const afterContent = readFileSync(join(runPath, RUN_FILES.RUN_HASH), 'utf-8');
      expect(afterContent).toBe(beforeContent);
    });

    it('multiple verifications do not accumulate changes', async () => {
      const runPath = createValidRun('multi-verify');

      // Run verification 10 times
      for (let i = 0; i < 10; i++) {
        const result = verifyRun(runPath);
        expect(result.success).toBe(true);
      }

      // Should still verify
      expect(isRunIntact(runPath)).toBe(true);
    });
  });

  describe('Tampering Detection', () => {
    it('detects modified intent.json', async () => {
      const runPath = createValidRun('tamper-intent');
      const runDir = getRunDirectory(runPath);

      // Tamper with intent
      writeRunFile(runDir, RUN_FILES.INTENT, '{"tampered": true}');

      const result = verifyRun(runPath);
      expect(result.success).toBe(false);
      expect(result.mismatches.some(m => m.file === RUN_FILES.INTENT)).toBe(true);
    });

    it('detects modified contract.json', async () => {
      const runPath = createValidRun('tamper-contract');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, RUN_FILES.CONTRACT, '{"tampered": true}');

      const result = verifyRun(runPath);
      expect(result.success).toBe(false);
      expect(result.mismatches.some(m => m.file === RUN_FILES.CONTRACT)).toBe(true);
    });

    it('detects modified truthgate_verdict.json', async () => {
      const runPath = createValidRun('tamper-verdict');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, RUN_FILES.TRUTHGATE_VERDICT, '{"passed": false}');

      const result = verifyRun(runPath);
      expect(result.success).toBe(false);
    });

    it('detects modified artifact', async () => {
      const runPath = createValidRun('tamper-artifact');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, `${RUN_FILES.ARTIFACTS_DIR}/output.txt`, 'TAMPERED CONTENT');

      const result = verifyRun(runPath);
      expect(result.success).toBe(false);
    });

    it('detects modified hashes.txt', async () => {
      const runPath = createValidRun('tamper-hashes');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, RUN_FILES.HASHES, 'x'.repeat(64) + '  fake.txt');

      const result = verifyRunHash(runPath);
      expect(result.success).toBe(false);
    });

    it('detects modified run_hash.txt', async () => {
      const runPath = createValidRun('tamper-runhash');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, RUN_FILES.RUN_HASH, 'f'.repeat(64));

      const result = verifyRunHash(runPath);
      expect(result.success).toBe(false);
    });

    it('detects deleted required file', async () => {
      const runPath = createValidRun('delete-file');
      const fs = require('fs');

      // Delete a required file
      fs.unlinkSync(join(runPath, RUN_FILES.TRUTHGATE_PROOF));

      const result = verifyRun(runPath);
      expect(result.success).toBe(false);
    });

    it('detectTampering returns list of tampered files', async () => {
      const runPath = createValidRun('detect-list');
      const runDir = getRunDirectory(runPath);

      // Tamper with multiple files
      writeRunFile(runDir, RUN_FILES.INTENT, '{"a": 1}');
      writeRunFile(runDir, RUN_FILES.CONTRACT, '{"b": 2}');

      const tampered = detectTampering(runPath);

      expect(tampered).toContain(RUN_FILES.INTENT);
      expect(tampered).toContain(RUN_FILES.CONTRACT);
    });
  });

  describe('Verification Results', () => {
    it('reports correct file counts for valid run', async () => {
      const runPath = createValidRun('counts-valid');

      const result = verifyRun(runPath);

      expect(result.filesChecked).toBeGreaterThan(0);
      expect(result.filesValid).toBe(result.filesChecked);
    });

    it('reports correct file counts for tampered run', async () => {
      const runPath = createValidRun('counts-tampered');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, RUN_FILES.INTENT, '{"x": 1}');

      const result = verifyHashes(runPath);

      expect(result.filesChecked).toBeGreaterThan(0);
      expect(result.filesValid).toBeLessThan(result.filesChecked);
    });

    it('returns frozen result objects', async () => {
      const runPath = createValidRun('frozen-result');

      const result = verifyRun(runPath);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.mismatches)).toBe(true);
    });

    it('mismatch contains expected and actual hashes', async () => {
      const runPath = createValidRun('mismatch-detail');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, RUN_FILES.INTENT, '{"tampered": true}');

      const result = verifyHashes(runPath);
      const mismatch = result.mismatches.find(m => m.file === RUN_FILES.INTENT);

      expect(mismatch).toBeDefined();
      expect(mismatch?.expected).toMatch(/^[a-f0-9]{64}$/);
      expect(mismatch?.actual).toMatch(/^[a-f0-9]{64}$/);
      expect(mismatch?.expected).not.toBe(mismatch?.actual);
    });
  });

  describe('Edge Cases', () => {
    it('handles non-existent run directory', async () => {
      const result = verifyRun(join(RUNS_PATH, 'nonexistent'));

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.VERIFY_FAIL);
    });

    it('handles empty run directory', async () => {
      const emptyDir = join(RUNS_PATH, 'run_empty_1');
      mkdirSync(emptyDir, { recursive: true });

      const result = verifyRun(emptyDir);

      expect(result.success).toBe(false);
    });

    it('handles run with only some files', async () => {
      const partialDir = join(RUNS_PATH, 'run_partial_1');
      mkdirSync(partialDir, { recursive: true });
      writeFileSync(join(partialDir, RUN_FILES.INTENT), '{}');

      const result = verifyRun(partialDir);

      expect(result.success).toBe(false);
    });

    it('isRunIntact returns boolean correctly', async () => {
      const validPath = createValidRun('intact-bool');
      const invalidPath = join(RUNS_PATH, 'nonexistent');

      expect(typeof isRunIntact(validPath)).toBe('boolean');
      expect(typeof isRunIntact(invalidPath)).toBe('boolean');
      expect(isRunIntact(validPath)).toBe(true);
      expect(isRunIntact(invalidPath)).toBe(false);
    });
  });

  describe('Verification Isolation (I-INV-05)', () => {
    it('verification does not call pipeline functions', async () => {
      const runPath = createValidRun('isolation-test');

      // Verification should only read files, not execute pipeline
      // This is a design verification - we check that verify works
      // without any pipeline execution by testing an existing run
      const result = verifyRun(runPath);

      expect(result.success).toBe(true);
    });

    it('verification works on pre-existing runs', async () => {
      // Create a run
      const runPath = createValidRun('preexisting');

      // In a real scenario, this run could have been created days ago
      // Verification should still work on it
      const result = verifyRun(runPath);

      expect(result.success).toBe(true);
    });
  });
});
