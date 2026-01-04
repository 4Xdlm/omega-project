/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * snapshot_context.test.ts — Tests Read-Only Snapshot Access
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * INVARIANTS TESTÉS :
 *   INV-CRE-01 : Snapshot-Only (lecture seule)
 *   INV-CRE-06 : Template Purity (données gelées)
 *   INV-CRE-11 : Source Verification
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  deepFreeze,
  isDeepFrozen,
  createReadOnlyContext,
  verifySource,
  verifySources,
  requireValidSources,
  createSourceRef,
  MockSnapshotProvider,
} from "./snapshot_context.js";
import type { SnapshotEntry, SourceRef } from "./creation_types.js";
import { isCreationError } from "./creation_errors.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — DEEP FREEZE
// ═══════════════════════════════════════════════════════════════════════════════

describe("deepFreeze", () => {
  it("should freeze primitives (no-op)", () => {
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze("hello")).toBe("hello");
    expect(deepFreeze(true)).toBe(true);
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(undefined)).toBe(undefined);
  });

  it("should freeze simple object", () => {
    const obj = { a: 1, b: 2 };
    const frozen = deepFreeze(obj);
    
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(frozen).toBe(obj); // Same reference
  });

  it("should freeze nested objects", () => {
    const obj = { a: { b: { c: 1 } } };
    const frozen = deepFreeze(obj);
    
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.a)).toBe(true);
    expect(Object.isFrozen(frozen.a.b)).toBe(true);
  });

  it("should freeze arrays", () => {
    const arr = [1, 2, { a: 3 }];
    const frozen = deepFreeze(arr);
    
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen[2])).toBe(true);
  });

  it("should freeze nested arrays", () => {
    const arr = [[1, 2], [3, { a: 4 }]];
    const frozen = deepFreeze(arr);
    
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen[0])).toBe(true);
    expect(Object.isFrozen(frozen[1])).toBe(true);
    expect(Object.isFrozen(frozen[1]![1])).toBe(true);
  });

  it("should skip already frozen objects", () => {
    const inner = Object.freeze({ a: 1 });
    const obj = { inner };
    const frozen = deepFreeze(obj);
    
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(frozen.inner).toBe(inner);
  });

  it("should prevent mutation in strict mode — INV-CRE-06", () => {
    "use strict";
    const obj = deepFreeze({ a: 1, b: { c: 2 } });
    
    expect(() => {
      (obj as Record<string, unknown>).a = 999;
    }).toThrow(TypeError);
    
    expect(() => {
      (obj.b as Record<string, unknown>).c = 999;
    }).toThrow(TypeError);
  });
});

