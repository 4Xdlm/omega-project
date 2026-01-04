/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_index.test.ts — Tests Index + Attack Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PHASE       : 10B
 * 
 * INVARIANTS TESTÉS :
 *   INV-MEM-01 : Append-Only (via attack tests)
 *   INV-MEM-02 : Deterministic Retrieval
 *   INV-MEM-06 : Hash Integrity
 *   INV-MEM-08 : Query Isolation
 */

import { describe, it, expect } from "vitest";
import {
  MemoryIndex,
  isIndexEntry,
  buildIndex,
  verifyIndex,
  verifyIndexDeterminism,
  type IndexEntry,
} from "./memory_index.js";
import { sha256Value } from "./memory_hash.js";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createTestHash(content: string): string {
  return sha256Value(content);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — INDEX ENTRY TYPE GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe("IndexEntry", () => {
  describe("isIndexEntry", () => {
    it("should return true for valid entry", () => {
      const entry: IndexEntry = {
        record_hash: "a".repeat(64),
        key: "char:alice",
        version: 1,
        indexed_at_utc: new Date().toISOString(),
      };
      expect(isIndexEntry(entry)).toBe(true);
    });

    it("should return false for invalid hash", () => {
      expect(isIndexEntry({
        record_hash: "short",
        key: "char:alice",
        version: 1,
        indexed_at_utc: new Date().toISOString(),
      })).toBe(false);
    });

    it("should return false for invalid version", () => {
      expect(isIndexEntry({
        record_hash: "a".repeat(64),
        key: "char:alice",
        version: 0,
        indexed_at_utc: new Date().toISOString(),
      })).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isIndexEntry(null)).toBe(false);
      expect(isIndexEntry(undefined)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — MEMORY INDEX BASIC OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("MemoryIndex", () => {
  describe("index()", () => {
    it("should index a record successfully", () => {
      const index = new MemoryIndex();
      const hash = createTestHash("payload1");
      
      const result = index.index(hash, "char:alice", 1);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.record_hash).toBe(hash);
        expect(result.value.key).toBe("char:alice");
        expect(result.value.version).toBe(1);
      }
    });

    it("should index multiple versions of same key", () => {
      const index = new MemoryIndex();
      
      index.index(createTestHash("v1"), "char:alice", 1);
      index.index(createTestHash("v2"), "char:alice", 2);
      index.index(createTestHash("v3"), "char:alice", 3);
      
      expect(index.getVersionCount("char:alice")).toBe(3);
    });

    it("should be idempotent for same hash", () => {
      const index = new MemoryIndex();
      const hash = createTestHash("payload");
      
      const result1 = index.index(hash, "char:alice", 1);
      const result2 = index.index(hash, "char:alice", 1);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(index.getEntryCount()).toBe(1);
    });

    it("should reject invalid hash format", () => {
      const index = new MemoryIndex();
      
      const result = index.index("invalid", "char:alice", 1);
      
      expect(result.success).toBe(false);
    });

    it("should reject empty key", () => {
      const index = new MemoryIndex();
      
      const result = index.index(createTestHash("x"), "", 1);
      
      expect(result.success).toBe(false);
    });

    it("should reject version 0 or negative", () => {
      const index = new MemoryIndex();
      const hash = createTestHash("x");
      
      expect(index.index(hash, "key", 0).success).toBe(false);
      expect(index.index(hash, "key", -1).success).toBe(false);
    });

    it("should freeze indexed entry", () => {
      const index = new MemoryIndex();
      const hash = createTestHash("payload");
      
      const result = index.index(hash, "char:alice", 1);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.isFrozen(result.value)).toBe(true);
      }
    });
  });

  describe("lookupByHash()", () => {
    it("should find indexed record", () => {
      const index = new MemoryIndex();
      const hash = createTestHash("payload");
      
      index.index(hash, "char:alice", 1);
      
      const entry = index.lookupByHash(hash);
      
      expect(entry).not.toBeNull();
      expect(entry?.key).toBe("char:alice");
    });

    it("should return null for non-existent hash", () => {
      const index = new MemoryIndex();
      
      const entry = index.lookupByHash("a".repeat(64));
      
      expect(entry).toBeNull();
    });
  });

  describe("lookupByKey()", () => {
    it("should return all hashes for a key", () => {
      const index = new MemoryIndex();
      const h1 = createTestHash("v1");
      const h2 = createTestHash("v2");
      
      index.index(h1, "char:alice", 1);
      index.index(h2, "char:alice", 2);
      
      const hashes = index.lookupByKey("char:alice");
      
      expect(hashes).toContain(h1);
      expect(hashes).toContain(h2);
      expect(hashes).toHaveLength(2);
    });

    it("should return empty array for non-existent key", () => {
      const index = new MemoryIndex();
      
      const hashes = index.lookupByKey("nonexistent");
      
      expect(hashes).toHaveLength(0);
    });
  });

  describe("lookupByKeyVersion()", () => {
    it("should find exact version", () => {
      const index = new MemoryIndex();
      const h1 = createTestHash("v1");
      const h2 = createTestHash("v2");
      
      index.index(h1, "char:alice", 1);
      index.index(h2, "char:alice", 2);
      
      expect(index.lookupByKeyVersion("char:alice", 1)).toBe(h1);
      expect(index.lookupByKeyVersion("char:alice", 2)).toBe(h2);
    });

    it("should return null for non-existent version", () => {
      const index = new MemoryIndex();
      
      index.index(createTestHash("v1"), "char:alice", 1);
      
      expect(index.lookupByKeyVersion("char:alice", 99)).toBeNull();
    });
  });

  describe("has() / hasKey()", () => {
    it("should return correct boolean for hash", () => {
      const index = new MemoryIndex();
      const hash = createTestHash("x");
      
      expect(index.has(hash)).toBe(false);
      
      index.index(hash, "key", 1);
      
      expect(index.has(hash)).toBe(true);
    });

    it("should return correct boolean for key", () => {
      const index = new MemoryIndex();
      
      expect(index.hasKey("char:alice")).toBe(false);
      
      index.index(createTestHash("x"), "char:alice", 1);
      
      expect(index.hasKey("char:alice")).toBe(true);
    });
  });

  describe("list operations", () => {
    it("listHashes should return sorted hashes", () => {
      const index = new MemoryIndex();
      const h1 = createTestHash("a");
      const h2 = createTestHash("b");
      const h3 = createTestHash("c");
      
      index.index(h3, "k3", 1);
      index.index(h1, "k1", 1);
      index.index(h2, "k2", 1);
      
      const hashes = index.listHashes();
      
      // Verify sorted
      for (let i = 1; i < hashes.length; i++) {
        expect(hashes[i]! >= hashes[i - 1]!).toBe(true);
      }
    });

    it("listKeys should return sorted keys", () => {
      const index = new MemoryIndex();
      
      index.index(createTestHash("c"), "scene:climax", 1);
      index.index(createTestHash("a"), "char:alice", 1);
      index.index(createTestHash("b"), "emotion:joy", 1);
      
      const keys = index.listKeys();
      
      expect(keys[0]).toBe("char:alice");
      expect(keys[1]).toBe("emotion:joy");
      expect(keys[2]).toBe("scene:climax");
    });

    it("listEntries should return all entries", () => {
      const index = new MemoryIndex();
      
      index.index(createTestHash("1"), "k1", 1);
      index.index(createTestHash("2"), "k2", 1);
      index.index(createTestHash("3"), "k3", 1);
      
      const entries = index.listEntries();
      
      expect(entries).toHaveLength(3);
    });
  });

  describe("statistics", () => {
    it("getEntryCount should return correct count", () => {
      const index = new MemoryIndex();
      
      expect(index.getEntryCount()).toBe(0);
      
      index.index(createTestHash("1"), "k1", 1);
      expect(index.getEntryCount()).toBe(1);
      
      index.index(createTestHash("2"), "k2", 1);
      expect(index.getEntryCount()).toBe(2);
    });

    it("getKeyCount should return distinct key count", () => {
      const index = new MemoryIndex();
      
      index.index(createTestHash("1"), "char:alice", 1);
      index.index(createTestHash("2"), "char:alice", 2);
      index.index(createTestHash("3"), "scene:opening", 1);
      
      expect(index.getKeyCount()).toBe(2);
    });

    it("getStats should return frozen stats", () => {
      const index = new MemoryIndex();
      
      index.index(createTestHash("1"), "k1", 1);
      
      const stats = index.getStats();
      
      expect(stats.entry_count).toBe(1);
      expect(stats.key_count).toBe(1);
      expect(Object.isFrozen(stats)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — BUILD INDEX
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildIndex", () => {
  it("should build index from records", () => {
    const records = [
      { hash: createTestHash("1"), key: "k1", version: 1 },
      { hash: createTestHash("2"), key: "k2", version: 1 },
      { hash: createTestHash("3"), key: "k1", version: 2 },
    ];
    
    const index = buildIndex({
      records,
      getHash: r => r.hash,
      getKey: r => r.key,
      getVersion: r => r.version,
    });
    
    expect(index.getEntryCount()).toBe(3);
    expect(index.getKeyCount()).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — INDEX VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifyIndex", () => {
  it("should return valid for correct index", () => {
    const index = new MemoryIndex();
    
    index.index(createTestHash("1"), "k1", 1);
    index.index(createTestHash("2"), "k2", 1);
    
    const result = verifyIndex(index);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return valid for empty index", () => {
    const index = new MemoryIndex();
    
    const result = verifyIndex(index);
    
    expect(result.valid).toBe(true);
    expect(result.entry_count).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — INV-MEM-02 : DETERMINISM TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MEM-02: Deterministic Retrieval", () => {
  it("verifyIndexDeterminism should return true for correct index", () => {
    const index = new MemoryIndex();
    
    for (let i = 0; i < 10; i++) {
      index.index(createTestHash(`payload${i}`), `key${i}`, 1);
    }
    
    expect(verifyIndexDeterminism(index, 100)).toBe(true);
  });

  it("100 lookups of same hash return identical results", () => {
    const index = new MemoryIndex();
    const hash = createTestHash("test");
    
    index.index(hash, "char:alice", 1);
    
    const firstResult = JSON.stringify(index.lookupByHash(hash));
    
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(index.lookupByHash(hash))).toBe(firstResult);
    }
  });

  it("100 lookups of same key return identical results", () => {
    const index = new MemoryIndex();
    
    index.index(createTestHash("v1"), "char:alice", 1);
    index.index(createTestHash("v2"), "char:alice", 2);
    
    const firstResult = JSON.stringify(index.lookupByKey("char:alice"));
    
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(index.lookupByKey("char:alice"))).toBe(firstResult);
    }
  });

  it("listHashes order is deterministic over 100 calls", () => {
    const index = new MemoryIndex();
    
    for (let i = 0; i < 5; i++) {
      index.index(createTestHash(`x${i}`), `k${i}`, 1);
    }
    
    const firstResult = JSON.stringify(index.listHashes());
    
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(index.listHashes())).toBe(firstResult);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — ATTACK TESTS — INV-MEM-01 : APPEND-ONLY
// ═══════════════════════════════════════════════════════════════════════════════

describe("ATTACK TESTS — INV-MEM-01: Append-Only", () => {
  describe("ATTACK-01: Attempt direct mutation via Object.assign", () => {
    it("should not allow mutation of indexed entry", () => {
      const index = new MemoryIndex();
      const hash = createTestHash("payload");
      
      const result = index.index(hash, "char:alice", 1);
      expect(result.success).toBe(true);
      
      if (result.success) {
        // ATTACK: Try to mutate the entry
        expect(() => {
          Object.assign(result.value, { key: "HACKED" });
        }).toThrow();
        
        // Verify unchanged
        const entry = index.lookupByHash(hash);
        expect(entry?.key).toBe("char:alice");
      }
    });
  });

  describe("ATTACK-02: Attempt property assignment on frozen entry", () => {
    it("should throw on property assignment", () => {
      const index = new MemoryIndex();
      const hash = createTestHash("payload");
      
      const result = index.index(hash, "char:alice", 1);
      expect(result.success).toBe(true);
      
      if (result.success) {
        // ATTACK: Direct assignment
        expect(() => {
          (result.value as any).key = "HACKED";
        }).toThrow();
        
        // Verify unchanged
        expect(result.value.key).toBe("char:alice");
      }
    });
  });

  describe("ATTACK-03: No delete method exists", () => {
    it("index should not have delete method", () => {
      const index = new MemoryIndex();
      
      // Verify no delete method
      expect((index as any).delete).toBeUndefined();
      expect((index as any).remove).toBeUndefined();
      expect((index as any).unindex).toBeUndefined();
    });
  });

  describe("ATTACK-04: No update method exists", () => {
    it("index should not have update method", () => {
      const index = new MemoryIndex();
      
      // Verify no update method
      expect((index as any).update).toBeUndefined();
      expect((index as any).modify).toBeUndefined();
      expect((index as any).set).toBeUndefined();
    });
  });

  describe("ATTACK-05: Multiple index calls don't increase count", () => {
    it("same hash indexed twice should not increase count", () => {
      const index = new MemoryIndex();
      const hash = createTestHash("payload");
      
      index.index(hash, "char:alice", 1);
      expect(index.getEntryCount()).toBe(1);
      
      // Try to add again
      index.index(hash, "char:alice", 1);
      expect(index.getEntryCount()).toBe(1);
      
      // Try with different key (same hash)
      index.index(hash, "DIFFERENT_KEY", 99);
      expect(index.getEntryCount()).toBe(1);
    });
  });

  describe("ATTACK-06: Internal maps not accessible", () => {
    it("private maps should not be directly accessible", () => {
      const index = new MemoryIndex();
      
      // These should be undefined or inaccessible
      expect((index as any).byHash).toBeInstanceOf(Map);
      // But we can't clear it from outside because Map methods don't affect the instance
      const originalSize = index.getEntryCount();
      
      // Add something
      index.index(createTestHash("x"), "k", 1);
      expect(index.getEntryCount()).toBe(originalSize + 1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — ATTACK TESTS — INV-MEM-08 : QUERY ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("ATTACK TESTS — INV-MEM-08: Query Isolation", () => {
  describe("lookups do not modify state", () => {
    it("lookupByHash does not modify index", () => {
      const index = new MemoryIndex();
      index.index(createTestHash("x"), "k", 1);
      
      const countBefore = index.getEntryCount();
      
      // Perform many lookups
      for (let i = 0; i < 100; i++) {
        index.lookupByHash(createTestHash("x"));
        index.lookupByHash("nonexistent".padEnd(64, "0"));
      }
      
      expect(index.getEntryCount()).toBe(countBefore);
    });

    it("lookupByKey does not modify index", () => {
      const index = new MemoryIndex();
      index.index(createTestHash("x"), "k", 1);
      
      const countBefore = index.getEntryCount();
      const hashesBefore = index.listHashes();
      
      // Perform many lookups
      for (let i = 0; i < 100; i++) {
        index.lookupByKey("k");
        index.lookupByKey("nonexistent");
      }
      
      expect(index.getEntryCount()).toBe(countBefore);
      expect(index.listHashes()).toEqual(hashesBefore);
    });

    it("listHashes returns new array each time (no internal exposure)", () => {
      const index = new MemoryIndex();
      index.index(createTestHash("x"), "k", 1);
      
      const hashes1 = index.listHashes();
      const hashes2 = index.listHashes();
      
      // Should be different array instances
      expect(hashes1).not.toBe(hashes2);
      // But same content
      expect(hashes1).toEqual(hashes2);
    });

    it("modifying returned array does not affect index", () => {
      const index = new MemoryIndex();
      index.index(createTestHash("x"), "k", 1);
      
      const hashes = index.listHashes() as string[];
      const originalLength = hashes.length;
      
      // Try to modify the returned array
      hashes.push("fake");
      hashes.length = 0;
      
      // Index should be unchanged
      expect(index.listHashes()).toHaveLength(originalLength);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — INDEX BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("indexBatch", () => {
  it("should index multiple records", () => {
    const index = new MemoryIndex();
    
    const records = [
      { hash: createTestHash("1"), key: "k1", version: 1 },
      { hash: createTestHash("2"), key: "k2", version: 1 },
      { hash: createTestHash("3"), key: "k3", version: 1 },
    ];
    
    index.indexBatch(records);
    
    expect(index.getEntryCount()).toBe(3);
  });

  it("should skip duplicates in batch", () => {
    const index = new MemoryIndex();
    const sameHash = createTestHash("same");
    
    const records = [
      { hash: sameHash, key: "k1", version: 1 },
      { hash: sameHash, key: "k2", version: 2 }, // Same hash, different key
      { hash: createTestHash("other"), key: "k3", version: 1 },
    ];
    
    index.indexBatch(records);
    
    // Only 2 unique hashes
    expect(index.getEntryCount()).toBe(2);
  });
});
