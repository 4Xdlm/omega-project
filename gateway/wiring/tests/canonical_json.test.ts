// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS CANONICAL JSON
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-ADP-06: Payload sérialisé = byte stream identique
// @invariant INV-ENV-05: même input → même replay_protection_key
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  canonicalStringify,
  canonicalNormalize,
  canonicalEquals,
  canonicalHash,
  CanonicalJsonError,
} from '../src/canonical_json.js';

describe('Canonical JSON', () => {
  describe('canonicalStringify', () => {
    describe('key ordering', () => {
      it('sorts object keys alphabetically', () => {
        const result = canonicalStringify({ z: 1, a: 2, m: 3 });
        expect(result).toBe('{"a":2,"m":3,"z":1}');
      });

      it('sorts nested object keys', () => {
        const result = canonicalStringify({ outer: { z: 1, a: 2 } });
        expect(result).toBe('{"outer":{"a":2,"z":1}}');
      });

      it('sorts deeply nested keys', () => {
        const input = { c: { f: { i: 1, h: 2 }, e: 3 }, a: { d: 4, b: 5 } };
        const result = canonicalStringify(input);
        expect(result).toBe('{"a":{"b":5,"d":4},"c":{"e":3,"f":{"h":2,"i":1}}}');
      });

      it('different key orders produce same output', () => {
        const a = canonicalStringify({ b: 2, a: 1 });
        const b = canonicalStringify({ a: 1, b: 2 });
        expect(a).toBe(b);
      });
    });

    describe('arrays', () => {
      it('preserves array order', () => {
        const result = canonicalStringify([3, 1, 2]);
        expect(result).toBe('[3,1,2]');
      });

      it('sorts keys in array elements', () => {
        const result = canonicalStringify([{ z: 1, a: 2 }]);
        expect(result).toBe('[{"a":2,"z":1}]');
      });

      it('handles nested arrays', () => {
        const result = canonicalStringify([[1, 2], [3, 4]]);
        expect(result).toBe('[[1,2],[3,4]]');
      });

      it('handles mixed array content', () => {
        const result = canonicalStringify([1, 'two', { c: 3, a: 1 }, [4]]);
        expect(result).toBe('[1,"two",{"a":1,"c":3},[4]]');
      });
    });

    describe('primitives', () => {
      it('handles strings', () => {
        expect(canonicalStringify('hello')).toBe('"hello"');
      });

      it('handles numbers', () => {
        expect(canonicalStringify(42)).toBe('42');
        expect(canonicalStringify(3.14)).toBe('3.14');
        expect(canonicalStringify(-1)).toBe('-1');
      });

      it('handles booleans', () => {
        expect(canonicalStringify(true)).toBe('true');
        expect(canonicalStringify(false)).toBe('false');
      });

      it('handles null', () => {
        expect(canonicalStringify(null)).toBe('null');
      });
    });

    describe('error cases', () => {
      it('rejects undefined', () => {
        expect(() => canonicalStringify(undefined)).toThrow(CanonicalJsonError);
      });

      it('rejects functions', () => {
        expect(() => canonicalStringify(() => {})).toThrow(CanonicalJsonError);
      });

      it('rejects symbols', () => {
        expect(() => canonicalStringify(Symbol('test'))).toThrow(CanonicalJsonError);
      });

      it('rejects BigInt', () => {
        expect(() => canonicalStringify(BigInt(123))).toThrow(CanonicalJsonError);
      });

      it('rejects NaN', () => {
        expect(() => canonicalStringify(NaN)).toThrow(CanonicalJsonError);
      });

      it('rejects Infinity', () => {
        expect(() => canonicalStringify(Infinity)).toThrow(CanonicalJsonError);
      });

      it('rejects -Infinity', () => {
        expect(() => canonicalStringify(-Infinity)).toThrow(CanonicalJsonError);
      });

      it('rejects Date objects', () => {
        expect(() => canonicalStringify(new Date())).toThrow(CanonicalJsonError);
      });

      it('rejects Map', () => {
        expect(() => canonicalStringify(new Map())).toThrow(CanonicalJsonError);
      });

      it('rejects Set', () => {
        expect(() => canonicalStringify(new Set())).toThrow(CanonicalJsonError);
      });

      it('rejects nested undefined', () => {
        expect(() => canonicalStringify({ a: undefined })).toThrow(CanonicalJsonError);
      });

      it('rejects nested NaN', () => {
        expect(() => canonicalStringify({ a: NaN })).toThrow(CanonicalJsonError);
      });
    });
  });

  describe('canonicalNormalize', () => {
    it('normalizes unordered JSON', () => {
      const input = '{"z":1,"a":2}';
      const result = canonicalNormalize(input);
      expect(result).toBe('{"a":2,"z":1}');
    });

    it('handles valid JSON', () => {
      const input = '{"key":"value"}';
      const result = canonicalNormalize(input);
      expect(result).toBe('{"key":"value"}');
    });

    it('throws on invalid JSON', () => {
      expect(() => canonicalNormalize('not json')).toThrow();
    });
  });

  describe('canonicalEquals', () => {
    it('returns true for equal objects with different key order', () => {
      const a = { z: 1, a: 2 };
      const b = { a: 2, z: 1 };
      expect(canonicalEquals(a, b)).toBe(true);
    });

    it('returns false for different objects', () => {
      const a = { a: 1 };
      const b = { a: 2 };
      expect(canonicalEquals(a, b)).toBe(false);
    });

    it('returns true for identical primitives', () => {
      expect(canonicalEquals(42, 42)).toBe(true);
      expect(canonicalEquals('test', 'test')).toBe(true);
    });

    it('returns false for non-serializable values', () => {
      expect(canonicalEquals(undefined, undefined)).toBe(false);
      expect(canonicalEquals(NaN, NaN)).toBe(false);
    });
  });

  describe('canonicalHash', () => {
    it('produces consistent hash', () => {
      const obj = { b: 2, a: 1 };
      const hash1 = canonicalHash(obj);
      const hash2 = canonicalHash(obj);
      expect(hash1).toBe(hash2);
    });

    it('produces same hash for different key orders', () => {
      const a = { z: 3, a: 1, m: 2 };
      const b = { a: 1, m: 2, z: 3 };
      expect(canonicalHash(a)).toBe(canonicalHash(b));
    });

    it('produces different hash for different values', () => {
      const a = { x: 1 };
      const b = { x: 2 };
      expect(canonicalHash(a)).not.toBe(canonicalHash(b));
    });

    it('returns 64 char hex string (SHA256)', () => {
      const hash = canonicalHash({ test: true });
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('INV-ADP-06: Byte stream determinism', () => {
    it('100 runs produce identical output', () => {
      const input = {
        trace_id: 'trace-001',
        payload: { nested: { value: 42 }, items: [1, 2, 3] },
        metadata: { created: 1704499200000 },
      };

      const first = canonicalStringify(input);
      for (let i = 0; i < 100; i++) {
        expect(canonicalStringify(input)).toBe(first);
      }
    });

    it('different key orders always normalize', () => {
      const variants = [
        { a: 1, b: 2, c: 3 },
        { c: 3, a: 1, b: 2 },
        { b: 2, c: 3, a: 1 },
      ];

      const expected = canonicalStringify(variants[0]);
      for (const v of variants) {
        expect(canonicalStringify(v)).toBe(expected);
      }
    });
  });

  describe('INV-ENV-05: replay_protection_key determinism', () => {
    it('same payload produces same hash', () => {
      const payload = {
        source_module: 'gateway',
        target_module: 'memory',
        kind: 'command',
        payload_schema: 'memory.write',
        payload_version: 'v1.0.0',
        module_version: 'memory@3.21.0',
        payload: { key: 'k', value: { b: 2, a: 1 } },
      };

      // Simulate different key order in payload.value
      const payload2 = {
        source_module: 'gateway',
        target_module: 'memory',
        kind: 'command',
        payload_schema: 'memory.write',
        payload_version: 'v1.0.0',
        module_version: 'memory@3.21.0',
        payload: { key: 'k', value: { a: 1, b: 2 } },
      };

      expect(canonicalHash(payload)).toBe(canonicalHash(payload2));
    });
  });
});
