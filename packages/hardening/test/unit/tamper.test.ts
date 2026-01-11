/**
 * @fileoverview Tests for tamper detection utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  verifyHash,
  computeHash,
  verifyObjectHash,
  computeObjectHash,
  verifyManifest,
  generateManifest,
  checkTamper,
  protectObject,
  verifyProtectedObject,
  seal,
  unseal,
} from '../../src/index.js';

describe('verifyHash', () => {
  it('should verify matching hash', () => {
    const content = 'hello world';
    const hash = computeHash(content);
    const result = verifyHash(content, hash);
    expect(result.valid).toBe(true);
    expect(result.expected).toBe(hash);
    expect(result.actual).toBe(hash);
  });

  it('should detect mismatched hash', () => {
    const result = verifyHash('hello', 'a'.repeat(64));
    expect(result.valid).toBe(false);
    expect(result.expected).toBe('a'.repeat(64));
  });

  it('should use SHA-256', () => {
    const result = verifyHash('test', computeHash('test'));
    expect(result.algorithm).toBe('sha256');
  });
});

describe('computeHash', () => {
  it('should compute deterministic hash', () => {
    const hash1 = computeHash('hello');
    const hash2 = computeHash('hello');
    expect(hash1).toBe(hash2);
  });

  it('should produce 64 character hash', () => {
    const hash = computeHash('test');
    expect(hash.length).toBe(64);
  });

  it('should produce different hashes for different content', () => {
    const hash1 = computeHash('hello');
    const hash2 = computeHash('world');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyObjectHash', () => {
  it('should verify object hash', () => {
    const obj = { key: 'value' };
    const hash = computeObjectHash(obj);
    const result = verifyObjectHash(obj, hash);
    expect(result.valid).toBe(true);
  });

  it('should detect modified object', () => {
    const obj1 = { key: 'value' };
    const hash = computeObjectHash(obj1);
    const obj2 = { key: 'modified' };
    const result = verifyObjectHash(obj2, hash);
    expect(result.valid).toBe(false);
  });
});

describe('computeObjectHash', () => {
  it('should compute deterministic hash', () => {
    const obj = { key: 'value' };
    const hash1 = computeObjectHash(obj);
    const hash2 = computeObjectHash(obj);
    expect(hash1).toBe(hash2);
  });

  it('should produce same hash regardless of key order', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };
    expect(computeObjectHash(obj1)).toBe(computeObjectHash(obj2));
  });
});

describe('verifyManifest', () => {
  it('should verify all files', () => {
    const contents = {
      'file1.txt': 'content1',
      'file2.txt': 'content2',
    };
    const manifest = generateManifest(contents);
    const results = verifyManifest(manifest, contents);

    expect(results.length).toBe(2);
    expect(results.every((r) => r.valid)).toBe(true);
  });

  it('should detect missing file', () => {
    const manifest = { 'file.txt': 'a'.repeat(64) };
    const contents = {};
    const results = verifyManifest(manifest, contents);

    expect(results[0].valid).toBe(false);
    expect(results[0].error).toBe('File not found');
  });

  it('should detect modified file', () => {
    const contents = { 'file.txt': 'original' };
    const manifest = generateManifest(contents);
    const modifiedContents = { 'file.txt': 'modified' };
    const results = verifyManifest(manifest, modifiedContents);

    expect(results[0].valid).toBe(false);
    expect(results[0].error).toBe('Hash mismatch');
  });
});

describe('generateManifest', () => {
  it('should generate hashes for all files', () => {
    const contents = {
      'file1.txt': 'content1',
      'file2.txt': 'content2',
    };
    const manifest = generateManifest(contents);

    expect(Object.keys(manifest).length).toBe(2);
    expect(manifest['file1.txt'].length).toBe(64);
    expect(manifest['file2.txt'].length).toBe(64);
  });

  it('should produce correct hashes', () => {
    const contents = { 'file.txt': 'content' };
    const manifest = generateManifest(contents);
    const expected = computeHash('content');
    expect(manifest['file.txt']).toBe(expected);
  });
});

describe('checkTamper', () => {
  it('should pass for untampered object', () => {
    const obj = { key: 'value' };
    const hash = computeObjectHash(obj);
    const result = checkTamper(obj, hash);
    expect(result.tampered).toBe(false);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it('should detect tampered content', () => {
    const obj = { key: 'modified' };
    const hash = computeObjectHash({ key: 'original' });
    const result = checkTamper(obj, hash);
    expect(result.tampered).toBe(true);
    expect(result.checks.find((c) => c.name === 'hash_match')?.passed).toBe(false);
  });

  it('should detect non-object', () => {
    const result = checkTamper('not object', 'hash');
    expect(result.tampered).toBe(true);
    expect(result.checks.find((c) => c.name === 'object_type')?.passed).toBe(false);
  });

  it('should detect __proto__ key', () => {
    // Create object with actual __proto__ as enumerable key
    const obj: Record<string, unknown> = {};
    Object.defineProperty(obj, '__proto__', {
      value: {},
      enumerable: true,
      configurable: true,
    });
    const hash = computeObjectHash(obj);
    const result = checkTamper(obj, hash);
    expect(result.checks.find((c) => c.name === 'no_proto_key')?.passed).toBe(false);
  });
});

describe('protectObject', () => {
  it('should add hash and timestamp', () => {
    const obj = { key: 'value' };
    const protected_ = protectObject(obj);
    expect(protected_.__hash).toBeDefined();
    expect(protected_.__hash.length).toBe(64);
    expect(protected_.__timestamp).toBeDefined();
  });

  it('should freeze the result', () => {
    const obj = { key: 'value' };
    const protected_ = protectObject(obj);
    expect(Object.isFrozen(protected_)).toBe(true);
  });

  it('should preserve original properties', () => {
    const obj = { key: 'value', num: 42 };
    const protected_ = protectObject(obj);
    expect(protected_.key).toBe('value');
    expect(protected_.num).toBe(42);
  });

  it('should use provided timestamp', () => {
    const timestamp = '2026-01-01T00:00:00.000Z';
    const protected_ = protectObject({ key: 'value' }, timestamp);
    expect(protected_.__timestamp).toBe(timestamp);
  });
});

describe('verifyProtectedObject', () => {
  it('should verify valid protected object', () => {
    const obj = { key: 'value' };
    const protected_ = protectObject(obj);
    const result = verifyProtectedObject(protected_);
    expect(result.tampered).toBe(false);
  });

  it('should detect missing hash', () => {
    const obj = { key: 'value', __timestamp: '2026-01-01' };
    const result = verifyProtectedObject(obj);
    expect(result.tampered).toBe(true);
    expect(result.checks.find((c) => c.name === 'has_hash')?.passed).toBe(false);
  });

  it('should detect tampered content', () => {
    const original = { key: 'original' };
    const protected_ = protectObject(original);
    const tampered = { ...protected_, key: 'modified' };
    const result = verifyProtectedObject(tampered);
    expect(result.tampered).toBe(true);
    expect(result.checks.find((c) => c.name === 'hash_match')?.passed).toBe(false);
  });

  it('should detect non-object', () => {
    const result = verifyProtectedObject('not object');
    expect(result.tampered).toBe(true);
  });
});

describe('seal', () => {
  it('should create sealed data', () => {
    const payload = { key: 'value' };
    const sealed = seal(payload);
    expect(sealed.version).toBe('1.0.0');
    expect(sealed.algorithm).toBe('sha256');
    expect(sealed.hash.length).toBe(64);
    expect(sealed.sealedAt).toBeDefined();
    expect(sealed.payload).toBeDefined();
  });

  it('should be frozen', () => {
    const sealed = seal({ key: 'value' });
    expect(Object.isFrozen(sealed)).toBe(true);
  });

  it('should produce stable payload', () => {
    const payload = { b: 2, a: 1 };
    const sealed = seal(payload);
    const parsed = JSON.parse(sealed.payload);
    expect(parsed).toEqual(payload);
  });
});

describe('unseal', () => {
  it('should unseal valid sealed data', () => {
    const payload = { key: 'value' };
    const sealed = seal(payload);
    const result = unseal(sealed);
    expect(result.valid).toBe(true);
    expect(result.payload).toEqual(payload);
  });

  it('should detect tampered payload', () => {
    const sealed = seal({ key: 'value' });
    const tampered = { ...sealed, payload: '{"key":"modified"}' };
    const result = unseal(tampered);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Hash verification failed');
  });

  it('should detect invalid version', () => {
    const sealed = seal({ key: 'value' });
    const invalid = { ...sealed, version: '2.0.0' as const };
    const result = unseal(invalid);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('version');
  });

  it('should detect invalid algorithm', () => {
    const sealed = seal({ key: 'value' });
    const invalid = { ...sealed, algorithm: 'md5' as any };
    const result = unseal(invalid);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('algorithm');
  });

  it('should handle parse errors', () => {
    const sealed = seal({ key: 'value' });
    const invalid = { ...sealed, payload: 'not json', hash: computeHash('not json') };
    const result = unseal(invalid);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('parse error');
  });
});
