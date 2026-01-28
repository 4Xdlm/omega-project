/**
 * OMEGA Runner Directory Tests v1.0
 * Phase I - NASA-Grade L4 / DO-178C
 *
 * Tests for run directory management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  getNextSequence,
  createRunPath,
  createRunDirectory,
  getRunDirectory,
  writeRunFile,
  readRunFile,
  runFileExists,
  listRunFiles,
  writeAllRunFiles,
  readHashesFile,
  readRunHash,
  computeFileHash,
  listIntentFiles,
  readIntentFile,
} from '../../src/runner/run-directory';
import { FIXED_PATHS, RUN_FILES, generateRunId } from '../../src/runner/types';
import { computeHash } from '../../src/runner/pipeline';

const TEST_DIR = join(process.cwd(), '.test_run_directory');
const RUNS_PATH = join(TEST_DIR, FIXED_PATHS.RUNS_ROOT);

describe('Run Directory — Phase I', () => {
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

  describe('getNextSequence', () => {
    it('returns 1 for empty directory', () => {
      const seq = getNextSequence(TEST_DIR, 'test');
      expect(seq).toBe(1);
    });

    it('returns next sequence number', () => {
      mkdirSync(join(RUNS_PATH, 'run_test_1'));
      mkdirSync(join(RUNS_PATH, 'run_test_2'));

      const seq = getNextSequence(TEST_DIR, 'test');
      expect(seq).toBe(3);
    });

    it('handles gaps in sequence', () => {
      mkdirSync(join(RUNS_PATH, 'run_test_1'));
      mkdirSync(join(RUNS_PATH, 'run_test_5'));

      const seq = getNextSequence(TEST_DIR, 'test');
      expect(seq).toBe(6);
    });

    it('handles different intent IDs', () => {
      mkdirSync(join(RUNS_PATH, 'run_test-a_1'));
      mkdirSync(join(RUNS_PATH, 'run_test-b_3'));

      expect(getNextSequence(TEST_DIR, 'test-a')).toBe(2);
      expect(getNextSequence(TEST_DIR, 'test-b')).toBe(4);
      expect(getNextSequence(TEST_DIR, 'test-c')).toBe(1);
    });
  });

  describe('createRunPath', () => {
    it('creates run path info', () => {
      const runDir = createRunPath(TEST_DIR, 'my-intent');

      expect(runDir.runId).toMatch(/^run_my-intent_1$/);
      expect(runDir.path).toContain('run_my-intent_1');
      expect(runDir.exists).toBe(false);
    });

    it('increments sequence for existing runs', () => {
      mkdirSync(join(RUNS_PATH, 'run_test_1'));

      const runDir = createRunPath(TEST_DIR, 'test');

      expect(runDir.runId).toBe('run_test_2');
    });

    it('returns frozen result', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      expect(Object.isFrozen(runDir)).toBe(true);
    });
  });

  describe('createRunDirectory', () => {
    it('creates directory on disk', () => {
      const runDir = createRunPath(TEST_DIR, 'test');

      createRunDirectory(runDir);

      expect(existsSync(runDir.path)).toBe(true);
    });

    it('creates artifacts subdirectory', () => {
      const runDir = createRunPath(TEST_DIR, 'test');

      createRunDirectory(runDir);

      const artifactsPath = join(runDir.path, RUN_FILES.ARTIFACTS_DIR);
      expect(existsSync(artifactsPath)).toBe(true);
    });

    it('is idempotent', () => {
      const runDir = createRunPath(TEST_DIR, 'test');

      createRunDirectory(runDir);
      createRunDirectory(runDir);

      expect(existsSync(runDir.path)).toBe(true);
    });
  });

  describe('getRunDirectory', () => {
    it('gets existing directory info', () => {
      mkdirSync(join(RUNS_PATH, 'run_test_1'));

      const runDir = getRunDirectory(join(RUNS_PATH, 'run_test_1'));

      expect(runDir.runId).toBe('run_test_1');
      expect(runDir.exists).toBe(true);
    });

    it('handles non-existent directory', () => {
      const runDir = getRunDirectory(join(RUNS_PATH, 'run_missing_1'));

      expect(runDir.exists).toBe(false);
    });
  });

  describe('writeRunFile', () => {
    it('writes file to run directory', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);

      writeRunFile(runDir, 'test.txt', 'content');

      const filePath = join(runDir.path, 'test.txt');
      expect(existsSync(filePath)).toBe(true);
    });

    it('normalizes line endings to LF', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);

      writeRunFile(runDir, 'test.txt', 'line1\r\nline2');

      const content = readRunFile(runDir, 'test.txt');
      expect(content).toBe('line1\nline2');
    });

    it('throws for path traversal (I-INV-08)', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);

      expect(() => writeRunFile(runDir, '../escape.txt', 'bad')).toThrow('I-INV-08');
    });

    it('creates nested directories', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);

      writeRunFile(runDir, 'artifacts/output.txt', 'content');

      expect(existsSync(join(runDir.path, 'artifacts/output.txt'))).toBe(true);
    });
  });

  describe('readRunFile', () => {
    it('reads existing file', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      writeRunFile(runDir, 'test.txt', 'content');

      const content = readRunFile(runDir, 'test.txt');

      expect(content).toBe('content');
    });

    it('returns null for missing file', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);

      const content = readRunFile(runDir, 'missing.txt');

      expect(content).toBeNull();
    });

    it('returns null for path traversal', () => {
      const runDir = createRunPath(TEST_DIR, 'test');

      const content = readRunFile(runDir, '../escape.txt');

      expect(content).toBeNull();
    });
  });

  describe('runFileExists', () => {
    it('returns true for existing file', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      writeRunFile(runDir, 'test.txt', 'content');

      expect(runFileExists(runDir, 'test.txt')).toBe(true);
    });

    it('returns false for missing file', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);

      expect(runFileExists(runDir, 'missing.txt')).toBe(false);
    });

    it('returns false for path traversal', () => {
      const runDir = createRunPath(TEST_DIR, 'test');

      expect(runFileExists(runDir, '../escape.txt')).toBe(false);
    });
  });

  describe('listRunFiles', () => {
    it('lists files in run directory', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      writeRunFile(runDir, 'a.txt', 'a');
      writeRunFile(runDir, 'b.txt', 'b');

      const contents = listRunFiles(getRunDirectory(runDir.path));

      expect(contents.files).toHaveLength(2);
    });

    it('lists artifacts separately', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      writeRunFile(runDir, 'root.txt', 'root');
      writeRunFile(runDir, 'artifacts/output.txt', 'artifact');

      const contents = listRunFiles(getRunDirectory(runDir.path));

      expect(contents.files.some(f => f.name === 'root.txt')).toBe(true);
      expect(contents.artifacts.some(f => f.name === 'output.txt')).toBe(true);
    });

    it('returns empty for non-existent directory', () => {
      const runDir = getRunDirectory(join(RUNS_PATH, 'missing'));

      const contents = listRunFiles(runDir);

      expect(contents.files).toHaveLength(0);
      expect(contents.artifacts).toHaveLength(0);
    });

    it('includes file sizes', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      writeRunFile(runDir, 'test.txt', 'hello');

      const contents = listRunFiles(getRunDirectory(runDir.path));

      expect(contents.files[0].size).toBe(5);
    });
  });

  describe('writeAllRunFiles', () => {
    it('writes all files at once', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      const files = new Map<string, string>();
      files.set('a.txt', 'content a');
      files.set('b.txt', 'content b');
      files.set('artifacts/out.txt', 'artifact');

      writeAllRunFiles(runDir, files);

      expect(existsSync(join(runDir.path, 'a.txt'))).toBe(true);
      expect(existsSync(join(runDir.path, 'b.txt'))).toBe(true);
      expect(existsSync(join(runDir.path, 'artifacts/out.txt'))).toBe(true);
    });

    it('creates directory if needed', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      const files = new Map<string, string>();
      files.set('test.txt', 'content');

      expect(runDir.exists).toBe(false);

      writeAllRunFiles(runDir, files);

      expect(existsSync(runDir.path)).toBe(true);
    });
  });

  describe('readHashesFile', () => {
    it('parses hashes file', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      const hashContent = [
        'a'.repeat(64) + '  file1.txt',
        'b'.repeat(64) + '  file2.txt',
      ].join('\n');
      writeRunFile(runDir, RUN_FILES.HASHES, hashContent);

      const hashes = readHashesFile(getRunDirectory(runDir.path));

      expect(hashes.get('file1.txt')).toBe('a'.repeat(64));
      expect(hashes.get('file2.txt')).toBe('b'.repeat(64));
    });

    it('returns empty map for missing file', () => {
      const runDir = getRunDirectory(join(RUNS_PATH, 'missing'));

      const hashes = readHashesFile(runDir);

      expect(hashes.size).toBe(0);
    });
  });

  describe('readRunHash', () => {
    it('reads run hash', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      writeRunFile(runDir, RUN_FILES.RUN_HASH, 'c'.repeat(64));

      const hash = readRunHash(getRunDirectory(runDir.path));

      expect(hash).toBe('c'.repeat(64));
    });

    it('trims whitespace', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      writeRunFile(runDir, RUN_FILES.RUN_HASH, '  ' + 'd'.repeat(64) + '\n');

      const hash = readRunHash(getRunDirectory(runDir.path));

      expect(hash).toBe('d'.repeat(64));
    });

    it('returns null for missing file', () => {
      const runDir = getRunDirectory(join(RUNS_PATH, 'missing'));

      expect(readRunHash(runDir)).toBeNull();
    });
  });

  describe('computeFileHash', () => {
    it('computes hash of file', () => {
      const runDir = createRunPath(TEST_DIR, 'test');
      createRunDirectory(runDir);
      writeRunFile(runDir, 'test.txt', 'content');

      const hash = computeFileHash(getRunDirectory(runDir.path), 'test.txt');

      expect(hash).toBe(computeHash('content'));
    });

    it('returns null for missing file', () => {
      const runDir = getRunDirectory(join(RUNS_PATH, 'missing'));

      expect(computeFileHash(runDir, 'missing.txt')).toBeNull();
    });
  });

  describe('listIntentFiles (I-INV-09)', () => {
    it('lists JSON files sorted', () => {
      const intentsDir = join(TEST_DIR, 'intents');
      mkdirSync(intentsDir, { recursive: true });
      writeFileSync(join(intentsDir, 'c.json'), '{}');
      writeFileSync(join(intentsDir, 'a.json'), '{}');
      writeFileSync(join(intentsDir, 'b.json'), '{}');

      const files = listIntentFiles(intentsDir);

      expect(files).toHaveLength(3);
      expect(files[0]).toContain('a.json');
      expect(files[1]).toContain('b.json');
      expect(files[2]).toContain('c.json');
    });

    it('excludes non-JSON files', () => {
      const intentsDir = join(TEST_DIR, 'intents');
      mkdirSync(intentsDir, { recursive: true });
      writeFileSync(join(intentsDir, 'intent.json'), '{}');
      writeFileSync(join(intentsDir, 'readme.txt'), 'text');

      const files = listIntentFiles(intentsDir);

      expect(files).toHaveLength(1);
    });

    it('returns empty for non-existent directory', () => {
      const files = listIntentFiles(join(TEST_DIR, 'missing'));

      expect(files).toHaveLength(0);
    });

    it('returns frozen array', () => {
      const intentsDir = join(TEST_DIR, 'intents');
      mkdirSync(intentsDir, { recursive: true });
      writeFileSync(join(intentsDir, 'a.json'), '{}');

      const files = listIntentFiles(intentsDir);

      expect(Object.isFrozen(files)).toBe(true);
    });
  });

  describe('readIntentFile', () => {
    it('reads intent file', () => {
      const intentsDir = join(TEST_DIR, 'intents');
      mkdirSync(intentsDir, { recursive: true });
      writeFileSync(join(intentsDir, 'test.json'), '{"test": true}');

      const content = readIntentFile(join(intentsDir, 'test.json'));

      expect(content).toBe('{"test": true}');
    });

    it('throws for missing file', () => {
      expect(() => readIntentFile(join(TEST_DIR, 'missing.json'))).toThrow();
    });
  });
});
