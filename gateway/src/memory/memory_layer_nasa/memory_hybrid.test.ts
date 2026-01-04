// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_hybrid.test.ts
// Phase 8C — NASA-Grade L4 / DO-178C Level A
// 
// INV-MEM-H1: Hybrid Non-Destructive
// INV-MEM-H2: Tiering via Events Only
// INV-MEM-H3: Deterministic Hybrid View
// C08: from_tier validation
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore } from "./memory_store";
import { MemoryHybrid, getEffectiveTier, splitHybridView } from "./memory_hybrid";
import { MemoryWriteRequest, MemoryEntry, MemoryMetaEvent } from "./types";

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

describe("MemoryHybrid — Phase 8C Invariants", () => {
  let store: MemoryStore;
  let hybrid: MemoryHybrid;

  beforeEach(() => {
    store = new MemoryStore();
    hybrid = new MemoryHybrid(store);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-H1: Hybrid Non-Destructive
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-H1: Hybrid Non-Destructive", () => {
    it("markTier does not modify original entry", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );
      const entryBefore = store.getById(write.entry_id!);

      // Change tier
      const result = hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "HOT",
        to_tier: "WARM",
        reason: "test",
      });

      expect(result.ok).toBe(true);

      // Original entry unchanged
      const entryAfter = store.getById(write.entry_id!);
      expect(entryAfter).toEqual(entryBefore);
      expect(entryAfter!.initial_tier).toBe("HOT");
    });

    it("tier change is reflected in effective tier only", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );

      // Initial effective tier
      const tierBefore = hybrid.getEffectiveTierForEntry(write.entry_id!);
      expect(tierBefore.ok && tierBefore.value).toBe("HOT");

      // Change tier
      hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "HOT",
        to_tier: "COLD",
        reason: "test",
      });

      // Effective tier changed
      const tierAfter = hybrid.getEffectiveTierForEntry(write.entry_id!);
      expect(tierAfter.ok && tierAfter.value).toBe("COLD");

      // But initial_tier on entry is still HOT
      const entry = store.getById(write.entry_id!);
      expect(entry!.initial_tier).toBe("HOT");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-H2: Tiering via Events Only
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-H2: Tiering via Events Only", () => {
    it("markTier creates TIER_CHANGED meta-event", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );

      const result = hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "HOT",
        to_tier: "WARM",
        reason: "unit test",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.event_type).toBe("TIER_CHANGED");
        expect(result.value.target_entry_id).toBe(write.entry_id);
      }

      // Verify meta-event stored
      const metaEvents = store.getMetaEventsForEntry(write.entry_id!);
      expect(metaEvents).toHaveLength(1);
      expect(metaEvents[0].event_type).toBe("TIER_CHANGED");
    });

    it("multiple tier changes create multiple events", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );

      // HOT -> WARM
      hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "HOT",
        to_tier: "WARM",
        reason: "step 1",
      });

      // WARM -> COLD
      hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "WARM",
        to_tier: "COLD",
        reason: "step 2",
      });

      const metaEvents = store.getMetaEventsForEntry(write.entry_id!);
      expect(metaEvents).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-H3: Deterministic Hybrid View
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-H3: Deterministic Hybrid View", () => {
    it("same inputs produce same ST/LT split", async () => {
      await store.write(
        makeWriteRequest({
          canonical_key: "test:hot:entry",
          initial_tier: "HOT",
        })
      );
      await store.write(
        makeWriteRequest({
          canonical_key: "test:cold:entry",
          initial_tier: "COLD",
        })
      );

      const view1 = hybrid.getGlobalHybridView();
      const view2 = hybrid.getGlobalHybridView();

      expect(view1.shortTerm.length).toBe(view2.shortTerm.length);
      expect(view1.longTerm.length).toBe(view2.longTerm.length);

      // Compare entry IDs
      const st1Ids = view1.shortTerm.map((e) => e.id).sort();
      const st2Ids = view2.shortTerm.map((e) => e.id).sort();
      expect(st1Ids).toEqual(st2Ids);
    });

    it("HOT and WARM entries are short-term", async () => {
      await store.write(
        makeWriteRequest({
          canonical_key: "test:hot:entry",
          initial_tier: "HOT",
        })
      );
      await store.write(
        makeWriteRequest({
          canonical_key: "test:warm:entry",
          initial_tier: "WARM",
        })
      );

      const view = hybrid.getGlobalHybridView();
      expect(view.shortTerm).toHaveLength(2);
      expect(view.longTerm).toHaveLength(0);
    });

    it("COLD entries are long-term", async () => {
      await store.write(
        makeWriteRequest({
          canonical_key: "test:cold:entry",
          initial_tier: "COLD",
        })
      );

      const view = hybrid.getGlobalHybridView();
      expect(view.shortTerm).toHaveLength(0);
      expect(view.longTerm).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // C08: from_tier Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe("C08: from_tier Validation", () => {
    it("rejects tier change with wrong from_tier", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );

      // Try to change from COLD when actually HOT
      const result = hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "COLD", // WRONG!
        to_tier: "WARM",
        reason: "should fail",
      });

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("TIER_MISMATCH");
    });

    it("rejects tier change for non-existent entry", () => {
      const result = hybrid.markTier({
        target_entry_id: "ghost-id",
        from_tier: "HOT",
        to_tier: "WARM",
        reason: "should fail",
      });

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("ENTRY_NOT_FOUND");
    });

    it("accepts tier change with correct from_tier", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );

      const result = hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "HOT",
        to_tier: "WARM",
        reason: "correct",
      });

      expect(result.ok).toBe(true);
    });

    it("validates from_tier against effective tier (not initial)", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );

      // Change to WARM
      hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "HOT",
        to_tier: "WARM",
        reason: "first change",
      });

      // Now effective tier is WARM, not HOT
      // Try to change from HOT again - should fail
      const badResult = hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "HOT", // WRONG - effective tier is now WARM
        to_tier: "COLD",
        reason: "should fail",
      });

      expect(badResult.ok).toBe(false);
      expect(!badResult.ok && badResult.error).toBe("TIER_MISMATCH");

      // Change from WARM should work
      const goodResult = hybrid.markTier({
        target_entry_id: write.entry_id!,
        from_tier: "WARM",
        to_tier: "COLD",
        reason: "should work",
      });

      expect(goodResult.ok).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getEffectiveTier
  // ─────────────────────────────────────────────────────────────────────────────

  describe("getEffectiveTier", () => {
    it("returns initial_tier when no tier changes", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "WARM" })
      );
      const entry = store.getById(write.entry_id!)!;

      const tier = getEffectiveTier(entry, []);
      expect(tier).toBe("WARM");
    });

    it("returns latest tier after changes", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );
      const entry = store.getById(write.entry_id!)!;

      const events: MemoryMetaEvent[] = [
        {
          id: "evt1",
          target_entry_id: entry.id,
          event_type: "TIER_CHANGED",
          timestamp_utc: "2026-01-01T00:00:00Z",
          payload: { from_tier: "HOT", to_tier: "WARM", reason: "test" },
        },
        {
          id: "evt2",
          target_entry_id: entry.id,
          event_type: "TIER_CHANGED",
          timestamp_utc: "2026-01-02T00:00:00Z",
          payload: { from_tier: "WARM", to_tier: "COLD", reason: "test" },
        },
      ];

      const tier = getEffectiveTier(entry, events);
      expect(tier).toBe("COLD");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────────

  describe("tier queries", () => {
    it("getEntriesByTier returns correct entries", async () => {
      await store.write(
        makeWriteRequest({
          canonical_key: "test:hot:one",
          initial_tier: "HOT",
        })
      );
      await store.write(
        makeWriteRequest({
          canonical_key: "test:hot:two",
          initial_tier: "HOT",
        })
      );
      await store.write(
        makeWriteRequest({
          canonical_key: "test:cold:one",
          initial_tier: "COLD",
        })
      );

      const hotEntries = hybrid.getEntriesByTier("HOT");
      const coldEntries = hybrid.getEntriesByTier("COLD");

      expect(hotEntries).toHaveLength(2);
      expect(coldEntries).toHaveLength(1);
    });

    it("countByTier returns correct counts", async () => {
      await store.write(
        makeWriteRequest({
          canonical_key: "test:hot:entry",
          initial_tier: "HOT",
        })
      );
      await store.write(
        makeWriteRequest({
          canonical_key: "test:warm:entry",
          initial_tier: "WARM",
        })
      );
      await store.write(
        makeWriteRequest({
          canonical_key: "test:cold:entry",
          initial_tier: "COLD",
        })
      );

      const counts = hybrid.countByTier();
      expect(counts.HOT).toBe(1);
      expect(counts.WARM).toBe(1);
      expect(counts.COLD).toBe(1);
    });
  });
});
