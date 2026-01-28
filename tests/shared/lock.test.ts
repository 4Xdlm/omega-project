/**
 * OMEGA File Lock Tests
 * Phase C - NASA-Grade L4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { acquireLock, withLock, LockError } from '../../src/shared/lock.js';
import { writeFile, unlink, access, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileLock', () => {
  const testDir = join(tmpdir(), `omega-lock-test-${process.pid}-${Date.now()}`);
  const testFile = join(testDir, 'test.txt');

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    try {
      await unlink(testFile);
    } catch {}
    try {
      await unlink(testFile + '.lock');
    } catch {}
    await writeFile(testFile, 'test');
  });

  afterEach(async () => {
    try {
      await unlink(testFile);
    } catch {}
    try {
      await unlink(testFile + '.lock');
    } catch {}
  });

  describe('acquireLock', () => {
    it('creates lock file', async () => {
      const lock = await acquireLock(testFile);
      await access(testFile + '.lock'); // exists
      await lock.release();
    });

    it('removes lock file on release', async () => {
      const lock = await acquireLock(testFile);
      await lock.release();
      await expect(access(testFile + '.lock')).rejects.toThrow();
    });

    it('writes PID to lock file', async () => {
      const lock = await acquireLock(testFile);
      const { readFile } = await import('fs/promises');
      const content = await readFile(testFile + '.lock', 'utf-8');
      expect(content.trim()).toBe(String(process.pid));
      await lock.release();
    });
  });

  describe('withLock', () => {
    it('executes function and releases lock', async () => {
      const result = await withLock(testFile, async () => 42);
      expect(result).toBe(42);
      await expect(access(testFile + '.lock')).rejects.toThrow();
    });

    it('releases lock on success', async () => {
      await withLock(testFile, async () => 'success');
      await expect(access(testFile + '.lock')).rejects.toThrow();
    });

    it('releases lock on error', async () => {
      await expect(
        withLock(testFile, async () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');
      await expect(access(testFile + '.lock')).rejects.toThrow();
    });

    it('returns function result', async () => {
      const result = await withLock(testFile, async () => ({ data: 'value' }));
      expect(result).toEqual({ data: 'value' });
    });
  });

  describe('Lock contention', () => {
    it('second lock waits for first', async () => {
      const lock1 = await acquireLock(testFile);
      const start = Date.now();

      // Release after 100ms
      setTimeout(() => lock1.release(), 100);

      const lock2 = await acquireLock(testFile);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
      await lock2.release();
    });
  });

  describe('LockError', () => {
    it('has correct properties', () => {
      const err = new LockError('/path/to/file', 'ALREADY_LOCKED');
      expect(err.filepath).toBe('/path/to/file');
      expect(err.reason).toBe('ALREADY_LOCKED');
      expect(err.name).toBe('LockError');
    });

    it('includes cause if provided', () => {
      const cause = new Error('original');
      const err = new LockError('/path', 'LOCK_FAILED', cause);
      expect(err.cause).toBe(cause);
    });
  });
});
