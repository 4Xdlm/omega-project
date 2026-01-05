/**
 * OMEGA Persistence Layer — Canonical JSON Tests
 * Phase 19 — v3.19.0
 * 
 * INV-PER-04: Format JSON déterministe
 */

import { describe, it, expect } from 'vitest';
import {
  canonicalEncode,
  canonicalEncodeWithHash,
  canonicalDecode,
  canonicalDecodeWithVerify,
  isCanonicalJson,
  verifyJsonHash,
  CanonicalJson,
} from '../../src/core/canonical.js';
import { computeHash } from '../../src/core/types.js';

describe('Canonical JSON Encoder', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC ENCODING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Basic Encoding', () => {
    it('encodes null', () => {
      expect(canonicalEncode(null)).toBe('null');
    });

    it('encodes boolean', () => {
      expect(canonicalEncode(true)).toBe('true');
      expect(canonicalEncode(false)).toBe('false');
    });

    it('encodes numbers', () => {
      expect(canonicalEncode(42)).toBe('42');
      expect(canonicalEncode(3.14)).toBe('3.14');
      expect(canonicalEncode(-100)).toBe('-100');
    });

    it('encodes strings', () => {
      expect(canonicalEncode('hello')).toBe('"hello"');
      expect(canonicalEncode('')).toBe('""');
    });

    it('encodes arrays', () => {
      expect(canonicalEncode([1, 2, 3])).toBe('[1,2,3]');
      expect(canonicalEncode([])).toBe('[]');
    });

    it('encodes objects with sorted keys', () => {
      const obj = { z: 1, a: 2, m: 3 };
      expect(canonicalEncode(obj)).toBe('{"a":2,"m":3,"z":1}');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-PER-04: DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-PER-04: Determinism', () => {
    it('same object produces same output regardless of key order', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { c: 3, b: 2, a: 1 };
      const obj3 = { b: 2, a: 1, c: 3 };

      const result1 = canonicalEncode(obj1);
      const result2 = canonicalEncode(obj2);
      const result3 = canonicalEncode(obj3);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe('{"a":1,"b":2,"c":3}');
    });

    it('nested objects have sorted keys at all levels', () => {
      const obj = {
        z: { y: 1, x: 2 },
        a: { c: 3, b: 4 },
      };

      const result = canonicalEncode(obj);
      expect(result).toBe('{"a":{"b":4,"c":3},"z":{"x":2,"y":1}}');
    });

    it('100 runs produce identical output', () => {
      const data = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
        metadata: { version: 1, timestamp: '2026-01-05' },
      };

      const first = canonicalEncode(data);
      
      for (let i = 0; i < 100; i++) {
        expect(canonicalEncode(data)).toBe(first);
      }
    });

    it('100 runs produce identical hash', () => {
      const data = { test: 'determinism', value: 42 };
      const first = canonicalEncodeWithHash(data);

      for (let i = 0; i < 100; i++) {
        const result = canonicalEncodeWithHash(data);
        expect(result.hash).toBe(first.hash);
        expect(result.json).toBe(first.json);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIAL NUMBERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Special Numbers', () => {
    it('normalizes -0 to 0', () => {
      expect(canonicalEncode(-0)).toBe('0');
      expect(canonicalEncode({ value: -0 })).toBe('{"value":0}');
    });

    it('converts NaN to null', () => {
      expect(canonicalEncode(NaN)).toBe('null');
      expect(canonicalEncode({ value: NaN })).toBe('{"value":null}');
    });

    it('converts Infinity to null', () => {
      expect(canonicalEncode(Infinity)).toBe('null');
      expect(canonicalEncode(-Infinity)).toBe('null');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENCODING WITH HASH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Encoding with Hash', () => {
    it('returns bytes, json, and hash', () => {
      const data = { test: 'data' };
      const result = canonicalEncodeWithHash(data);

      expect(result.json).toBe('{"test":"data"}');
      expect(result.bytes).toBeInstanceOf(Buffer);
      expect(result.bytes.toString('utf8')).toBe(result.json);
      expect(typeof result.hash).toBe('string');
      expect(result.hash).toHaveLength(64); // SHA-256 hex
    });

    it('hash matches computed hash of bytes', () => {
      const data = { verify: 'hash' };
      const result = canonicalEncodeWithHash(data);

      const expectedHash = computeHash(result.bytes);
      expect(result.hash).toBe(expectedHash);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DECODING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Decoding', () => {
    it('decodes valid JSON', () => {
      const json = '{"a":1,"b":2}';
      const result = canonicalDecode<{ a: number; b: number }>(json);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('throws on invalid JSON', () => {
      expect(() => canonicalDecode('not json')).toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DECODE WITH VERIFY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Decode with Verify', () => {
    it('verifies correct hash', () => {
      const data = { test: 'verify' };
      const encoded = canonicalEncodeWithHash(data);

      const decoded = canonicalDecodeWithVerify(encoded.bytes, encoded.hash);
      expect(decoded.verified).toBe(true);
      expect(decoded.hash).toBe(encoded.hash);
      expect(decoded.data).toEqual(data);
    });

    it('fails verification with wrong hash', () => {
      const data = { test: 'verify' };
      const encoded = canonicalEncodeWithHash(data);

      const wrongHash = 'a'.repeat(64);
      const decoded = canonicalDecodeWithVerify(encoded.bytes, wrongHash);
      expect(decoded.verified).toBe(false);
    });

    it('skips verification without expected hash', () => {
      const data = { test: 'no-verify' };
      const encoded = canonicalEncodeWithHash(data);

      const decoded = canonicalDecodeWithVerify(encoded.bytes);
      expect(decoded.verified).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Validation', () => {
    it('isCanonicalJson returns true for canonical JSON', () => {
      expect(isCanonicalJson('{"a":1,"b":2}')).toBe(true);
      expect(isCanonicalJson('[1,2,3]')).toBe(true);
      expect(isCanonicalJson('null')).toBe(true);
    });

    it('isCanonicalJson returns false for non-canonical JSON', () => {
      // Keys not sorted
      expect(isCanonicalJson('{"b":2,"a":1}')).toBe(false);
      // Has whitespace
      expect(isCanonicalJson('{ "a": 1 }')).toBe(false);
    });

    it('isCanonicalJson returns false for invalid JSON', () => {
      expect(isCanonicalJson('not json')).toBe(false);
      expect(isCanonicalJson('{incomplete')).toBe(false);
    });

    it('verifyJsonHash verifies correct hash', () => {
      const json = canonicalEncode({ test: 'hash' });
      const hash = computeHash(Buffer.from(json, 'utf8'));
      expect(verifyJsonHash(json, hash)).toBe(true);
    });

    it('verifyJsonHash fails with wrong hash', () => {
      const json = canonicalEncode({ test: 'hash' });
      expect(verifyJsonHash(json, 'wrong')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NAMESPACE OBJECT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CanonicalJson namespace', () => {
    it('exposes all functions', () => {
      expect(CanonicalJson.encode).toBe(canonicalEncode);
      expect(CanonicalJson.encodeWithHash).toBe(canonicalEncodeWithHash);
      expect(CanonicalJson.decode).toBe(canonicalDecode);
      expect(CanonicalJson.decodeWithVerify).toBe(canonicalDecodeWithVerify);
      expect(CanonicalJson.isCanonical).toBe(isCanonicalJson);
      expect(CanonicalJson.verifyHash).toBe(verifyJsonHash);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLEX DATA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complex Data', () => {
    it('handles deeply nested structures', () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              level4: { value: 'deep' },
            },
          },
        },
      };

      const encoded = canonicalEncode(deep);
      const decoded = canonicalDecode(encoded);
      expect(decoded).toEqual(deep);
    });

    it('handles arrays with mixed types', () => {
      const mixed = [1, 'string', null, { a: 1 }, [1, 2]];
      const encoded = canonicalEncode(mixed);
      const decoded = canonicalDecode(encoded);
      expect(decoded).toEqual(mixed);
    });

    it('handles unicode strings', () => {
      const unicode = { emoji: '🚀', chinese: '中文', arabic: 'العربية' };
      const encoded = canonicalEncode(unicode);
      const decoded = canonicalDecode<typeof unicode>(encoded);
      expect(decoded).toEqual(unicode);
    });

    it('handles empty structures', () => {
      expect(canonicalEncode({})).toBe('{}');
      expect(canonicalEncode([])).toBe('[]');
    });
  });
});
