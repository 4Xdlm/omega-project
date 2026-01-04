// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_snapshot.test.ts
// Phase 8 — NASA-Grade L4 / DO-178C Level A
// 
// INV-MEM-11: Snapshot Isolation
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore } from "./memory_store";
import { SnapshotManager } from "./memory_snapshot";
import { MemoryWriteRequest } from "./types";

const TS = "2026-01-03T00:00:00Z";

function makeWriteRequest(
  overrides: Partial<MemoryWriteRequest> = {}
): MemoryWriteRequest {
  return {
    source: "RIPPLE_ENGINE",
    canonical_key: "character:marie:state",
    event_type: "FACT_ESTABLISHED",
    payload_type: "FACT",
    payload: { hp: 10 },
    timestamp_utc: TS,
    ...overrides,
  };
}

describe("SnapshotManager — INV-MEM-11: Snapshot Isolation", () => {
  let store: MemoryStore;
  let snapMgr: SnapshotManager;

  beforeEach(() => {
    store = new MemoryStore();
    snapMgr = new SnapshotManager(store);
  });

  describe("createSnapshot", () => {
    it("creates snapshot with correct metadata", async () => {
      await store.write(makeWriteRequest());
      await store.write(makeWriteRequest({ payload: { hp: 20 } }));

      const snap = snapMgr.createSnapshot();

      expect(snap.id).toBeDefined();
      expect(snap.created_at_utc).toBeDefined();
      expect(snap.root_hash).toHaveLength(64);
      expect(snap.entry_count).toBe(2);
    });

    it("empty store creates valid snapshot", () => {
      const snap = snapMgr.createSnapshot();

      expect(snap.entry_count).toBe(0);
      expect(snap.root_hash).toHaveLength(64);
    });
  });

  describe("snapshot isolation (INV-MEM-11)", () => {
    it("snapshot reads are frozen even after store changes", async () => {
      // Write v1
      await store.write(makeWriteRequest({ payload: { version: 1 } }));

      // Create snapshot
      const snap = snapMgr.createSnapshot();

      // Write v2 AFTER snapshot
      await store.write(makeWriteRequest({ payload: { version: 2 } }));

      // Snapshot still sees only v1
      const keysResult = snapMgr.listKeys(snap.id);
      expect(keysResult.ok).toBe(true);

      const historyResult = snapMgr.getHistory(snap.id, "character:marie:state");
      expect(historyResult.ok).toBe(true);
      if (historyResult.ok) {
        expect(historyResult.value).toHaveLength(1);
        expect((historyResult.value[0].payload as any).version).toBe(1);
      }

      // Store sees both versions
      expect(store.getHistory("character:marie:state")).toHaveLength(2);
    });

    it("100 reads with same snapshot_id return identical results", async () => {
      await store.write(makeWriteRequest({ payload: { data: "test" } }));
      const snap = snapMgr.createSnapshot();

      const firstResult = snapMgr.getByVersion(
        snap.id,
        "character:marie:state",
        1
      );
      expect(firstResult.ok).toBe(true);

      for (let i = 0; i < 100; i++) {
        const result = snapMgr.getByVersion(
          snap.id,
          "character:marie:state",
          1
        );
        expect(result).toEqual(firstResult);
      }
    });

    it("different snapshots at different times see different data", async () => {
      // Write v1
      await store.write(makeWriteRequest({ payload: { step: 1 } }));
      const snap1 = snapMgr.createSnapshot();

      // Write v2
      await store.write(makeWriteRequest({ payload: { step: 2 } }));
      const snap2 = snapMgr.createSnapshot();

      // snap1 sees 1 entry
      const h1 = snapMgr.getHistory(snap1.id, "character:marie:state");
      expect(h1.ok && h1.value.length).toBe(1);

      // snap2 sees 2 entries
      const h2 = snapMgr.getHistory(snap2.id, "character:marie:state");
      expect(h2.ok && h2.value.length).toBe(2);
    });
  });

  describe("snapshot reads", () => {
    it("getByVersion returns correct entry", async () => {
      for (let i = 1; i <= 5; i++) {
        await store.write(makeWriteRequest({ payload: { step: i } }));
      }
      const snap = snapMgr.createSnapshot();

      const result = snapMgr.getByVersion(snap.id, "character:marie:state", 3);
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.version).toBe(3);
        expect((result.value.payload as any).step).toBe(3);
      }
    });

    it("getByVersion returns null for non-existent version", async () => {
      await store.write(makeWriteRequest());
      const snap = snapMgr.createSnapshot();

      const result = snapMgr.getByVersion(snap.id, "character:marie:state", 99);
      expect(result.ok).toBe(true);
      expect(result.ok && result.value).toBeNull();
    });

    it("getLatest returns most recent entry at snapshot time", async () => {
      await store.write(makeWriteRequest({ payload: { step: 1 } }));
      await store.write(makeWriteRequest({ payload: { step: 2 } }));
      const snap = snapMgr.createSnapshot();

      // Add more after snapshot
      await store.write(makeWriteRequest({ payload: { step: 3 } }));

      const result = snapMgr.getLatest(snap.id, "character:marie:state");
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.version).toBe(2);
        expect((result.value.payload as any).step).toBe(2);
      }
    });

    it("getById returns correct entry", async () => {
      const write = await store.write(makeWriteRequest());
      const snap = snapMgr.createSnapshot();

      const result = snapMgr.getById(snap.id, write.entry_id!);
      expect(result.ok).toBe(true);
      if (result.ok && result.value) {
        expect(result.value.id).toBe(write.entry_id);
      }
    });
  });

  describe("error handling", () => {
    it("returns SNAPSHOT_NOT_FOUND for invalid snapshot_id", () => {
      const result = snapMgr.getByVersion("invalid-id", "key:test:here", 1);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("SNAPSHOT_NOT_FOUND");
    });

    it("hasSnapshot returns correct boolean", async () => {
      await store.write(makeWriteRequest());
      const snap = snapMgr.createSnapshot();

      expect(snapMgr.hasSnapshot(snap.id)).toBe(true);
      expect(snapMgr.hasSnapshot("non-existent")).toBe(false);
    });
  });

  describe("snapshot management", () => {
    it("listSnapshots returns snapshots sorted by date", async () => {
      await store.write(makeWriteRequest());
      const snap1 = snapMgr.createSnapshot();

      await store.write(makeWriteRequest({ payload: { step: 2 } }));
      const snap2 = snapMgr.createSnapshot();

      const list = snapMgr.listSnapshots();
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe(snap1.id);
      expect(list[1].id).toBe(snap2.id);
    });

    it("deleteSnapshot removes snapshot", async () => {
      await store.write(makeWriteRequest());
      const snap = snapMgr.createSnapshot();

      expect(snapMgr.hasSnapshot(snap.id)).toBe(true);
      const deleted = snapMgr.deleteSnapshot(snap.id);
      expect(deleted).toBe(true);
      expect(snapMgr.hasSnapshot(snap.id)).toBe(false);
    });

    it("getSnapshotCount returns correct count", async () => {
      expect(snapMgr.getSnapshotCount()).toBe(0);

      await store.write(makeWriteRequest());
      snapMgr.createSnapshot();
      expect(snapMgr.getSnapshotCount()).toBe(1);

      snapMgr.createSnapshot();
      expect(snapMgr.getSnapshotCount()).toBe(2);
    });
  });

  describe("verifySnapshot", () => {
    it("returns true for valid snapshot", async () => {
      await store.write(makeWriteRequest());
      await store.write(makeWriteRequest({ payload: { step: 2 } }));
      const snap = snapMgr.createSnapshot();

      const result = snapMgr.verifySnapshot(snap.id);
      expect(result.ok).toBe(true);
      expect(result.ok && result.value).toBe(true);
    });

    it("returns error for non-existent snapshot", () => {
      const result = snapMgr.verifySnapshot("non-existent");
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("SNAPSHOT_NOT_FOUND");
    });
  });

  describe("meta-events in snapshots", () => {
    it("captures meta-events at snapshot time", async () => {
      const write = await store.write(makeWriteRequest());

      store.appendMetaEvent({
        target_entry_id: write.entry_id!,
        event_type: "ACCESS_LOGGED",
        timestamp_utc: TS,
        payload: { accessor: "test", context: "unit_test" },
      });

      const snap = snapMgr.createSnapshot();
      expect(snap.meta_event_count).toBe(1);

      const metaResult = snapMgr.getMetaEventsForEntry(snap.id, write.entry_id!);
      expect(metaResult.ok).toBe(true);
      if (metaResult.ok) {
        expect(metaResult.value).toHaveLength(1);
      }
    });

    it("snapshot meta-events are frozen", async () => {
      const write = await store.write(makeWriteRequest());

      store.appendMetaEvent({
        target_entry_id: write.entry_id!,
        event_type: "ACCESS_LOGGED",
        timestamp_utc: TS,
        payload: { accessor: "test", context: "before_snapshot" },
      });

      const snap = snapMgr.createSnapshot();

      // Add more meta-events after snapshot
      store.appendMetaEvent({
        target_entry_id: write.entry_id!,
        event_type: "ACCESS_LOGGED",
        timestamp_utc: TS,
        payload: { accessor: "test", context: "after_snapshot" },
      });

      // Snapshot still sees only 1 meta-event
      const metaResult = snapMgr.getMetaEventsForEntry(snap.id, write.entry_id!);
      expect(metaResult.ok).toBe(true);
      if (metaResult.ok) {
        expect(metaResult.value).toHaveLength(1);
      }

      // Store sees both
      expect(store.getMetaEventsForEntry(write.entry_id!)).toHaveLength(2);
    });
  });
});
