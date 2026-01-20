/**
 * Edge Cases — Corruption Detection Tests
 * Standard: NASA-Grade L4
 *
 * Tests for detecting and handling data corruption.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { buildManifest, verifyManifest } from '../../nexus/proof-utils/src/index.js';
import { RawStorage, MemoryBackend, computeChecksum } from '../../nexus/raw/src/index.js';

// ============================================================
// Test Setup
// ============================================================

const TEST_DIR = join(process.cwd(), '.test_corruption_tmp');

function setupTestDir(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
}

function cleanupTestDir(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
}

// ============================================================
// Manifest Corruption Detection
// ============================================================

describe('Edge Cases — Manifest Corruption Detection', () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  test('detects modified file content', () => {
    const filePath = join(TEST_DIR, 'test-file.txt');

    // Create original file
    writeFileSync(filePath, 'original content');

    // Build manifest
    const manifest = buildManifest([filePath]);
    expect(manifest.entries).toHaveLength(1);

    // Verify original - should pass
    const result1 = verifyManifest(manifest);
    expect(result1.valid).toBe(true);
    expect(result1.errors).toHaveLength(0);

    // Tamper with file
    writeFileSync(filePath, 'modified content');

    // Verify tampered - should fail
    const result2 = verifyManifest(manifest);
    expect(result2.valid).toBe(false);
    expect(result2.tamperedFiles).toContain(filePath);
  });

  test('detects missing file', () => {
    const filePath = join(TEST_DIR, 'to-delete.txt');

    // Create file
    writeFileSync(filePath, 'content');

    // Build manifest
    const manifest = buildManifest([filePath]);

    // Delete file
    unlinkSync(filePath);

    // Verify - should fail
    const result = verifyManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not found'))).toBe(true);
  });

  test('detects single byte change', () => {
    const filePath = join(TEST_DIR, 'single-byte.txt');

    // Create file with known content
    writeFileSync(filePath, 'ABCDEFGHIJ');

    // Build manifest
    const manifest = buildManifest([filePath]);

    // Change single byte
    writeFileSync(filePath, 'ABCDEFGHIX'); // Changed J to X

    // Verify - should detect
    const result = verifyManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.tamperedFiles).toHaveLength(1);
  });

  test('detects appended data', () => {
    const filePath = join(TEST_DIR, 'append.txt');

    // Create file
    writeFileSync(filePath, 'original');

    // Build manifest
    const manifest = buildManifest([filePath]);

    // Append data
    writeFileSync(filePath, 'original extra');

    // Verify - should fail
    const result = verifyManifest(manifest);
    expect(result.valid).toBe(false);
  });

  test('detects truncated data', () => {
    const filePath = join(TEST_DIR, 'truncate.txt');

    // Create file
    writeFileSync(filePath, 'long content here');

    // Build manifest
    const manifest = buildManifest([filePath]);

    // Truncate
    writeFileSync(filePath, 'long');

    // Verify - should fail
    const result = verifyManifest(manifest);
    expect(result.valid).toBe(false);
  });

  test('handles multiple files with mixed results', () => {
    const file1 = join(TEST_DIR, 'file1.txt');
    const file2 = join(TEST_DIR, 'file2.txt');
    const file3 = join(TEST_DIR, 'file3.txt');

    // Create files
    writeFileSync(file1, 'content1');
    writeFileSync(file2, 'content2');
    writeFileSync(file3, 'content3');

    // Build manifest
    const manifest = buildManifest([file1, file2, file3]);

    // Tamper with one file
    writeFileSync(file2, 'tampered');

    // Verify
    const result = verifyManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.tamperedFiles).toHaveLength(1);
    expect(result.tamperedFiles).toContain(file2);
  });

  test('validates unchanged files correctly', () => {
    const files = Array.from({ length: 10 }, (_, i) => {
      const path = join(TEST_DIR, `file${i}.txt`);
      writeFileSync(path, `content for file ${i}`);
      return path;
    });

    // Build manifest
    const manifest = buildManifest(files);

    // Verify without changes
    const result = verifyManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.tamperedFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});

// ============================================================
// Raw Storage Checksum
// ============================================================

describe('Edge Cases — Raw Storage Checksum', () => {
  test('computeChecksum produces consistent results', () => {
    const data = Buffer.from('test data for checksum');

    const checksum1 = computeChecksum(data);
    const checksum2 = computeChecksum(data);

    expect(checksum1).toBe(checksum2);
    expect(typeof checksum1).toBe('string');
    expect(checksum1.length).toBeGreaterThan(0);
  });

  test('computeChecksum detects changes', () => {
    const data1 = Buffer.from('original data');
    const data2 = Buffer.from('modified data');

    const checksum1 = computeChecksum(data1);
    const checksum2 = computeChecksum(data2);

    expect(checksum1).not.toBe(checksum2);
  });

  test('computeChecksum detects single bit changes', () => {
    const data1 = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const data2 = Buffer.from([0x00, 0x01, 0x02, 0x04]); // Last byte changed

    const checksum1 = computeChecksum(data1);
    const checksum2 = computeChecksum(data2);

    expect(checksum1).not.toBe(checksum2);
  });

  test('computeChecksum handles empty buffer', () => {
    const empty = Buffer.alloc(0);
    const checksum = computeChecksum(empty);

    expect(checksum).toBeDefined();
    expect(checksum.length).toBeGreaterThan(0);
  });

  test('computeChecksum handles large buffers', () => {
    const large = Buffer.alloc(10 * 1024 * 1024, 'x'); // 10MB
    const checksum = computeChecksum(large);

    expect(checksum).toBeDefined();
    expect(checksum.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Data Integrity
// ============================================================

describe('Edge Cases — Data Integrity', () => {
  let storage: RawStorage;

  beforeEach(() => {
    storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });
  });

  test('stored data matches retrieved data', async () => {
    const original = Buffer.from('integrity test data');
    await storage.store('integrity-key', original);

    const retrieved = await storage.retrieve('integrity-key');

    expect(retrieved).toEqual(original);
  });

  test('binary data preserved exactly', async () => {
    // Create buffer with specific pattern
    const pattern = Buffer.from([
      0x00, 0xFF, 0x55, 0xAA, 0x12, 0x34, 0x56, 0x78,
      0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE,
    ]);

    await storage.store('binary-pattern', pattern);

    const retrieved = await storage.retrieve('binary-pattern');

    expect(Buffer.compare(retrieved, pattern)).toBe(0);
  });

  test('multiple overwrites preserve integrity', async () => {
    const key = 'overwrite-test';

    // Write multiple times
    for (let i = 0; i < 10; i++) {
      const data = Buffer.from(`version ${i}`);
      await storage.store(key, data);

      const retrieved = await storage.retrieve(key);
      expect(retrieved.toString()).toBe(`version ${i}`);
    }
  });

  test('concurrent reads return consistent data', async () => {
    const original = Buffer.from('concurrent read test');
    await storage.store('concurrent-key', original);

    // Multiple concurrent reads
    const reads = await Promise.all([
      storage.retrieve('concurrent-key'),
      storage.retrieve('concurrent-key'),
      storage.retrieve('concurrent-key'),
      storage.retrieve('concurrent-key'),
      storage.retrieve('concurrent-key'),
    ]);

    for (const data of reads) {
      expect(data).toEqual(original);
    }
  });
});

// ============================================================
// Error Recovery
// ============================================================

describe('Edge Cases — Error Recovery', () => {
  let storage: RawStorage;

  beforeEach(() => {
    storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });
  });

  test('retrieves data after failed write attempt', async () => {
    // Store initial data
    await storage.store('key', Buffer.from('original'));

    // Create storage with tiny quota
    const limitedStorage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 10 }),
      clock: { now: () => Date.now() },
    });

    // Store small data
    await limitedStorage.store('small', Buffer.from('hi'));

    // Try to store too large data - should fail
    await expect(
      limitedStorage.store('large', Buffer.from('this is too large'))
    ).rejects.toThrow();

    // Original data should still be retrievable
    const small = await limitedStorage.retrieve('small');
    expect(small.toString()).toBe('hi');
  });

  test('handles non-existent key gracefully', async () => {
    await expect(
      storage.retrieve('nonexistent')
    ).rejects.toThrow();
  });

  test('delete non-existent key returns gracefully', async () => {
    // Should not throw, just indicate deletion didn't happen
    const result = await storage.delete('nonexistent');
    expect(result).toBe(false);
  });
});
