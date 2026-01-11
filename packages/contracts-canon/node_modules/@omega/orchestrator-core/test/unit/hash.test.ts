/**
 * @fileoverview Unit tests for hash utilities.
 */

import { describe, it, expect } from 'vitest';
import { sha256, sha256Buffer, verifySha256 } from '../../src/util/hash.js';

describe('sha256', () => {
  it('should hash empty string correctly', () => {
    // Known SHA-256 of empty string
    const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(sha256('')).toBe(expected);
  });

  it('should hash "hello" correctly', () => {
    // Known SHA-256 of "hello"
    const expected = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
    expect(sha256('hello')).toBe(expected);
  });

  it('should hash "Hello, World!" correctly', () => {
    const expected = 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f';
    expect(sha256('Hello, World!')).toBe(expected);
  });

  it('should return lowercase hex', () => {
    const result = sha256('test');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should be deterministic', () => {
    const input = 'deterministic input';
    const hash1 = sha256(input);
    const hash2 = sha256(input);
    const hash3 = sha256(input);
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = sha256('input1');
    const hash2 = sha256('input2');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle unicode correctly', () => {
    const hash = sha256('こんにちは');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should handle long strings', () => {
    const longString = 'a'.repeat(10000);
    const hash = sha256(longString);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('sha256Buffer', () => {
  it('should hash buffer correctly', () => {
    const buffer = Buffer.from('hello', 'utf8');
    const expected = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
    expect(sha256Buffer(buffer)).toBe(expected);
  });

  it('should hash empty buffer correctly', () => {
    const buffer = Buffer.from('', 'utf8');
    const expected = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(sha256Buffer(buffer)).toBe(expected);
  });

  it('should match string hash for same content', () => {
    const str = 'test string';
    const buffer = Buffer.from(str, 'utf8');
    expect(sha256Buffer(buffer)).toBe(sha256(str));
  });
});

describe('verifySha256', () => {
  it('should return true for matching hash', () => {
    const input = 'hello';
    const hash = sha256(input);
    expect(verifySha256(input, hash)).toBe(true);
  });

  it('should return false for non-matching hash', () => {
    const input = 'hello';
    const wrongHash = sha256('world');
    expect(verifySha256(input, wrongHash)).toBe(false);
  });

  it('should handle uppercase hash', () => {
    const input = 'hello';
    const hash = sha256(input).toUpperCase();
    expect(verifySha256(input, hash)).toBe(true);
  });

  it('should handle mixed case hash', () => {
    const input = 'hello';
    const hash = '2CF24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';
    expect(verifySha256(input, hash)).toBe(true);
  });
});
