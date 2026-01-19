/**
 * Snapshot Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  createSnapshot,
  restoreSnapshot,
  verifySnapshot,
  compareSnapshots,
  resetIdCounter,
  seededIdGenerator,
} from '../src/snapshot.js';
import { mockClock } from '../src/types.js';
import { ProofSnapshotCreateError } from '../src/errors.js';

describe('Snapshot', () => {
  const testDir = join(tmpdir(), 'proof-utils-snapshot-' + Date.now());
  const testFile1 = join(testDir, 'file1.txt');
  const testFile2 = join(testDir, 'file2.txt');

  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testFile1, 'content one');
    writeFileSync(testFile2, 'content two');
  });

  afterAll(() => {
    try {
      if (existsSync(testFile1)) unlinkSync(testFile1);
      if (existsSync(testFile2)) unlinkSync(testFile2);
      if (existsSync(testDir)) rmdirSync(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    resetIdCounter();
    // Restore files
    writeFileSync(testFile1, 'content one');
    writeFileSync(testFile2, 'content two');
  });

  describe('createSnapshot', () => {
    it('creates snapshot of files', () => {
      const clock = mockClock(1000);
      const snapshot = createSnapshot([testFile1], {}, clock);

      expect(snapshot.id).toBe('snap-1');
      expect(snapshot.name).toBe('unnamed');
      expect(snapshot.entries.length).toBe(1);
      expect(snapshot.timestamp).toBe(1000);
    });

    it('includes file content as base64', () => {
      const snapshot = createSnapshot([testFile1]);

      const entry = snapshot.entries[0]!;
      const decoded = Buffer.from(entry.content, 'base64').toString();
      expect(decoded).toBe('content one');
    });

    it('calculates correct hash', () => {
      const snapshot = createSnapshot([testFile1]);

      expect(snapshot.entries[0]!.sha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it('uses custom name and metadata', () => {
      const snapshot = createSnapshot([testFile1], {
        name: 'my-snapshot',
        metadata: { phase: 'testing' },
      });

      expect(snapshot.name).toBe('my-snapshot');
      expect(snapshot.metadata).toEqual({ phase: 'testing' });
    });

    it('uses custom id generator', () => {
      const idGen = seededIdGenerator(100);
      const snapshot = createSnapshot([testFile1], { idGenerator: idGen });

      expect(snapshot.id).toBe('snap-101');
    });

    it('throws for non-existent file', () => {
      expect(() => createSnapshot(['/nonexistent/file.txt'])).toThrow(
        ProofSnapshotCreateError
      );
    });

    it('freezes snapshot', () => {
      const snapshot = createSnapshot([testFile1]);

      expect(() => {
        (snapshot as { name: string }).name = 'modified';
      }).toThrow();
    });
  });

  describe('restoreSnapshot', () => {
    it('restores file content', () => {
      const snapshot = createSnapshot([testFile1]);

      // Modify file
      writeFileSync(testFile1, 'modified content');

      const result = restoreSnapshot(snapshot);

      expect(result.success).toBe(true);
      expect(readFileSync(testFile1, 'utf-8')).toBe('content one');
    });

    it('creates parent directories', () => {
      const snapshot = createSnapshot([testFile1]);
      const newPath = join(testDir, 'subdir', 'restored.txt');

      // Modify snapshot entry to use new path
      const modifiedSnapshot = {
        ...snapshot,
        entries: [{ ...snapshot.entries[0]!, path: newPath }],
      };

      const result = restoreSnapshot(modifiedSnapshot);

      expect(result.success).toBe(true);
      expect(existsSync(newPath)).toBe(true);
      expect(readFileSync(newPath, 'utf-8')).toBe('content one');

      // Cleanup
      unlinkSync(newPath);
    });

    it('respects overwrite option', () => {
      const snapshot = createSnapshot([testFile1]);
      writeFileSync(testFile1, 'modified');

      const result = restoreSnapshot(snapshot, { overwrite: false });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(`File exists and overwrite disabled: ${testFile1}`);
    });

    it('returns restored files list', () => {
      const snapshot = createSnapshot([testFile1, testFile2]);

      const result = restoreSnapshot(snapshot);

      expect(result.restoredFiles).toContain(testFile1);
      expect(result.restoredFiles).toContain(testFile2);
    });
  });

  describe('verifySnapshot', () => {
    it('verifies intact files', () => {
      const snapshot = createSnapshot([testFile1]);

      const result = verifySnapshot(snapshot);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('detects modified file', () => {
      const snapshot = createSnapshot([testFile1]);
      writeFileSync(testFile1, 'modified');

      const result = verifySnapshot(snapshot);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Hash mismatch'))).toBe(true);
    });

    it('detects missing file', () => {
      const snapshot = createSnapshot([testFile1]);
      unlinkSync(testFile1);

      const result = verifySnapshot(snapshot);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('not found'))).toBe(true);
    });
  });

  describe('compareSnapshots', () => {
    it('detects unchanged files', () => {
      const before = createSnapshot([testFile1]);
      const after = createSnapshot([testFile1]);

      const diff = compareSnapshots(before, after);

      expect(diff.unchanged).toContain(testFile1);
      expect(diff.added).toEqual([]);
      expect(diff.removed).toEqual([]);
      expect(diff.modified).toEqual([]);
    });

    it('detects added files', () => {
      const before = createSnapshot([testFile1]);
      const after = createSnapshot([testFile1, testFile2]);

      const diff = compareSnapshots(before, after);

      expect(diff.added).toContain(testFile2);
    });

    it('detects removed files', () => {
      const before = createSnapshot([testFile1, testFile2]);
      const after = createSnapshot([testFile1]);

      const diff = compareSnapshots(before, after);

      expect(diff.removed).toContain(testFile2);
    });

    it('detects modified files', () => {
      const before = createSnapshot([testFile1]);
      writeFileSync(testFile1, 'modified content');
      const after = createSnapshot([testFile1]);

      const diff = compareSnapshots(before, after);

      expect(diff.modified).toContain(testFile1);
    });
  });
});
