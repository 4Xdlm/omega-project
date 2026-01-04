/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — MEMORY_LAYER
 * memory_query.test.ts — Tests Query + Determinism + Isolation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PHASE       : 10C
 * 
 * INVARIANTS TESTÉS :
 *   INV-MEM-02 : Deterministic Retrieval (100 runs)
 *   INV-MEM-08 : Query Isolation (snapshot hash unchanged)
 *   INV-MEM-10 : Bounded Queries (timeout soft)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  QueryEngine,
  createSnapshot,
  sortRecordsCanonical,
  canonicalRecordCompare,
  canonicalStringCompare,
  computeResultHash,
  verifySnapshotUnchanged,
  verifyQueryDeterminism,
  type QueryableRecord,
  type StoreSnapshot,
  type QueryOptions,
  DEFAULT_QUERY_CONFIG,
} from "./memory_query.js";
import { sha256Value } from "./memory_hash.js";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createTestRecord(
  key: string,
  version: number,
  payload: unknown = {}
): QueryableRecord {
  const payloadHash = sha256Value(payload);
  const recordHash = sha256Value({ key, version, payload });
  
  return Object.freeze({
    key,
    version,
    record_hash: recordHash,
    payload_hash: payloadHash,
    created_at_utc: "2026-01-04T12:00:00.000Z",
    payload,
  });
}

