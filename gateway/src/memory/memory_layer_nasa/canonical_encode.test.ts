// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — canonical_encode.test.ts
// Phase 8 — NASA-Grade L4 / DO-178C Level A
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  canonicalEncode,
  sha256Hex,
  isIso8601UtcZ,
  byteLength,
  chainHashFirst,
  chainHashNext,
  CanonicalEncodeError,
} from "./canonical_encode";

describe("canonicalEncode", () => {
  describe("key sorting", () => {
    it("sorts object keys alphabetically", () => {
      const a = { z: 1, a: 2, m: 3 };
      const b = { a: 2, m: 3, z: 1 };

      expect(canonicalEncode(a)).toBe(canonicalEncode(b));
      expect(canonicalEncode(a)).toBe('{"a":2,"m":3,"z":1}');
    });

    it("sorts nested object keys recursively", () => {
      const a = { outer: { z: 9, a: 1 }, first: true };
      const b = { first: true, outer: { a: 1, z: 9 } };

      expect(canonicalEncode(a)).toBe(canonicalEncode(b));
    });
  });

  describe("number handling (INV-MEM-10)", () => {
    it("produces same encoding for 0.1 + 0.2", () => {
      const a = { x: 0.1 + 0.2 };
      const b = { x: 0.30000000000000004 };

      expect(canonicalEncode(a)).toBe(canonicalEncode(b));
    });

    it("normalizes -0 to 0", () => {
      const a = { x: -0 };
      const b = { x: 0 };

      expect(canonicalEncode(a)).toBe(canonicalEncode(b));
    });

    it("throws on NaN", () => {
      expect(() => canonicalEncode({ x: NaN })).toThrow(CanonicalEncodeError);
      try {
        canonicalEncode({ x: NaN });
        expect.fail("Should have thrown");
      } catch (e) {
        expect((e as CanonicalEncodeError).code).toBe("FLOAT_NOT_FINITE");
      }
    });

    it("throws on Infinity", () => {
      expect(() => canonicalEncode({ x: Infinity })).toThrow(CanonicalEncodeError);
    });

    it("throws on -Infinity", () => {
      expect(() => canonicalEncode({ x: -Infinity })).toThrow(CanonicalEncodeError);
    });
  });

  describe("BigInt handling", () => {
    it("converts BigInt to string with n suffix", () => {
      const result = canonicalEncode({ x: BigInt(12345) });
      expect(result).toBe('{"x":"12345n"}');
    });
  });

  describe("array handling", () => {
    it("preserves array order", () => {
      const arr = [3, 1, 2];
      expect(canonicalEncode(arr)).toBe("[3,1,2]");
    });

    it("converts undefined to null in arrays", () => {
      const arr = [1, undefined, 3];
      expect(canonicalEncode(arr)).toBe("[1,null,3]");
    });
  });

  describe("special values", () => {
    it("handles null", () => {
      expect(canonicalEncode(null)).toBe("null");
    });

    it("handles undefined (returns undefined string)", () => {
      expect(canonicalEncode(undefined)).toBe(undefined);
    });

    it("handles boolean", () => {
      expect(canonicalEncode(true)).toBe("true");
      expect(canonicalEncode(false)).toBe("false");
    });

    it("handles strings", () => {
      expect(canonicalEncode("hello")).toBe('"hello"');
    });

    it("skips undefined object properties", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      expect(canonicalEncode(obj)).toBe('{"a":1,"c":3}');
    });
  });

  describe("circular reference detection", () => {
    it("throws on circular reference", () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      expect(() => canonicalEncode(obj)).toThrow(CanonicalEncodeError);
      try {
        canonicalEncode(obj);
        expect.fail("Should have thrown");
      } catch (e) {
        expect((e as CanonicalEncodeError).code).toBe("CIRCULAR_REFERENCE");
      }
    });
  });

  describe("determinism", () => {
    it("produces identical output for identical input (1000 iterations)", () => {
      const payload = {
        name: "test",
        value: 123.456,
        nested: { a: 1, b: 2 },
        array: [1, 2, 3],
      };

      const first = canonicalEncode(payload);
      for (let i = 0; i < 1000; i++) {
        expect(canonicalEncode(payload)).toBe(first);
      }
    });
  });
});

describe("sha256Hex", () => {
  it("produces 64-character hex string", () => {
    const hash = sha256Hex("hello");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("is deterministic", () => {
    const input = "test input";
    const h1 = sha256Hex(input);
    const h2 = sha256Hex(input);
    expect(h1).toBe(h2);
  });

  it("different input produces different hash", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });
});

describe("isIso8601UtcZ", () => {
  it("accepts valid ISO 8601 UTC timestamps", () => {
    expect(isIso8601UtcZ("2026-01-03T00:00:00Z")).toBe(true);
    expect(isIso8601UtcZ("2026-01-03T12:34:56.789Z")).toBe(true);
  });

  it("rejects invalid timestamps", () => {
    expect(isIso8601UtcZ("not-a-timestamp")).toBe(false);
    expect(isIso8601UtcZ("2026-01-03")).toBe(false);
    expect(isIso8601UtcZ("2026-01-03T00:00:00")).toBe(false); // no Z
    expect(isIso8601UtcZ("2026-01-03T00:00:00+00:00")).toBe(false); // not Z format
  });
});

describe("byteLength", () => {
  it("calculates UTF-8 byte length", () => {
    expect(byteLength("hello")).toBe(5);
    expect(byteLength("héllo")).toBe(6); // é is 2 bytes
    expect(byteLength("日本語")).toBe(9); // each char is 3 bytes
  });
});

describe("chainHash functions", () => {
  it("chainHashFirst creates hash from key and entry hash", () => {
    const result = chainHashFirst("test:key:here", "abc123");
    expect(result).toHaveLength(64);
  });

  it("chainHashNext creates hash from previous chain and entry hash", () => {
    const result = chainHashNext("prevChainHash", "entryHash");
    expect(result).toHaveLength(64);
  });

  it("chain hashes are deterministic", () => {
    const h1 = chainHashFirst("key", "hash");
    const h2 = chainHashFirst("key", "hash");
    expect(h1).toBe(h2);

    const h3 = chainHashNext("prev", "current");
    const h4 = chainHashNext("prev", "current");
    expect(h3).toBe(h4);
  });
});
