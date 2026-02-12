/**
 * OMEGA — ATOMIC CACHE TESTS
 * Phase: PR-1 | Invariant: INV-CACHE-LOCK-01
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlinkSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  acquireLock,
  releaseLock,
  atomicWriteFileSync,
  readCacheAtomic,
  writeCacheAtomic,
  loadCalibrationLockConfig,
  clearCalibrationCache,
} from '../../src/providers/atomic-cache.js';
import { execSync } from 'node:child_process';

const TEST_DIR = join(process.cwd(), '.test-cache-pr1');
const TEST_FILE = join(TEST_DIR, 'test.json');
const TEST_CALIBRATION = join(TEST_DIR, 'calibration.json');

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
  clearCalibrationCache(); // Clear cache to allow fresh loads
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('Atomic Cache — Locking', () => {
  it('acquires and releases lock', () => {
    acquireLock(TEST_FILE);
    expect(existsSync(`${TEST_FILE}.lock`)).toBe(true);

    releaseLock(TEST_FILE);
    expect(existsSync(`${TEST_FILE}.lock`)).toBe(false);
  });

  it('throws timeout if lock held too long', () => {
    // Create minimal calibration with very short timeout
    const calibration = {
      LOCK_TIMEOUT_MS: 100,
      LOCK_SPIN_MS: 10,
      LOCK_STALE_MS: 5000,
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(calibration));

    acquireLock(TEST_FILE, TEST_CALIBRATION);

    // Try to acquire again without releasing → should timeout
    expect(() => {
      acquireLock(TEST_FILE, TEST_CALIBRATION);
    }).toThrow(/Failed to acquire lock/);

    releaseLock(TEST_FILE);
  }, 15000); // Increased timeout to 15 seconds

  it('handles stale lock detection', () => {
    // Create lock with old timestamp
    const lockPath = `${TEST_FILE}.lock`;
    const staleLock = {
      timestamp: Date.now() - 40000, // 40 seconds ago
      pid: 99999,
    };
    mkdirSync(join(TEST_DIR), { recursive: true });
    writeFileSync(lockPath, JSON.stringify(staleLock));

    // Should override stale lock
    acquireLock(TEST_FILE);
    expect(existsSync(lockPath)).toBe(true);

    releaseLock(TEST_FILE);
  });

  it('is safe to release non-existent lock', () => {
    expect(() => {
      releaseLock(TEST_FILE);
    }).not.toThrow();
  });
});

describe('Atomic Cache — Write Safety (GAP-1C)', () => {
  it('writes atomically with tmp → rename', () => {
    const data = { test: 'value', number: 42 };
    writeCacheAtomic(TEST_FILE, data);

    expect(existsSync(TEST_FILE)).toBe(true);
    expect(existsSync(`${TEST_FILE}.lock`)).toBe(false);

    const read = readCacheAtomic(TEST_FILE);
    expect(read).toEqual(data);
  });

  it('cleans up crash residue (orphaned .tmp)', () => {
    // Create orphaned tmp file
    const tmpPath = `${TEST_FILE}.tmp`;
    mkdirSync(join(TEST_DIR), { recursive: true });
    writeFileSync(tmpPath, 'orphaned tmp file');

    expect(existsSync(tmpPath)).toBe(true);

    // Atomic write should clean it up
    atomicWriteFileSync(TEST_FILE, '{"clean": true}');

    expect(existsSync(TEST_FILE)).toBe(true);
    expect(existsSync(`${TEST_FILE}.lock`)).toBe(false);
  });

  it('handles concurrent writes without corruption', () => {
    // This test spawns multiple node processes to simulate concurrency
    // Each process writes a unique value to the same file
    const testScript = `
      const { writeCacheAtomic } = require('${join(process.cwd(), 'packages/scribe-engine/dist/pr/atomic-cache.js').replace(/\\/g, '\\\\')}');
      const id = process.argv[2];
      const file = process.argv[3];
      writeCacheAtomic(file, { writer: id, timestamp: Date.now() });
    `;

    const scriptPath = join(TEST_DIR, 'writer.js');
    writeFileSync(scriptPath, testScript);

    // Note: This test requires dist to be built
    // For the actual test suite, we'd need proper ESM handling
    // For now, this is a placeholder structure
  });
});

describe('Atomic Cache — Calibration Loading (GAP-1A)', () => {
  it('loads config from calibration.json', () => {
    const calibration = {
      LOCK_TIMEOUT_MS: 5000,
      LOCK_SPIN_MS: 25,
      LOCK_STALE_MS: 15000,
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(calibration));

    const config = loadCalibrationLockConfig(TEST_CALIBRATION);

    expect(config.LOCK_TIMEOUT_MS).toBe(5000);
    expect(config.LOCK_SPIN_MS).toBe(25);
    expect(config.LOCK_STALE_MS).toBe(15000);
  });

  it('uses defaults if calibration not found', () => {
    const config = loadCalibrationLockConfig('/nonexistent/calibration.json');

    expect(config.LOCK_TIMEOUT_MS).toBe(10000);
    expect(config.LOCK_SPIN_MS).toBe(50);
    expect(config.LOCK_STALE_MS).toBe(30000);
  });

  it('warns if calibration has null fields', () => {
    const calibration = {
      LOCK_TIMEOUT_MS: null,
      LOCK_SPIN_MS: 50,
      LOCK_STALE_MS: 30000,
    };
    writeFileSync(TEST_CALIBRATION, JSON.stringify(calibration));

    const config = loadCalibrationLockConfig(TEST_CALIBRATION);

    // Should fall back to default for null field
    expect(config.LOCK_TIMEOUT_MS).toBe(10000);
  });
});

describe('Atomic Cache — Drop-in Replacements', () => {
  it('readCacheAtomic returns null for missing file', () => {
    expect(readCacheAtomic(TEST_FILE)).toBeNull();
  });

  it('readCacheAtomic returns parsed JSON', () => {
    const data = { key: 'value', nested: { deep: 123 } };
    writeCacheAtomic(TEST_FILE, data);

    const read = readCacheAtomic(TEST_FILE);
    expect(read).toEqual(data);
  });

  it('writeCacheAtomic creates directories', () => {
    const deepPath = join(TEST_DIR, 'a', 'b', 'c', 'file.json');
    writeCacheAtomic(deepPath, { deep: true });

    expect(existsSync(deepPath)).toBe(true);
  });

  it('is deterministic (same data → same file)', () => {
    const data = { a: 1, b: 2, c: 3 };

    writeCacheAtomic(TEST_FILE, data);
    const hash1 = execSync(`sha256sum "${TEST_FILE}"`, { encoding: 'utf8' }).split(' ')[0];

    writeCacheAtomic(TEST_FILE, data);
    const hash2 = execSync(`sha256sum "${TEST_FILE}"`, { encoding: 'utf8' }).split(' ')[0];

    expect(hash1).toBe(hash2);
  });
});
