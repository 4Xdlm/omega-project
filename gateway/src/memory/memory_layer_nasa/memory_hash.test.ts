/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_hash.test.ts — Tests Cryptographic Hashing
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * INVARIANTS TESTÉS :
 *   INV-MEM-02 : Deterministic Retrieval (même input → même hash)
 *   INV-MEM-06 : Hash Integrity
 */

import { describe, it, expect } from "vitest";
import {
  // Canonical encoding
  canonicalEncode,
  canonicalEqual,
  
  // SHA-256
  sha256,
  sha256Buffer,
  sha256Value,
  
  // Record hashing
  computePayloadHash,
  computeRecordHash,
  
  // Merkle
  combineHashes,
  computeMerkleRoot,
  
  // Verification
  verifyPayloadHash,
  verifyRecordHash,
  verifyHashChain,
  
  // Utilities
  hashToId,
  generateContentId,
  isValidHash,
  hashesEqual,
  verifyDeterminism,
  NULL_HASH,
  EMPTY_HASH,
} from "./memory_hash.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CANONICAL ENCODING
// ═══════════════════════════════════════════════════════════════════════════════

describe("Canonical Encoding", () => {
  describe("canonicalEncode", () => {
    it("should encode primitives", () => {
      expect(canonicalEncode(null)).toBe("null");
      expect(canonicalEncode(true)).toBe("true");
      expect(canonicalEncode(false)).toBe("false");
      expect(canonicalEncode(42)).toBe("42");
      expect(canonicalEncode("hello")).toBe('"hello"');
    });

    it("should encode arrays", () => {
      expect(canonicalEncode([1, 2, 3])).toBe("[1,2,3]");
      expect(canonicalEncode(["a", "b"])).toBe('["a","b"]');
    });

    it("should sort object keys alphabetically", () => {
      const obj = { z: 1, a: 2, m: 3 };
      expect(canonicalEncode(obj)).toBe('{"a":2,"m":3,"z":1}');
    });

    it("should handle nested objects", () => {
      const obj = { b: { z: 1, a: 2 }, a: 1 };
      expect(canonicalEncode(obj)).toBe('{"a":1,"b":{"a":2,"z":1}}');
    });

    it("should exclude undefined values", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      expect(canonicalEncode(obj)).toBe('{"a":1,"c":3}');
    });

    it("should handle arrays with objects", () => {
      const arr = [{ z: 1, a: 2 }, { b: 3 }];
      expect(canonicalEncode(arr)).toBe('[{"a":2,"z":1},{"b":3}]');
    });

    it("should produce consistent output — INV-MEM-02", () => {
      const obj = { name: "Alice", age: 25, role: "protagonist" };
      const encoded1 = canonicalEncode(obj);
      const encoded2 = canonicalEncode(obj);
      const encoded3 = canonicalEncode({ role: "protagonist", name: "Alice", age: 25 });
      
      expect(encoded1).toBe(encoded2);
      expect(encoded1).toBe(encoded3);
    });
  });

  describe("canonicalEqual", () => {
    it("should return true for equal values", () => {
      expect(canonicalEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
      expect(canonicalEqual([1, 2], [1, 2])).toBe(true);
      expect(canonicalEqual("test", "test")).toBe(true);
    });

    it("should return false for different values", () => {
      expect(canonicalEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(canonicalEqual([1, 2], [2, 1])).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — SHA-256 HASHING
// ═══════════════════════════════════════════════════════════════════════════════

describe("SHA-256 Hashing", () => {
  describe("sha256", () => {
    it("should return 64 character hex string", () => {
      const hash = sha256("test");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce known hash for empty string", () => {
      // SHA-256 of empty string
      const hash = sha256("");
      expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    it("should produce known hash for 'test'", () => {
      const hash = sha256("test");
      expect(hash).toBe("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
    });

    it("should be deterministic — INV-MEM-02", () => {
      const input = "deterministic test";
      const hashes: string[] = [];
      
      for (let i = 0; i < 100; i++) {
        hashes.push(sha256(input));
      }
      
      const first = hashes[0];
      expect(hashes.every(h => h === first)).toBe(true);
    });
  });

  describe("sha256Buffer", () => {
    it("should hash buffer", () => {
      const buffer = Buffer.from("test");
      const hash = sha256Buffer(buffer);
      expect(hash).toBe(sha256("test"));
    });
  });

  describe("sha256Value", () => {
    it("should hash via canonical encoding", () => {
      const obj = { a: 1, b: 2 };
      const hash = sha256Value(obj);
      expect(hash).toBe(sha256(canonicalEncode(obj)));
    });

    it("should produce same hash for equivalent objects", () => {
      const hash1 = sha256Value({ z: 1, a: 2 });
      const hash2 = sha256Value({ a: 2, z: 1 });
      expect(hash1).toBe(hash2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — RECORD HASHING — INV-MEM-06
// ═══════════════════════════════════════════════════════════════════════════════

describe("Record Hashing (INV-MEM-06)", () => {
  describe("computePayloadHash", () => {
    it("should hash payload", () => {
      const hash = computePayloadHash({ payload: { name: "Alice" } });
      expect(hash).toHaveLength(64);
    });

    it("should produce different hashes for different payloads", () => {
      const hash1 = computePayloadHash({ payload: { name: "Alice" } });
      const hash2 = computePayloadHash({ payload: { name: "Bob" } });
      expect(hash1).not.toBe(hash2);
    });

    it("should produce same hash for equivalent payloads", () => {
      const hash1 = computePayloadHash({ payload: { a: 1, b: 2 } });
      const hash2 = computePayloadHash({ payload: { b: 2, a: 1 } });
      expect(hash1).toBe(hash2);
    });
  });

  describe("computeRecordHash", () => {
    const baseInput = {
      key: "char:alice",
      version: 1,
      payload_hash: "a".repeat(64),
      created_at_utc: "2026-01-04T00:00:00Z",
      provenance: {
        source: { type: "USER" as const, user_id: "user123" },
        reason: "CREATION" as const,
        timestamp_utc: "2026-01-04T00:00:00Z",
      },
    };

    it("should produce valid hash", () => {
      const hash = computeRecordHash(baseInput);
      expect(hash).toHaveLength(64);
    });

    it("should include all fields in hash", () => {
      const hash1 = computeRecordHash(baseInput);
      const hash2 = computeRecordHash({ ...baseInput, key: "char:bob" });
      const hash3 = computeRecordHash({ ...baseInput, version: 2 });
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it("should include previous_hash when present", () => {
      const hash1 = computeRecordHash(baseInput);
      const hash2 = computeRecordHash({ ...baseInput, previous_hash: "b".repeat(64) });
      expect(hash1).not.toBe(hash2);
    });

    it("should be deterministic", () => {
      const hashes: string[] = [];
      for (let i = 0; i < 50; i++) {
        hashes.push(computeRecordHash(baseInput));
      }
      expect(hashes.every(h => h === hashes[0])).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — MERKLE TREE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Merkle Tree", () => {
  describe("combineHashes", () => {
    it("should combine two hashes", () => {
      const h1 = "a".repeat(64);
      const h2 = "b".repeat(64);
      const combined = combineHashes(h1, h2);
      expect(combined).toHaveLength(64);
    });

    it("should be order-independent (sorted internally)", () => {
      const h1 = "a".repeat(64);
      const h2 = "b".repeat(64);
      expect(combineHashes(h1, h2)).toBe(combineHashes(h2, h1));
    });

    it("should produce different result for different inputs", () => {
      const h1 = "a".repeat(64);
      const h2 = "b".repeat(64);
      const h3 = "c".repeat(64);
      expect(combineHashes(h1, h2)).not.toBe(combineHashes(h1, h3));
    });
  });

  describe("computeMerkleRoot", () => {
    it("should return EMPTY_STORE hash for empty array", () => {
      const root = computeMerkleRoot([]);
      expect(root).toBe(sha256("EMPTY_STORE"));
    });

    it("should return hash itself for single element", () => {
      const hash = "a".repeat(64);
      const root = computeMerkleRoot([hash]);
      expect(root).toBe(hash);
    });

    it("should combine two hashes", () => {
      const h1 = "a".repeat(64);
      const h2 = "b".repeat(64);
      const root = computeMerkleRoot([h1, h2]);
      expect(root).toBe(combineHashes(h1, h2));
    });

    it("should handle odd number of hashes", () => {
      const h1 = "a".repeat(64);
      const h2 = "b".repeat(64);
      const h3 = "c".repeat(64);
      const root = computeMerkleRoot([h1, h2, h3]);
      expect(root).toHaveLength(64);
    });

    it("should be deterministic", () => {
      const hashes = ["a".repeat(64), "b".repeat(64), "c".repeat(64), "d".repeat(64)];
      const roots: string[] = [];
      
      for (let i = 0; i < 20; i++) {
        roots.push(computeMerkleRoot(hashes));
      }
      
      expect(roots.every(r => r === roots[0])).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — HASH VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Hash Verification", () => {
  describe("verifyPayloadHash", () => {
    it("should return valid for correct hash", () => {
      const payload = { name: "Alice" };
      const hash = computePayloadHash({ payload });
      
      const result = verifyPayloadHash(payload, hash);
      expect(result.valid).toBe(true);
      expect(result.computed_hash).toBe(hash);
    });

    it("should return invalid for incorrect hash", () => {
      const payload = { name: "Alice" };
      const wrongHash = "0".repeat(64);
      
      const result = verifyPayloadHash(payload, wrongHash);
      expect(result.valid).toBe(false);
      expect(result.expected_hash).toBe(wrongHash);
    });
  });

  describe("verifyRecordHash", () => {
    it("should verify correct hash", () => {
      const input = {
        key: "char:alice",
        version: 1,
        payload_hash: "a".repeat(64),
        created_at_utc: "2026-01-04T00:00:00Z",
        provenance: {
          source: { type: "USER" as const, user_id: "user" },
          reason: "CREATION" as const,
          timestamp_utc: "2026-01-04T00:00:00Z",
        },
      };
      
      const hash = computeRecordHash(input);
      const result = verifyRecordHash(input, hash);
      
      expect(result.valid).toBe(true);
    });

    it("should detect tampering", () => {
      const input = {
        key: "char:alice",
        version: 1,
        payload_hash: "a".repeat(64),
        created_at_utc: "2026-01-04T00:00:00Z",
        provenance: {
          source: { type: "USER" as const, user_id: "user" },
          reason: "CREATION" as const,
          timestamp_utc: "2026-01-04T00:00:00Z",
        },
      };
      
      const hash = computeRecordHash(input);
      
      // Tamper with input
      const tampered = { ...input, version: 2 };
      const result = verifyRecordHash(tampered, hash);
      
      expect(result.valid).toBe(false);
    });
  });

  describe("verifyHashChain", () => {
    it("should validate empty chain", () => {
      const result = verifyHashChain([], []);
      expect(result.valid).toBe(true);
      expect(result.verified_count).toBe(0);
    });

    it("should validate single record (no previous)", () => {
      const result = verifyHashChain(["a".repeat(64)], [undefined]);
      expect(result.valid).toBe(true);
      expect(result.verified_count).toBe(1);
    });

    it("should validate valid chain", () => {
      const h1 = "a".repeat(64);
      const h2 = "b".repeat(64);
      const h3 = "c".repeat(64);
      
      const result = verifyHashChain(
        [h1, h2, h3],
        [undefined, h1, h2]
      );
      
      expect(result.valid).toBe(true);
      expect(result.verified_count).toBe(3);
    });

    it("should detect broken chain", () => {
      const h1 = "a".repeat(64);
      const h2 = "b".repeat(64);
      const h3 = "c".repeat(64);
      
      const result = verifyHashChain(
        [h1, h2, h3],
        [undefined, h1, "wrong".padEnd(64, "0")]  // Wrong previous_hash for h3
      );
      
      expect(result.valid).toBe(false);
      expect(result.first_invalid_index).toBe(2);
    });

    it("should reject first record with previous_hash", () => {
      const result = verifyHashChain(
        ["a".repeat(64)],
        ["b".repeat(64)]  // First record should not have previous_hash
      );
      
      expect(result.valid).toBe(false);
      expect(result.first_invalid_index).toBe(0);
    });

    it("should reject mismatched array lengths", () => {
      const result = verifyHashChain(
        ["a".repeat(64), "b".repeat(64)],
        [undefined]
      );
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("same length");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Hash Utilities", () => {
  describe("hashToId", () => {
    it("should extract prefix", () => {
      const hash = "abcdef1234567890".padEnd(64, "0");
      expect(hashToId(hash, 16)).toBe("abcdef1234567890");
    });

    it("should use default length of 16", () => {
      const hash = "a".repeat(64);
      expect(hashToId(hash)).toHaveLength(16);
    });

    it("should throw for too short hash", () => {
      expect(() => hashToId("short", 16)).toThrow();
    });
  });

  describe("generateContentId", () => {
    it("should generate 32 char ID", () => {
      const id = generateContentId({ test: "data" });
      expect(id).toHaveLength(32);
    });

    it("should be deterministic", () => {
      const content = { name: "Alice", age: 25 };
      const id1 = generateContentId(content);
      const id2 = generateContentId(content);
      expect(id1).toBe(id2);
    });
  });

  describe("isValidHash", () => {
    it("should return true for valid hash", () => {
      expect(isValidHash("a".repeat(64))).toBe(true);
      expect(isValidHash("0123456789abcdef".repeat(4))).toBe(true);
    });

    it("should return false for invalid hash", () => {
      expect(isValidHash("short")).toBe(false);
      expect(isValidHash("G".repeat(64))).toBe(false);  // G not hex
      expect(isValidHash("A".repeat(64))).toBe(false);  // Uppercase
      expect(isValidHash(123)).toBe(false);
      expect(isValidHash(null)).toBe(false);
    });
  });

  describe("hashesEqual", () => {
    it("should return true for equal hashes", () => {
      const h = "a".repeat(64);
      expect(hashesEqual(h, h)).toBe(true);
    });

    it("should return false for different hashes", () => {
      expect(hashesEqual("a".repeat(64), "b".repeat(64))).toBe(false);
    });

    it("should return false for different lengths", () => {
      expect(hashesEqual("a".repeat(64), "a".repeat(32))).toBe(false);
    });
  });

  describe("constants", () => {
    it("NULL_HASH should be valid", () => {
      expect(isValidHash(NULL_HASH)).toBe(true);
    });

    it("EMPTY_HASH should be valid", () => {
      expect(isValidHash(EMPTY_HASH)).toBe(true);
    });

    it("EMPTY_HASH should match sha256 of empty string", () => {
      expect(EMPTY_HASH).toBe(sha256(""));
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — INV-MEM-02 : DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MEM-02: Deterministic Retrieval", () => {
  describe("verifyDeterminism", () => {
    it("should verify determinism for simple values", () => {
      expect(verifyDeterminism("test", 100)).toBe(true);
      expect(verifyDeterminism(123, 100)).toBe(true);
      expect(verifyDeterminism(null, 100)).toBe(true);
    });

    it("should verify determinism for objects", () => {
      const obj = { name: "Alice", age: 25, nested: { x: 1, y: 2 } };
      expect(verifyDeterminism(obj, 100)).toBe(true);
    });

    it("should verify determinism for arrays", () => {
      const arr = [1, 2, { a: 3 }, [4, 5]];
      expect(verifyDeterminism(arr, 100)).toBe(true);
    });

    it("should verify determinism for complex nested structures", () => {
      const complex = {
        characters: [
          { name: "Alice", traits: ["brave", "smart"] },
          { name: "Bob", traits: ["cunning"] },
        ],
        scenes: {
          opening: { location: "forest", time: "dawn" },
          climax: { location: "castle", time: "midnight" },
        },
        metadata: {
          version: 1,
          created_at: "2026-01-04T00:00:00Z",
        },
      };
      
      expect(verifyDeterminism(complex, 100)).toBe(true);
    });
  });

  it("sha256Value should be deterministic over 100 runs", () => {
    const testCases = [
      "simple string",
      12345,
      { key: "value", nested: { a: 1 } },
      [1, "two", { three: 3 }],
      null,
    ];
    
    for (const testCase of testCases) {
      const firstHash = sha256Value(testCase);
      
      for (let i = 0; i < 100; i++) {
        expect(sha256Value(testCase)).toBe(firstHash);
      }
    }
  });

  it("computeRecordHash should be deterministic over 100 runs", () => {
    const input = {
      key: "char:alice",
      version: 1,
      payload_hash: sha256Value({ name: "Alice" }),
      created_at_utc: "2026-01-04T12:00:00.000Z",
      provenance: {
        source: { type: "USER" as const, user_id: "user123" },
        reason: "CREATION" as const,
        timestamp_utc: "2026-01-04T12:00:00.000Z",
      },
    };
    
    const firstHash = computeRecordHash(input);
    
    for (let i = 0; i < 100; i++) {
      expect(computeRecordHash(input)).toBe(firstHash);
    }
  });
});