function createTestSnapshot(
  records: QueryableRecord[]
): StoreSnapshot<QueryableRecord> {
  const snapshotHash = sha256Value(records.map(r => r.record_hash).join(','));
  return createSnapshot(records, snapshotHash, "2026-01-04T12:00:00.000Z");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CANONICAL SORTING
// ═══════════════════════════════════════════════════════════════════════════════

describe("Canonical Sorting", () => {
  describe("canonicalRecordCompare", () => {
    it("should sort by key first", () => {
      const a = createTestRecord("alpha", 1);
      const b = createTestRecord("beta", 1);
      
      expect(canonicalRecordCompare(a, b)).toBeLessThan(0);
      expect(canonicalRecordCompare(b, a)).toBeGreaterThan(0);
    });

    it("should sort by version second", () => {
      const a = createTestRecord("char:alice", 1);
      const b = createTestRecord("char:alice", 2);
      
      expect(canonicalRecordCompare(a, b)).toBeLessThan(0);
      expect(canonicalRecordCompare(b, a)).toBeGreaterThan(0);
    });

    it("should sort by hash third (tiebreaker)", () => {
      const a = createTestRecord("char:alice", 1, { data: "a" });
      const b = createTestRecord("char:alice", 1, { data: "b" });
      
      // Different payloads = different hashes = one will be < other
      const result = canonicalRecordCompare(a, b);
      expect(result).not.toBe(0);
    });

    it("should return 0 for identical records", () => {
      const a = createTestRecord("char:alice", 1);
      const b = createTestRecord("char:alice", 1);
      
      // Same key, version, payload = same hash = 0
      expect(canonicalRecordCompare(a, b)).toBe(0);
    });
  });

  describe("sortRecordsCanonical", () => {
    it("should sort records in canonical order", () => {
      const records = [
        createTestRecord("char:charlie", 1),
        createTestRecord("char:alice", 2),
        createTestRecord("char:bob", 1),
        createTestRecord("char:alice", 1),
      ];
      
      const sorted = sortRecordsCanonical(records);
      
      expect(sorted[0].key).toBe("char:alice");
      expect(sorted[0].version).toBe(1);
      expect(sorted[1].key).toBe("char:alice");
      expect(sorted[1].version).toBe(2);
      expect(sorted[2].key).toBe("char:bob");
      expect(sorted[3].key).toBe("char:charlie");
    });

    it("should not mutate original array", () => {
      const original = [
        createTestRecord("z", 1),
        createTestRecord("a", 1),
      ];
      const originalFirstKey = original[0].key;
      
      sortRecordsCanonical(original);
      
      expect(original[0].key).toBe(originalFirstKey);
    });

    it("should be deterministic over 100 runs", () => {
      const records = [
        createTestRecord("char:charlie", 1),
        createTestRecord("char:alice", 2),
        createTestRecord("char:bob", 1),
      ];
      
      const firstResult = JSON.stringify(sortRecordsCanonical(records));
      
      for (let i = 0; i < 100; i++) {
        expect(JSON.stringify(sortRecordsCanonical(records))).toBe(firstResult);
      }
    });
  });

  describe("canonicalStringCompare", () => {
    it("should compare strings correctly", () => {
      expect(canonicalStringCompare("a", "b")).toBeLessThan(0);
      expect(canonicalStringCompare("b", "a")).toBeGreaterThan(0);
      expect(canonicalStringCompare("a", "a")).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — QUERY ENGINE BASIC
// ═══════════════════════════════════════════════════════════════════════════════

describe("QueryEngine", () => {
  let engine: QueryEngine<QueryableRecord>;
  let snapshot: StoreSnapshot<QueryableRecord>;

  beforeEach(() => {
    engine = new QueryEngine();
    snapshot = createTestSnapshot([
      createTestRecord("char:alice", 1, { name: "Alice v1" }),
      createTestRecord("char:alice", 2, { name: "Alice v2" }),
      createTestRecord("char:alice", 3, { name: "Alice v3" }),
      createTestRecord("char:bob", 1, { name: "Bob v1" }),
      createTestRecord("scene:opening", 1, { title: "Opening" }),
      createTestRecord("scene:climax", 1, { title: "Climax" }),
    ]);
  });

  describe("getLatest()", () => {
    it("should return latest version", () => {
      const latest = engine.getLatest(snapshot, "char:alice");
      
      expect(latest).not.toBeNull();
      expect(latest?.version).toBe(3);
      expect((latest?.payload as any).name).toBe("Alice v3");
    });

    it("should return null for non-existent key", () => {
      const latest = engine.getLatest(snapshot, "nonexistent");
      expect(latest).toBeNull();
    });
  });

  describe("getByVersion()", () => {
    it("should return specific version", () => {
      const v2 = engine.getByVersion(snapshot, "char:alice", 2);
      
      expect(v2).not.toBeNull();
      expect(v2?.version).toBe(2);
      expect((v2?.payload as any).name).toBe("Alice v2");
    });

    it("should return null for invalid version", () => {
      expect(engine.getByVersion(snapshot, "char:alice", 0)).toBeNull();
      expect(engine.getByVersion(snapshot, "char:alice", 99)).toBeNull();
    });
  });

  describe("getByHash()", () => {
    it("should find record by hash", () => {
      const alice = engine.getLatest(snapshot, "char:alice");
      expect(alice).not.toBeNull();
      
      const found = engine.getByHash(snapshot, alice!.record_hash);
      
      expect(found).not.toBeNull();
      expect(found?.key).toBe("char:alice");
      expect(found?.version).toBe(3);
    });

    it("should return null for non-existent hash", () => {
      const found = engine.getByHash(snapshot, "0".repeat(64));
      expect(found).toBeNull();
    });
  });

  describe("getHistory()", () => {
    it("should return all versions in order", () => {
      const history = engine.getHistory(snapshot, "char:alice");
      
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(1);
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(3);
    });

    it("should return empty array for non-existent key", () => {
      const history = engine.getHistory(snapshot, "nonexistent");
      expect(history).toHaveLength(0);
    });

    it("should return a copy (not internal reference)", () => {
      const history1 = engine.getHistory(snapshot, "char:alice");
      const history2 = engine.getHistory(snapshot, "char:alice");
      
      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe("listKeysSorted()", () => {
    it("should return sorted keys", () => {
      const keys = engine.listKeysSorted(snapshot);
      
      expect(keys).toEqual([
        "char:alice",
        "char:bob",
        "scene:climax",
        "scene:opening",
      ]);
    });
  });

  describe("listByPrefix()", () => {
    it("should filter by prefix", () => {
      const result = engine.listByPrefix(snapshot, "char:");
      
      expect(result.total_count).toBe(4); // 3 alice + 1 bob
      expect(result.records.every(r => r.key.startsWith("char:"))).toBe(true);
    });

    it("should return results sorted canonically", () => {
      const result = engine.listByPrefix(snapshot, "");
      
      // Verify sorted by key, then version
      for (let i = 1; i < result.records.length; i++) {
        const cmp = canonicalRecordCompare(result.records[i - 1], result.records[i]);
        expect(cmp).toBeLessThanOrEqual(0);
      }
    });

    it("should apply version filters", () => {
      const result = engine.listByPrefix(snapshot, "char:alice", {
        min_version: 2,
        max_version: 2,
      });
      
      expect(result.total_count).toBe(1);
      expect(result.records[0].version).toBe(2);
    });

    it("should apply pagination", () => {
      const result = engine.listByPrefix(snapshot, "", {
        limit: 2,
        offset: 1,
      });
      
      expect(result.records).toHaveLength(2);
      expect(result.truncated).toBe(true);
    });
  });

  describe("listAll()", () => {
    it("should return all records sorted", () => {
      const result = engine.listAll(snapshot);
      
      expect(result.total_count).toBe(6);
      expect(result.records).toHaveLength(6);
    });
  });

  describe("listLatestVersions()", () => {
    it("should return only latest version of each key", () => {
      const result = engine.listLatestVersions(snapshot);
      
      expect(result.total_count).toBe(4); // 4 unique keys
      
      const alice = result.records.find(r => r.key === "char:alice");
      expect(alice?.version).toBe(3);
    });
  });

  describe("getStats()", () => {
    it("should return correct stats", () => {
      const stats = engine.getStats(snapshot);
      
      expect(stats.key_count).toBe(4);
      expect(stats.total_versions).toBe(6);
      expect(stats.snapshot_hash).toBe(snapshot.snapshot_hash);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — INV-MEM-02: DETERMINISM (100 RUNS)
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MEM-02: Deterministic Retrieval", () => {
  let engine: QueryEngine<QueryableRecord>;
  let snapshot: StoreSnapshot<QueryableRecord>;

  beforeEach(() => {
    engine = new QueryEngine();
    
    // Create records in RANDOM order to stress test determinism
    const records = [
      createTestRecord("z:last", 1),
      createTestRecord("a:first", 1),
      createTestRecord("m:middle", 2),
      createTestRecord("m:middle", 1),
      createTestRecord("char:alice", 3),
      createTestRecord("char:alice", 1),
      createTestRecord("char:alice", 2),
    ];
    
    snapshot = createTestSnapshot(records);
  });

  it("getLatest is deterministic over 100 runs", () => {
    const firstResult = JSON.stringify(engine.getLatest(snapshot, "char:alice"));
    
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(engine.getLatest(snapshot, "char:alice"))).toBe(firstResult);
    }
  });

  it("getByVersion is deterministic over 100 runs", () => {
    const firstResult = JSON.stringify(engine.getByVersion(snapshot, "char:alice", 2));
    
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(engine.getByVersion(snapshot, "char:alice", 2))).toBe(firstResult);
    }
  });

  it("getHistory is deterministic over 100 runs", () => {
    const firstResult = JSON.stringify(engine.getHistory(snapshot, "char:alice"));
    
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(engine.getHistory(snapshot, "char:alice"))).toBe(firstResult);
    }
  });

  it("listKeysSorted is deterministic over 100 runs", () => {
    const firstResult = JSON.stringify(engine.listKeysSorted(snapshot));
    
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(engine.listKeysSorted(snapshot))).toBe(firstResult);
    }
  });

  it("listByPrefix is deterministic over 100 runs", () => {
    const firstResult = JSON.stringify(engine.listByPrefix(snapshot, "char:"));
    
    for (let i = 0; i < 100; i++) {
      const result = engine.listByPrefix(snapshot, "char:");
      expect(result.result_hash).toBe(JSON.parse(firstResult).result_hash);
    }
  });

  it("listAll is deterministic over 100 runs", () => {
    const firstResult = engine.listAll(snapshot);
    
    for (let i = 0; i < 100; i++) {
      const result = engine.listAll(snapshot);
      expect(result.result_hash).toBe(firstResult.result_hash);
    }
  });

  it("listLatestVersions is deterministic over 100 runs", () => {
    const firstResult = engine.listLatestVersions(snapshot);
    
    for (let i = 0; i < 100; i++) {
      const result = engine.listLatestVersions(snapshot);
      expect(result.result_hash).toBe(firstResult.result_hash);
    }
  });

  it("verifyQueryDeterminism utility works", () => {
    const isDeterministic = verifyQueryDeterminism(
      () => engine.listAll(snapshot),
      (r) => r.result_hash,
      100
    );
    
    expect(isDeterministic).toBe(true);
  });

  it("dataset inserted in random order produces same final result", () => {
    // Create same records but in different insertion orders
    const recordsOrder1 = [
      createTestRecord("a", 1),
      createTestRecord("b", 1),
      createTestRecord("c", 1),
    ];
    
    const recordsOrder2 = [
      createTestRecord("c", 1),
      createTestRecord("a", 1),
      createTestRecord("b", 1),
    ];
    
    const snapshot1 = createTestSnapshot(recordsOrder1);
    const snapshot2 = createTestSnapshot(recordsOrder2);
    
    const result1 = engine.listAll(snapshot1);
    const result2 = engine.listAll(snapshot2);
    
    // Same records = same result hash
    expect(result1.result_hash).toBe(result2.result_hash);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — INV-MEM-08: QUERY ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MEM-08: Query Isolation", () => {
  let engine: QueryEngine<QueryableRecord>;
  let snapshot: StoreSnapshot<QueryableRecord>;

  beforeEach(() => {
    engine = new QueryEngine();
    snapshot = createTestSnapshot([
      createTestRecord("char:alice", 1),
      createTestRecord("char:alice", 2),
      createTestRecord("char:bob", 1),
    ]);
  });

  it("snapshot hash unchanged after getLatest", () => {
    const hashBefore = snapshot.snapshot_hash;
    
    engine.getLatest(snapshot, "char:alice");
    
    expect(snapshot.snapshot_hash).toBe(hashBefore);
  });

  it("snapshot hash unchanged after getHistory", () => {
    const hashBefore = snapshot.snapshot_hash;
    
    engine.getHistory(snapshot, "char:alice");
    
    expect(snapshot.snapshot_hash).toBe(hashBefore);
  });

  it("snapshot hash unchanged after listAll", () => {
    const hashBefore = snapshot.snapshot_hash;
    
    engine.listAll(snapshot);
    
    expect(snapshot.snapshot_hash).toBe(hashBefore);
  });

  it("snapshot hash unchanged after listByPrefix", () => {
    const hashBefore = snapshot.snapshot_hash;
    
    engine.listByPrefix(snapshot, "char:");
    
    expect(snapshot.snapshot_hash).toBe(hashBefore);
  });

  it("snapshot hash unchanged after 100 queries", () => {
    const hashBefore = snapshot.snapshot_hash;
    
    for (let i = 0; i < 100; i++) {
      engine.getLatest(snapshot, "char:alice");
      engine.getHistory(snapshot, "char:bob");
      engine.listAll(snapshot);
      engine.listByPrefix(snapshot, "scene:");
    }
    
    expect(snapshot.snapshot_hash).toBe(hashBefore);
  });

  it("verifySnapshotUnchanged returns true when unchanged", () => {
    const snapshotCopy = { ...snapshot };
    
    engine.listAll(snapshot);
    
    expect(verifySnapshotUnchanged(snapshotCopy, snapshot)).toBe(true);
  });

  it("query results are frozen", () => {
    const result = engine.listAll(snapshot);
    
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.records)).toBe(true);
  });

  it("modifying returned records does not affect snapshot", () => {
    const history = engine.getHistory(snapshot, "char:alice");
    const originalLength = history.length;
    
    // Try to modify (should fail or not affect original)
    const mutableHistory = history as unknown[];
    try {
      mutableHistory.push({} as any);
    } catch {
      // Expected if frozen
    }
    
    // Original should be unchanged
    const historyAgain = engine.getHistory(snapshot, "char:alice");
    expect(historyAgain.length).toBe(originalLength);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — INV-MEM-10: BOUNDED QUERIES (TIMEOUT)
// ═══════════════════════════════════════════════════════════════════════════════

describe("INV-MEM-10: Bounded Queries (Timeout)", () => {
  let engine: QueryEngine<QueryableRecord>;
  let snapshot: StoreSnapshot<QueryableRecord>;

  beforeEach(() => {
    engine = new QueryEngine({ default_timeout_ms: 100 });
    snapshot = createTestSnapshot([
      createTestRecord("char:alice", 1),
    ]);
  });

  it("fast query completes within timeout", async () => {
    const result = await engine.withTimeout(
      () => engine.listAll(snapshot),
      1000
    );
    
    expect(result.success).toBe(true);
  });

  it("timeout is configurable", async () => {
    const customEngine = new QueryEngine({ default_timeout_ms: 50 });
    
    const result = await customEngine.withTimeout(
      () => {
        // Simulate fast operation
        return "done";
      }
    );
    
    expect(result.success).toBe(true);
  });

  it("listWithTimeout works", async () => {
    const result = await engine.listWithTimeout(snapshot, { timeout_ms: 1000 });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.records).toHaveLength(1);
    }
  });

  it("timeout returns failure result (not throws)", async () => {
    // This is a cooperative timeout test
    // Real infinite loops can't be stopped, but async delays can
    const result = await engine.withTimeout(
      () => new Promise(resolve => setTimeout(resolve, 500)),
      10
    );
    
    // Should timeout
    expect(result.success).toBe(false);
  });

  it("DEFAULT_QUERY_CONFIG has expected values", () => {
    expect(DEFAULT_QUERY_CONFIG.default_timeout_ms).toBe(5000);
    expect(DEFAULT_QUERY_CONFIG.default_limit).toBe(1000);
    expect(DEFAULT_QUERY_CONFIG.max_limit).toBe(10000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — ATTACK TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("ATTACK TESTS — Query Security", () => {
  let engine: QueryEngine<QueryableRecord>;
  let snapshot: StoreSnapshot<QueryableRecord>;

  beforeEach(() => {
    engine = new QueryEngine();
    snapshot = createTestSnapshot([
      createTestRecord("char:alice", 1),
    ]);
  });

  describe("No mutation methods exist", () => {
    it("engine has no write methods", () => {
      expect((engine as any).write).toBeUndefined();
      expect((engine as any).update).toBeUndefined();
      expect((engine as any).delete).toBeUndefined();
      expect((engine as any).insert).toBeUndefined();
    });
  });

  describe("Input validation", () => {
    it("handles empty prefix gracefully", () => {
      const result = engine.listByPrefix(snapshot, "");
      expect(result.records).toHaveLength(1);
    });

    it("handles special characters in prefix", () => {
      const result = engine.listByPrefix(snapshot, "nonexistent:$pecial!");
      expect(result.records).toHaveLength(0);
    });

    it("handles negative offset", () => {
      const result = engine.listByPrefix(snapshot, "", { offset: -1 });
      // Should handle gracefully (slice with negative = from end)
      expect(result.records.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Results are immutable", () => {
    it("cannot modify QueryResult", () => {
      const result = engine.listAll(snapshot);
      
      expect(() => {
        (result as any).total_count = 999;
      }).toThrow();
    });

    it("cannot modify records array", () => {
      const result = engine.listAll(snapshot);
      
      expect(() => {
        (result.records as any[]).push({});
      }).toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — SNAPSHOT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

describe("createSnapshot", () => {
  it("should group records by key", () => {
    const records = [
      createTestRecord("a", 1),
      createTestRecord("a", 2),
      createTestRecord("b", 1),
    ];
    
    const snapshot = createSnapshot(records, "hash", "2026-01-01T00:00:00Z");
    
    expect(snapshot.records.get("a")?.length).toBe(2);
    expect(snapshot.records.get("b")?.length).toBe(1);
  });

  it("should sort versions within each key", () => {
    const records = [
      createTestRecord("a", 3),
      createTestRecord("a", 1),
      createTestRecord("a", 2),
    ];
    
    const snapshot = createSnapshot(records, "hash", "2026-01-01T00:00:00Z");
    const aRecords = snapshot.records.get("a")!;
    
    expect(aRecords[0].version).toBe(1);
    expect(aRecords[1].version).toBe(2);
    expect(aRecords[2].version).toBe(3);
  });

  it("should freeze the snapshot", () => {
    const snapshot = createSnapshot([], "hash", "2026-01-01T00:00:00Z");
    
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — RESULT HASH
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeResultHash", () => {
  it("should produce same hash for same records", () => {
    const records = [
      createTestRecord("a", 1),
      createTestRecord("b", 1),
    ];
    
    const hash1 = computeResultHash(records);
    const hash2 = computeResultHash(records);
    
    expect(hash1).toBe(hash2);
  });

  it("should produce different hash for different records", () => {
    const records1 = [createTestRecord("a", 1)];
    const records2 = [createTestRecord("b", 1)];
    
    const hash1 = computeResultHash(records1);
    const hash2 = computeResultHash(records2);
    
    expect(hash1).not.toBe(hash2);
  });

  it("should produce different hash for different order", () => {
    const a = createTestRecord("a", 1);
    const b = createTestRecord("b", 1);
    
    const hash1 = computeResultHash([a, b]);
    const hash2 = computeResultHash([b, a]);
    
    // Order matters for result hash (records should be sorted before hashing)
    expect(hash1).not.toBe(hash2);
  });
});