describe("isDeepFrozen", () => {
  it("should return true for primitives", () => {
    expect(isDeepFrozen(42)).toBe(true);
    expect(isDeepFrozen("hello")).toBe(true);
    expect(isDeepFrozen(null)).toBe(true);
    expect(isDeepFrozen(undefined)).toBe(true);
  });

  it("should return false for unfrozen object", () => {
    expect(isDeepFrozen({ a: 1 })).toBe(false);
  });

  it("should return false for shallow frozen with unfrozen nested", () => {
    const obj = Object.freeze({ a: { b: 1 } });
    expect(isDeepFrozen(obj)).toBe(false);
  });

  it("should return true for deep frozen object", () => {
    const obj = deepFreeze({ a: { b: 1 } });
    expect(isDeepFrozen(obj)).toBe(true);
  });

  it("should return true for deep frozen array", () => {
    const arr = deepFreeze([1, { a: 2 }, [3, 4]]);
    expect(isDeepFrozen(arr)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — MOCK SNAPSHOT PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

describe("MockSnapshotProvider", () => {
  let provider: MockSnapshotProvider;
  
  beforeEach(() => {
    provider = new MockSnapshotProvider();
  });

  it("should add snapshot", () => {
    provider.addSnapshot("snap1", "abc123");
    expect(provider.hasSnapshot("snap1")).toBe(true);
    expect(provider.hasSnapshot("snap2")).toBe(false);
  });

  it("should return root hash", () => {
    provider.addSnapshot("snap1", "abc123");
    expect(provider.getSnapshotRootHash("snap1")).toBe("abc123");
    expect(provider.getSnapshotRootHash("nonexistent")).toBe(null);
  });

  it("should add and retrieve entries", () => {
    provider.addSnapshot("snap1", "root");
    provider.addEntry("snap1", {
      key: "char:alice",
      version: 1,
      payload: { name: "Alice" },
      hash: "a".repeat(64),
      created_at_utc: "2026-01-01T00:00:00Z",
    });
    
    const entry = provider.getLatestEntry("snap1", "char:alice");
    expect(entry).not.toBeNull();
    expect(entry?.payload).toEqual({ name: "Alice" });
  });

  it("should handle multiple versions", () => {
    provider.addSnapshot("snap1", "root");
    provider.addEntry("snap1", {
      key: "char:alice",
      version: 1,
      payload: { name: "Alice v1" },
      hash: "a".repeat(64),
      created_at_utc: "2026-01-01T00:00:00Z",
    });
    provider.addEntry("snap1", {
      key: "char:alice",
      version: 2,
      payload: { name: "Alice v2" },
      hash: "b".repeat(64),
      created_at_utc: "2026-01-02T00:00:00Z",
    });
    
    expect(provider.getEntryByVersion("snap1", "char:alice", 1)?.payload)
      .toEqual({ name: "Alice v1" });
    expect(provider.getEntryByVersion("snap1", "char:alice", 2)?.payload)
      .toEqual({ name: "Alice v2" });
    expect(provider.getLatestEntry("snap1", "char:alice")?.payload)
      .toEqual({ name: "Alice v2" });
  });

  it("should list keys", () => {
    provider.addSnapshot("snap1", "root");
    provider.addEntry("snap1", {
      key: "char:alice",
      version: 1,
      payload: {},
      hash: "a".repeat(64),
      created_at_utc: "2026-01-01T00:00:00Z",
    });
    provider.addEntry("snap1", {
      key: "char:bob",
      version: 1,
      payload: {},
      hash: "b".repeat(64),
      created_at_utc: "2026-01-01T00:00:00Z",
    });
    
    const keys = provider.listKeys("snap1");
    expect(keys).toContain("char:alice");
    expect(keys).toContain("char:bob");
    expect(keys).toHaveLength(2);
  });

  it("should check key existence", () => {
    provider.addSnapshot("snap1", "root");
    provider.addEntry("snap1", {
      key: "char:alice",
      version: 1,
      payload: {},
      hash: "a".repeat(64),
      created_at_utc: "2026-01-01T00:00:00Z",
    });
    
    expect(provider.hasKey("snap1", "char:alice")).toBe(true);
    expect(provider.hasKey("snap1", "char:bob")).toBe(false);
  });

  it("should throw when adding entry to non-existent snapshot", () => {
    expect(() => {
      provider.addEntry("nonexistent", {
        key: "test",
        version: 1,
        payload: {},
        hash: "a".repeat(64),
        created_at_utc: "2026-01-01T00:00:00Z",
      });
    }).toThrow("Snapshot not found");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — READ-ONLY CONTEXT — INV-CRE-01
// ═══════════════════════════════════════════════════════════════════════════════

describe("createReadOnlyContext — INV-CRE-01", () => {
  let provider: MockSnapshotProvider;
  
  beforeEach(() => {
    provider = new MockSnapshotProvider();
    provider.addSnapshot("snap1", "roothash123".padEnd(64, "0"));
    provider.addEntry("snap1", {
      key: "char:alice",
      version: 1,
      payload: { name: "Alice", age: 25 },
      hash: "a".repeat(64),
      created_at_utc: "2026-01-01T00:00:00Z",
    });
    provider.addEntry("snap1", {
      key: "char:alice",
      version: 2,
      payload: { name: "Alice", age: 26 },
      hash: "b".repeat(64),
      created_at_utc: "2026-01-02T00:00:00Z",
    });
  });

  it("should create context for existing snapshot", () => {
    const ctx = createReadOnlyContext(provider, "snap1");
    expect(ctx.snapshotId).toBe("snap1");
    expect(ctx.snapshotRootHash).toBe("roothash123".padEnd(64, "0"));
  });

  it("should throw for non-existent snapshot", () => {
    expect(() => createReadOnlyContext(provider, "nonexistent"))
      .toThrow();
  });

  it("should throw for snapshot without root hash", () => {
    // Create a provider with a snapshot that has no root hash
    const badProvider = {
      hasSnapshot: () => true,
      getSnapshotRootHash: () => null,
    } as any;
    
    expect(() => createReadOnlyContext(badProvider, "snap1"))
      .toThrow("invalid");
  });

  it("should freeze the context itself", () => {
    const ctx = createReadOnlyContext(provider, "snap1");
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  describe("getByVersion", () => {
    it("should return frozen entry", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      const entry = ctx.getByVersion("char:alice", 1);
      
      expect(entry).not.toBeNull();
      expect(entry?.payload).toEqual({ name: "Alice", age: 25 });
      expect(isDeepFrozen(entry)).toBe(true);
    });

    it("should return null for non-existent version", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      expect(ctx.getByVersion("char:alice", 99)).toBeNull();
    });

    it("should validate key", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      expect(() => ctx.getByVersion("", 1)).toThrow("empty");
      expect(() => ctx.getByVersion("a".repeat(300), 1)).toThrow("too long");
    });

    it("should validate version", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      expect(() => ctx.getByVersion("char:alice", 0)).toThrow(">= 1");
      expect(() => ctx.getByVersion("char:alice", -1)).toThrow(">= 1");
      expect(() => ctx.getByVersion("char:alice", 1.5)).toThrow("integer");
    });
  });

  describe("getLatest", () => {
    it("should return latest frozen entry", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      const entry = ctx.getLatest("char:alice");
      
      expect(entry?.version).toBe(2);
      expect(entry?.payload).toEqual({ name: "Alice", age: 26 });
      expect(isDeepFrozen(entry)).toBe(true);
    });

    it("should return null for non-existent key", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      expect(ctx.getLatest("nonexistent")).toBeNull();
    });
  });

  describe("getHistory", () => {
    it("should return frozen history array", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      const history = ctx.getHistory("char:alice");
      
      expect(history).toHaveLength(2);
      expect(history[0]?.version).toBe(1);
      expect(history[1]?.version).toBe(2);
      expect(isDeepFrozen(history)).toBe(true);
    });

    it("should return empty array for non-existent key", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      expect(ctx.getHistory("nonexistent")).toEqual([]);
    });
  });

  describe("listKeys", () => {
    it("should return frozen keys array", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      const keys = ctx.listKeys();
      
      expect(keys).toContain("char:alice");
      expect(Object.isFrozen(keys)).toBe(true);
    });
  });

  describe("hasKey", () => {
    it("should return true for existing key", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      expect(ctx.hasKey("char:alice")).toBe(true);
    });

    it("should return false for non-existent key", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      expect(ctx.hasKey("nonexistent")).toBe(false);
    });
  });

  describe("data isolation — INV-CRE-06", () => {
    it("should not share references with provider", () => {
      const ctx = createReadOnlyContext(provider, "snap1");
      const entry1 = ctx.getLatest("char:alice");
      const entry2 = ctx.getLatest("char:alice");
      
      // Different clones
      expect(entry1).not.toBe(entry2);
      // But same content
      expect(entry1).toEqual(entry2);
    });

    it("should not allow mutation of returned data", () => {
      "use strict";
      const ctx = createReadOnlyContext(provider, "snap1");
      const entry = ctx.getLatest("char:alice");
      
      expect(() => {
        (entry as any).version = 999;
      }).toThrow(TypeError);
      
      expect(() => {
        (entry?.payload as any).name = "Hacked";
      }).toThrow(TypeError);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — SOURCE VERIFICATION — INV-CRE-11
// ═══════════════════════════════════════════════════════════════════════════════

describe("verifySource — INV-CRE-11", () => {
  let provider: MockSnapshotProvider;
  let ctx: ReturnType<typeof createReadOnlyContext>;
  
  const validEntry: SnapshotEntry = {
    key: "char:alice",
    version: 1,
    payload: { name: "Alice" },
    hash: "a".repeat(64),
    created_at_utc: "2026-01-01T00:00:00Z",
  };
  
  beforeEach(() => {
    provider = new MockSnapshotProvider();
    provider.addSnapshot("snap1", "root".padEnd(64, "0"));
    provider.addEntry("snap1", validEntry);
    ctx = createReadOnlyContext(provider, "snap1");
  });

  it("should return valid for matching source", () => {
    const sourceRef: SourceRef = {
      key: "char:alice",
      version: 1,
      entry_hash: "a".repeat(64),
    };
    
    const result = verifySource(ctx, sourceRef);
    
    expect(result.valid).toBe(true);
    expect(result.entry).toBeDefined();
    expect(result.entry?.payload).toEqual({ name: "Alice" });
  });

  it("should return invalid for non-existent source", () => {
    const sourceRef: SourceRef = {
      key: "char:bob",
      version: 1,
      entry_hash: "b".repeat(64),
    };
    
    const result = verifySource(ctx, sourceRef);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("should return invalid for hash mismatch", () => {
    const sourceRef: SourceRef = {
      key: "char:alice",
      version: 1,
      entry_hash: "wronghash".padEnd(64, "0"),
    };
    
    const result = verifySource(ctx, sourceRef);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain("mismatch");
  });

  it("should return invalid for wrong version", () => {
    const sourceRef: SourceRef = {
      key: "char:alice",
      version: 99,
      entry_hash: "a".repeat(64),
    };
    
    const result = verifySource(ctx, sourceRef);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not found");
  });
});

describe("verifySources", () => {
  let provider: MockSnapshotProvider;
  let ctx: ReturnType<typeof createReadOnlyContext>;
  
  beforeEach(() => {
    provider = new MockSnapshotProvider();
    provider.addSnapshot("snap1", "root".padEnd(64, "0"));
    provider.addEntry("snap1", {
      key: "char:alice",
      version: 1,
      payload: { name: "Alice" },
      hash: "a".repeat(64),
      created_at_utc: "2026-01-01T00:00:00Z",
    });
    provider.addEntry("snap1", {
      key: "char:bob",
      version: 1,
      payload: { name: "Bob" },
      hash: "b".repeat(64),
      created_at_utc: "2026-01-01T00:00:00Z",
    });
    ctx = createReadOnlyContext(provider, "snap1");
  });

  it("should verify multiple sources", () => {
    const sourceRefs: SourceRef[] = [
      { key: "char:alice", version: 1, entry_hash: "a".repeat(64) },
      { key: "char:bob", version: 1, entry_hash: "b".repeat(64) },
    ];
    
    const results = verifySources(ctx, sourceRefs);
    
    expect(results).toHaveLength(2);
    expect(results[0]?.valid).toBe(true);
    expect(results[1]?.valid).toBe(true);
  });

  it("should return mixed results", () => {
    const sourceRefs: SourceRef[] = [
      { key: "char:alice", version: 1, entry_hash: "a".repeat(64) },
      { key: "char:charlie", version: 1, entry_hash: "c".repeat(64) },
    ];
    
    const results = verifySources(ctx, sourceRefs);
    
    expect(results[0]?.valid).toBe(true);
    expect(results[1]?.valid).toBe(false);
  });
});

describe("requireValidSources", () => {
  let provider: MockSnapshotProvider;
  let ctx: ReturnType<typeof createReadOnlyContext>;
  
  beforeEach(() => {
    provider = new MockSnapshotProvider();
    provider.addSnapshot("snap1", "root".padEnd(64, "0"));
    provider.addEntry("snap1", {
      key: "char:alice",
      version: 1,
      payload: { name: "Alice" },
      hash: "a".repeat(64),
      created_at_utc: "2026-01-01T00:00:00Z",
    });
    ctx = createReadOnlyContext(provider, "snap1");
  });

  it("should not throw for valid sources", () => {
    const sourceRefs: SourceRef[] = [
      { key: "char:alice", version: 1, entry_hash: "a".repeat(64) },
    ];
    
    expect(() => requireValidSources(ctx, sourceRefs)).not.toThrow();
  });

  it("should throw SOURCE_NOT_FOUND for missing source", () => {
    const sourceRefs: SourceRef[] = [
      { key: "char:bob", version: 1, entry_hash: "b".repeat(64) },
    ];
    
    try {
      requireValidSources(ctx, sourceRefs);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(isCreationError(e)).toBe(true);
      if (isCreationError(e)) {
        expect(e.code).toBe("SOURCE_NOT_FOUND");
      }
    }
  });

  it("should throw SOURCE_HASH_MISMATCH for wrong hash", () => {
    const sourceRefs: SourceRef[] = [
      { key: "char:alice", version: 1, entry_hash: "wrong".padEnd(64, "0") },
    ];
    
    try {
      requireValidSources(ctx, sourceRefs);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(isCreationError(e)).toBe(true);
      if (isCreationError(e)) {
        expect(e.code).toBe("SOURCE_HASH_MISMATCH");
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — SOURCE REF BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

describe("createSourceRef", () => {
  const entry: SnapshotEntry = {
    key: "char:alice",
    version: 1,
    payload: { name: "Alice" },
    hash: "a".repeat(64),
    created_at_utc: "2026-01-01T00:00:00Z",
  };

  it("should create frozen SourceRef", () => {
    const ref = createSourceRef(entry);
    
    expect(ref.key).toBe("char:alice");
    expect(ref.version).toBe(1);
    expect(ref.entry_hash).toBe("a".repeat(64));
    expect(Object.isFrozen(ref)).toBe(true);
  });

  it("should not include fields_used if not provided", () => {
    const ref = createSourceRef(entry);
    expect(ref.fields_used).toBeUndefined();
  });

  it("should include frozen fields_used if provided", () => {
    const ref = createSourceRef(entry, ["name", "age"]);
    
    expect(ref.fields_used).toEqual(["name", "age"]);
    expect(Object.isFrozen(ref.fields_used)).toBe(true);
  });

  it("should not include fields_used if empty array", () => {
    const ref = createSourceRef(entry, []);
    expect(ref.fields_used).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — NO WRITE AUTHORITY PROOF
// ═══════════════════════════════════════════════════════════════════════════════

describe("No Write Authority — structural proof", () => {
  it("ReadOnlySnapshotContext has no write methods", () => {
    const provider = new MockSnapshotProvider();
    provider.addSnapshot("snap1", "root".padEnd(64, "0"));
    const ctx = createReadOnlyContext(provider, "snap1");
    
    // Verify no write methods exist
    const methods = Object.keys(ctx).filter(k => typeof (ctx as any)[k] === "function");
    const readMethods = ["getByVersion", "getLatest", "getHistory", "listKeys", "hasKey"];
    
    // All methods should be read-only
    for (const method of methods) {
      expect(readMethods).toContain(method);
    }
    
    // No write methods
    expect(methods).not.toContain("write");
    expect(methods).not.toContain("set");
    expect(methods).not.toContain("put");
    expect(methods).not.toContain("delete");
    expect(methods).not.toContain("update");
    expect(methods).not.toContain("append");
  });

  it("SnapshotProvider interface has no write methods", () => {
    const provider = new MockSnapshotProvider();
    
    // The interface methods (check they're all read-only by name)
    const readOnlyMethods = [
      "hasSnapshot",
      "getSnapshotRootHash",
      "getEntryByVersion",
      "getLatestEntry",
      "getEntryHistory",
      "listKeys",
      "hasKey",
    ];
    
    for (const method of readOnlyMethods) {
      expect(typeof (provider as any)[method]).toBe("function");
    }
    
    // addSnapshot and addEntry are only on MockSnapshotProvider, not the interface
    // This is for test setup only
  });
});
