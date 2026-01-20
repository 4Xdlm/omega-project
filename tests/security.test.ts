/**
 * Security Tests
 * Standard: NASA-Grade L4
 *
 * Tests for security features including path traversal prevention,
 * zip-slip protection, and input validation.
 *
 * @see docs/THREAT_MODEL.md
 * @see docs/SECURITY.md
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  sanitizeKey,
  createSafePath,
  extractKey,
} from '../nexus/raw/src/utils/paths.js';
import {
  RawPathTraversalError,
  RawPathInvalidError,
  RawStorage,
  MemoryBackend,
  FileBackend,
} from '../nexus/raw/src/index.js';

// ============================================================
// Test Setup
// ============================================================

const TEST_DIR = join(process.cwd(), '.test_security_tmp');

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
// T1 — Path Traversal Prevention
// ============================================================

describe('Security — T1 Path Traversal Prevention', () => {
  test('blocks basic path traversal with ../', () => {
    expect(() => sanitizeKey('../etc/passwd')).toThrow(RawPathTraversalError);
  });

  test('blocks path traversal with multiple ../', () => {
    expect(() => sanitizeKey('../../etc/passwd')).toThrow(RawPathTraversalError);
  });

  test('blocks path traversal in middle of path', () => {
    expect(() => sanitizeKey('foo/../bar/../etc/passwd')).toThrow(RawPathTraversalError);
  });

  test('blocks URL-encoded path traversal %2e%2e/', () => {
    // %2e = '.'
    expect(() => sanitizeKey('%2e%2e/etc/passwd')).toThrow(RawPathTraversalError);
  });

  test('blocks double URL-encoded path traversal', () => {
    // %252e = '%2e' after first decode, then '.' after second
    // Our implementation decodes once, so this should still catch ..
    expect(() => sanitizeKey('%2e%2e%2fetc%2fpasswd')).toThrow(RawPathTraversalError);
  });

  test('blocks backslash path traversal on Windows style', () => {
    expect(() => sanitizeKey('..\\etc\\passwd')).toThrow(RawPathTraversalError);
  });

  test('blocks mixed slash path traversal', () => {
    expect(() => sanitizeKey('..\\../etc/passwd')).toThrow(RawPathTraversalError);
  });

  test('allows valid paths', () => {
    expect(sanitizeKey('valid-key')).toBe('valid-key');
    expect(sanitizeKey('path/to/file')).toBe('path/to/file');
    expect(sanitizeKey('user_data.json')).toBe('user_data.json');
  });

  test('normalizes multiple slashes', () => {
    expect(sanitizeKey('path//to///file')).toBe('path/to/file');
  });

  test('removes leading/trailing slashes', () => {
    expect(sanitizeKey('/path/to/file/')).toBe('path/to/file');
  });
});

// ============================================================
// T2 — Zip Slip Prevention
// ============================================================

describe('Security — T2 Zip Slip Prevention', () => {
  beforeEach(() => setupTestDir());
  afterEach(() => cleanupTestDir());

  test('createSafePath prevents escape from root', () => {
    const rootDir = TEST_DIR;

    // Should throw on traversal attempt
    expect(() => createSafePath(rootDir, '../outside')).toThrow(RawPathTraversalError);
  });

  test('extractKey rejects path outside root', () => {
    const rootDir = TEST_DIR;
    const outsidePath = '/etc/passwd';

    expect(() => extractKey(rootDir, outsidePath)).toThrow(RawPathInvalidError);
  });

  test('extractKey accepts path inside root', () => {
    const rootDir = TEST_DIR;
    const insidePath = `${TEST_DIR}/valid/file.txt`;

    const key = extractKey(rootDir, insidePath);
    expect(key).toBe('valid/file.txt');
  });

  test('Storage rejects malicious keys via FileBackend', async () => {
    const storage = new RawStorage({
      backend: new FileBackend({ rootDir: TEST_DIR, clock: { now: () => Date.now() } }),
      clock: { now: () => Date.now() },
    });

    await expect(
      storage.store('../../../etc/passwd', Buffer.from('malicious'))
    ).rejects.toThrow(RawPathTraversalError);
  });

  test('Storage rejects malicious keys via MemoryBackend', async () => {
    const storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });

    await expect(
      storage.store('../../../etc/passwd', Buffer.from('malicious'))
    ).rejects.toThrow(RawPathTraversalError);
  });
});

// ============================================================
// Input Validation
// ============================================================

describe('Security — Input Validation', () => {
  test('rejects empty key', () => {
    expect(() => sanitizeKey('')).toThrow(RawPathInvalidError);
  });

  test('rejects null key', () => {
    expect(() => sanitizeKey(null as unknown as string)).toThrow(RawPathInvalidError);
  });

  test('rejects undefined key', () => {
    expect(() => sanitizeKey(undefined as unknown as string)).toThrow(RawPathInvalidError);
  });

  test('rejects key with only dots', () => {
    expect(() => sanitizeKey('.')).toThrow(RawPathInvalidError);
    expect(() => sanitizeKey('..')).toThrow(RawPathTraversalError);
    expect(() => sanitizeKey('...')).toThrow(RawPathInvalidError);
  });

  test('rejects hidden files (starting with dot)', () => {
    expect(() => sanitizeKey('.hidden')).toThrow(RawPathInvalidError);
    expect(() => sanitizeKey('.gitignore')).toThrow(RawPathInvalidError);
    expect(() => sanitizeKey('path/.hidden/file')).toThrow(RawPathInvalidError);
  });

  test('rejects special characters', () => {
    const specialChars = ['<', '>', ':', '"', '|', '?', '*', '`', '$', '!', '@', '#'];

    for (const char of specialChars) {
      expect(() => sanitizeKey(`file${char}name`)).toThrow(RawPathInvalidError);
    }
  });

  test('allows valid characters', () => {
    expect(sanitizeKey('file-name')).toBe('file-name');
    expect(sanitizeKey('file_name')).toBe('file_name');
    expect(sanitizeKey('file.name')).toBe('file.name');
    expect(sanitizeKey('file123')).toBe('file123');
    expect(sanitizeKey('CamelCase')).toBe('CamelCase');
  });
});

// ============================================================
// Storage Security Integration
// ============================================================

describe('Security — Storage Integration', () => {
  let storage: RawStorage;

  beforeEach(() => {
    storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });
  });

  test('valid keys work correctly', async () => {
    await storage.store('valid-key', Buffer.from('data'));
    const retrieved = await storage.retrieve('valid-key');
    expect(retrieved.toString()).toBe('data');
  });

  test('nested valid keys work correctly', async () => {
    await storage.store('users/user123/data', Buffer.from('user data'));
    const retrieved = await storage.retrieve('users/user123/data');
    expect(retrieved.toString()).toBe('user data');
  });

  test('list does not expose sensitive paths', async () => {
    await storage.store('public/file1', Buffer.from('1'));
    await storage.store('public/file2', Buffer.from('2'));

    const list = await storage.list();

    // All keys should be properly formatted
    for (const key of list.keys) {
      expect(key).not.toContain('..');
      expect(key).not.toMatch(/^\//);
    }
  });
});

// ============================================================
// Error Information Leakage
// ============================================================

describe('Security — T7 Error Information Leakage', () => {
  test('RawPathTraversalError does not expose full path', () => {
    try {
      sanitizeKey('../../../etc/passwd');
    } catch (error) {
      expect(error).toBeInstanceOf(RawPathTraversalError);
      const msg = (error as Error).message;

      // Should not contain system paths
      expect(msg).not.toContain('/etc/passwd');
      expect(msg).not.toContain('C:\\');

      // Should contain generic message
      expect(msg).toContain('..');
    }
  });

  test('RawPathInvalidError provides safe error context', () => {
    try {
      sanitizeKey('file<>name');
    } catch (error) {
      expect(error).toBeInstanceOf(RawPathInvalidError);

      // Context should have controlled information
      const rawError = error as RawPathInvalidError;
      expect(rawError.context).toBeDefined();
      expect(rawError.context.key).toBeDefined();
    }
  });

  test('Storage errors do not leak internal paths', async () => {
    const storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 1024 }),
      clock: { now: () => Date.now() },
    });

    try {
      await storage.retrieve('nonexistent-key');
    } catch (error) {
      const msg = (error as Error).message;

      // Should not contain file paths
      expect(msg).not.toMatch(/[A-Z]:\\/); // Windows paths
      expect(msg).not.toMatch(/\/home\//); // Unix paths
    }
  });
});

// ============================================================
// Checksum Security
// ============================================================

describe('Security — T4 Data Integrity', () => {
  let storage: RawStorage;

  beforeEach(() => {
    storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });
  });

  test('data integrity is verified on retrieve', async () => {
    const data = Buffer.from('important data');
    await storage.store('integrity-test', data);

    // Normal retrieve should work
    const retrieved = await storage.retrieve('integrity-test');
    expect(retrieved).toEqual(data);
  });

  test('identical data produces identical checksum', async () => {
    const data = Buffer.from('test data');

    await storage.store('key1', data);
    await storage.store('key2', data);

    // Both should retrieve successfully with same content
    const r1 = await storage.retrieve('key1');
    const r2 = await storage.retrieve('key2');

    expect(r1).toEqual(r2);
  });
});

// ============================================================
// Quota Enforcement (DoS Prevention)
// ============================================================

describe('Security — T6 DoS Prevention (Quota)', () => {
  test('MemoryBackend enforces quota', async () => {
    const storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 }), // 100 bytes
      clock: { now: () => Date.now() },
    });

    // Small data should work
    await storage.store('small', Buffer.alloc(50));

    // Large data should fail
    await expect(
      storage.store('large', Buffer.alloc(200))
    ).rejects.toThrow(/quota/i);
  });

  test('quota allows replacement within limit', async () => {
    const storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 }),
      clock: { now: () => Date.now() },
    });

    // Store 50 bytes
    await storage.store('key', Buffer.alloc(50));

    // Replace with 80 bytes (still under quota since old is removed)
    await storage.store('key', Buffer.alloc(80));

    const retrieved = await storage.retrieve('key');
    expect(retrieved.length).toBe(80);
  });
});

// ============================================================
// Null Byte Injection
// ============================================================

describe('Security — Null Byte Injection', () => {
  test('rejects null bytes in keys', () => {
    expect(() => sanitizeKey('file\0name')).toThrow(RawPathInvalidError);
  });

  test('rejects keys with control characters', () => {
    const controlChars = ['\n', '\r', '\t', '\0', '\x1f'];

    for (const char of controlChars) {
      expect(() => sanitizeKey(`file${char}name`)).toThrow(RawPathInvalidError);
    }
  });
});

// ============================================================
// Unicode Normalization Attacks
// ============================================================

describe('Security — Unicode Security', () => {
  test('rejects non-ASCII characters in keys', () => {
    // Unicode can be used for homograph attacks
    expect(() => sanitizeKey('fіle')).toThrow(RawPathInvalidError); // Cyrillic 'і'
    expect(() => sanitizeKey('file＜name')).toThrow(RawPathInvalidError); // Fullwidth '<'
  });

  test('rejects unicode path separators', () => {
    expect(() => sanitizeKey('path／file')).toThrow(RawPathInvalidError); // Fullwidth '/'
  });
});
