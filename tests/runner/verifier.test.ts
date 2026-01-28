/**
 * OMEGA Runner Verifier Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Tests for run verification (read-only).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  verifyFileHash,
  verifyHashes,
  verifyRunHash,
  verifyRun,
  detectTampering,
  isRunIntact,
} from '../../src/runner/verifier';
import {
  createRunPath,
  writeAllRunFiles,
  getRunDirectory,
  writeRunFile,
} from '../../src/runner/run-directory';
import { getPipelineFiles } from '../../src/runner/pipeline';
import { ExitCode, FIXED_PATHS, RUN_FILES } from '../../src/runner/types';
import { computeHash } from '../../src/runner/pipeline';

const TEST_DIR = join(process.cwd(), '.test_verifier');
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

describe('Verifier — Phase I', () => {
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

  describe('verifyFileHash', () => {
    it('returns true for matching hash', () => {
      const content = 'test content';
      const hash = computeHash(content);

      expect(verifyFileHash(content, hash)).toBe(true);
    });

    it('returns false for mismatched hash', () => {
      const content = 'test content';
      const wrongHash = 'a'.repeat(64);

      expect(verifyFileHash(content, wrongHash)).toBe(false);
    });

    it('is case sensitive', () => {
      const hash = computeHash('test');

      expect(verifyFileHash('test', hash)).toBe(true);
      expect(verifyFileHash('Test', hash)).toBe(false);
    });
  });

  describe('verifyHashes', () => {
    it('verifies valid run', () => {
      const runPath = createValidRun('test-verify');

      const result = verifyHashes(runPath);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.PASS);
      expect(result.mismatches).toHaveLength(0);
    });

    it('detects missing file', () => {
      const runPath = createValidRun('test-missing');
      const runDir = getRunDirectory(runPath);

      // Delete a file (simulate corruption)
      const fs = require('fs');
      fs.unlinkSync(join(runPath, RUN_FILES.INTENT));

      const result = verifyHashes(runPath);

      expect(result.success).toBe(false);
      expect(result.mismatches.some(m => m.file === RUN_FILES.INTENT)).toBe(true);
    });

    it('detects tampered file', () => {
      const runPath = createValidRun('test-tamper');
      const runDir = getRunDirectory(runPath);

      // Tamper with a file
      writeRunFile(runDir, RUN_FILES.INTENT, '{"tampered": true}');

      const result = verifyHashes(runPath);

      expect(result.success).toBe(false);
      expect(result.mismatches.some(m => m.file === RUN_FILES.INTENT)).toBe(true);
    });

    it('fails for non-existent directory', () => {
      const result = verifyHashes(join(RUNS_PATH, 'missing'));

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.VERIFY_FAIL);
    });

    it('returns frozen result', () => {
      const runPath = createValidRun('test-frozen');

      const result = verifyHashes(runPath);

      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.mismatches)).toBe(true);
    });
  });

  describe('verifyRunHash', () => {
    it('verifies valid run hash', () => {
      const runPath = createValidRun('test-runhash');

      const result = verifyRunHash(runPath);

      expect(result.success).toBe(true);
    });

    it('detects tampered run hash', () => {
      const runPath = createValidRun('test-tamper-hash');
      const runDir = getRunDirectory(runPath);

      // Tamper with run hash
      writeRunFile(runDir, RUN_FILES.RUN_HASH, 'b'.repeat(64));

      const result = verifyRunHash(runPath);

      expect(result.success).toBe(false);
    });

    it('detects tampered hashes file', () => {
      const runPath = createValidRun('test-tamper-hashes');
      const runDir = getRunDirectory(runPath);

      // Tamper with hashes file
      writeRunFile(runDir, RUN_FILES.HASHES, 'tampered\n');

      const result = verifyRunHash(runPath);

      expect(result.success).toBe(false);
    });

    it('fails for missing run hash file', () => {
      const runPath = createValidRun('test-missing-hash');
      const fs = require('fs');
      fs.unlinkSync(join(runPath, RUN_FILES.RUN_HASH));

      const result = verifyRunHash(runPath);

      expect(result.success).toBe(false);
    });
  });

  describe('verifyRun (I-INV-05, I-INV-10)', () => {
    it('verifies complete valid run', () => {
      const runPath = createValidRun('test-complete');

      const result = verifyRun(runPath);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(ExitCode.PASS);
    });

    it('fails for non-existent directory', () => {
      const result = verifyRun(join(RUNS_PATH, 'missing'));

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(ExitCode.VERIFY_FAIL);
    });

    it('fails for tampered file', () => {
      const runPath = createValidRun('test-tamper');
      const runDir = getRunDirectory(runPath);

      // Tamper with contract
      writeRunFile(runDir, RUN_FILES.CONTRACT, '{"tampered": true}');

      const result = verifyRun(runPath);

      expect(result.success).toBe(false);
    });

    it('fails for missing required file', () => {
      const runPath = createValidRun('test-missing-required');
      const fs = require('fs');
      fs.unlinkSync(join(runPath, RUN_FILES.DELIVERY_MANIFEST));

      const result = verifyRun(runPath);

      expect(result.success).toBe(false);
    });

    it('reports correct file counts', () => {
      const runPath = createValidRun('test-counts');

      const result = verifyRun(runPath);

      expect(result.filesChecked).toBeGreaterThan(0);
      expect(result.filesValid).toBeGreaterThan(0);
    });
  });

  describe('detectTampering', () => {
    it('returns empty array for valid run', () => {
      const runPath = createValidRun('test-no-tamper');

      const tampered = detectTampering(runPath);

      expect(tampered).toHaveLength(0);
    });

    it('returns tampered files', () => {
      const runPath = createValidRun('test-detect');
      const runDir = getRunDirectory(runPath);

      // Tamper with intent
      writeRunFile(runDir, RUN_FILES.INTENT, '{"bad": true}');

      const tampered = detectTampering(runPath);

      expect(tampered).toContain(RUN_FILES.INTENT);
    });

    it('returns frozen array', () => {
      const runPath = createValidRun('test-frozen');

      const tampered = detectTampering(runPath);

      expect(Object.isFrozen(tampered)).toBe(true);
    });
  });

  describe('isRunIntact', () => {
    it('returns true for valid run', () => {
      const runPath = createValidRun('test-intact');

      expect(isRunIntact(runPath)).toBe(true);
    });

    it('returns false for tampered run', () => {
      const runPath = createValidRun('test-not-intact');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, RUN_FILES.INTENT, '{"tampered": true}');

      expect(isRunIntact(runPath)).toBe(false);
    });

    it('returns false for non-existent run', () => {
      expect(isRunIntact(join(RUNS_PATH, 'missing'))).toBe(false);
    });
  });

  describe('Read-only verification (I-INV-10)', () => {
    it('does not modify files during verification', () => {
      const runPath = createValidRun('test-readonly');
      const fs = require('fs');

      // Get timestamps before
      const beforeStats = fs.statSync(join(runPath, RUN_FILES.INTENT));

      // Verify
      verifyRun(runPath);

      // Get timestamps after
      const afterStats = fs.statSync(join(runPath, RUN_FILES.INTENT));

      // Modification times should be the same
      expect(afterStats.mtimeMs).toBe(beforeStats.mtimeMs);
    });
  });

  describe('Edge cases', () => {
    it('handles empty hashes file', () => {
      const runPath = createValidRun('test-empty-hashes');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, RUN_FILES.HASHES, '');

      const result = verifyHashes(runPath);

      expect(result.filesChecked).toBe(0);
    });

    it('handles extra files not in hashes', () => {
      const runPath = createValidRun('test-extra');
      const runDir = getRunDirectory(runPath);

      writeRunFile(runDir, 'extra.txt', 'extra content');

      const result = verifyHashes(runPath);

      // Extra files don't cause failure (they're just not in recorded hashes)
      expect(result.success).toBe(true);
    });
  });
});
