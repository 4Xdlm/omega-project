// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_decay.test.ts
// Phase 8F — NASA-Grade L4 / DO-178C Level A
// 
// INV-MEM-DC1: Non-Destructive
// INV-MEM-DC2: Events Only
// INV-MEM-DC3: Determinism
// INV-MEM-DC4: Logical Reversibility
// INV-MEM-13: Decay Existence (C12)
// C04: Decay via store
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore } from "./memory_store";
import { DecayManager, projectDecayState } from "./memory_decay";
import { MemoryWriteRequest, MemoryMetaEvent } from "./types";

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

describe("DecayManager — Phase 8F Invariants", () => {
  let store: MemoryStore;
  let dm: DecayManager;

  beforeEach(() => {
    store = new MemoryStore();
    dm = new DecayManager(store);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-DC1: Non-Destructive
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-DC1: Non-Destructive", () => {
    it("decay does not delete entry", async () => {
      const write = await store.write(makeWriteRequest());
      const entryBefore = store.getById(write.entry_id!);

      dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYED",
        reason: "test",
      });

      // Entry still exists and unchanged
      const entryAfter = store.getById(write.entry_id!);
      expect(entryAfter).toEqual(entryBefore);
    });

    it("decayed entry is still accessible", async () => {
      const write = await store.write(makeWriteRequest());

      dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYED",
        reason: "test",
      });

      // Can still read entry
      const entry = store.getById(write.entry_id!);
      expect(entry).not.toBeNull();
      expect((entry!.payload as any).hp).toBe(10);

      // Can still get history
      const history = store.getHistory("character:marie:state");
      expect(history).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-DC2: Events Only (C04)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-DC2: Events Only (C04)", () => {
    it("markDecay creates DECAY_MARKED meta-event", async () => {
      const write = await store.write(makeWriteRequest());

      const result = dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYING",
        reason: "unit test",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.event_type).toBe("DECAY_MARKED");
        expect(result.value.target_entry_id).toBe(write.entry_id);
      }

      // Verify in store
      const metaEvents = store.getMetaEventsForEntry(write.entry_id!);
      expect(metaEvents).toHaveLength(1);
      expect(metaEvents[0].event_type).toBe("DECAY_MARKED");
    });

    it("completeDecay creates DECAY_COMPLETED meta-event", async () => {
      const write = await store.write(makeWriteRequest());

      const result = dm.completeDecay({
        target_entry_id: write.entry_id!,
        reason: "finalized",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.event_type).toBe("DECAY_COMPLETED");
      }
    });

    it("all decay operations go through store (C04)", async () => {
      const write = await store.write(makeWriteRequest());
      const countBefore = store.getMetaEventCount();

      dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYING",
        reason: "test",
      });

      // Meta-event count increased in store
      expect(store.getMetaEventCount()).toBe(countBefore + 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-DC3: Determinism
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-DC3: Determinism", () => {
    it("same events produce same decay state", async () => {
      const write = await store.write(makeWriteRequest());
      const entry = store.getById(write.entry_id!)!;

      const events: MemoryMetaEvent[] = [
        {
          id: "evt1",
          target_entry_id: entry.id,
          event_type: "DECAY_MARKED",
          timestamp_utc: "2026-01-01T00:00:00Z",
          payload: { decay_level: "DECAYING", decay_reason: "test" },
        },
        {
          id: "evt2",
          target_entry_id: entry.id,
          event_type: "DECAY_COMPLETED",
          timestamp_utc: "2026-01-02T00:00:00Z",
          payload: { decay_level: "DECAYED", decay_reason: "done" },
        },
      ];

      const state1 = projectDecayState(entry, events);
      const state2 = projectDecayState(entry, events);

      expect(state1).toEqual(state2);
      expect(state1.level).toBe("DECAYED");
    });

    it("100 projections with same input return identical results", async () => {
      const write = await store.write(makeWriteRequest());
      dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYING",
        reason: "test",
      });

      const first = dm.getDecayState(write.entry_id!);
      expect(first.ok).toBe(true);

      for (let i = 0; i < 100; i++) {
        const result = dm.getDecayState(write.entry_id!);
        expect(result).toEqual(first);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-DC4: Logical Reversibility
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-DC4: Logical Reversibility", () => {
    it("decay state evolution is traceable via events", async () => {
      const write = await store.write(makeWriteRequest());

      // Initial state: ACTIVE
      const state1 = dm.getDecayState(write.entry_id!);
      expect(state1.ok && state1.value.level).toBe("ACTIVE");

      // Mark DECAYING
      dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYING",
        reason: "starting",
        timestamp_utc: "2026-01-01T00:00:00Z",
      });

      const state2 = dm.getDecayState(write.entry_id!);
      expect(state2.ok && state2.value.level).toBe("DECAYING");

      // Complete decay
      dm.completeDecay({
        target_entry_id: write.entry_id!,
        reason: "completed",
        timestamp_utc: "2026-01-02T00:00:00Z",
      });

      const state3 = dm.getDecayState(write.entry_id!);
      expect(state3.ok && state3.value.level).toBe("DECAYED");

      // All events are preserved (traceable)
      const metaEvents = store.getMetaEventsForEntry(write.entry_id!);
      expect(metaEvents).toHaveLength(2);
    });

    it("can reconstruct history from events", async () => {
      const write = await store.write(makeWriteRequest());
      const entry = store.getById(write.entry_id!)!;

      // Add multiple decay events
      const events: MemoryMetaEvent[] = [
        {
          id: "evt1",
          target_entry_id: entry.id,
          event_type: "DECAY_MARKED",
          timestamp_utc: "2026-01-01T00:00:00Z",
          payload: { decay_level: "DECAYING", decay_reason: "start" },
        },
        {
          id: "evt2",
          target_entry_id: entry.id,
          event_type: "DECAY_MARKED",
          timestamp_utc: "2026-01-02T00:00:00Z",
          payload: { decay_level: "DECAYED", decay_reason: "advance" },
        },
        {
          id: "evt3",
          target_entry_id: entry.id,
          event_type: "DECAY_MARKED",
          timestamp_utc: "2026-01-03T00:00:00Z",
          payload: { decay_level: "DECAYING", decay_reason: "revert" },
        },
      ];

      // Can project state at each point
      const stateAtEvt1 = projectDecayState(entry, events.slice(0, 1));
      const stateAtEvt2 = projectDecayState(entry, events.slice(0, 2));
      const stateAtEvt3 = projectDecayState(entry, events);

      expect(stateAtEvt1.level).toBe("DECAYING");
      expect(stateAtEvt2.level).toBe("DECAYED");
      expect(stateAtEvt3.level).toBe("DECAYING"); // Reverted
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-13: Decay Existence (C12)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-13: Decay Existence (C12)", () => {
    it("rejects decay on non-existent entry", () => {
      const result = dm.markDecay({
        target_entry_id: "ghost-id",
        level: "DECAYING",
        reason: "test",
      });

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("ENTRY_NOT_FOUND");
    });

    it("rejects completeDecay on non-existent entry", () => {
      const result = dm.completeDecay({
        target_entry_id: "ghost-id",
        reason: "test",
      });

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("ENTRY_NOT_FOUND");
    });

    it("accepts decay on existing entry", async () => {
      const write = await store.write(makeWriteRequest());

      const result = dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYING",
        reason: "valid",
      });

      expect(result.ok).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Validation", () => {
    it("rejects empty reason", async () => {
      const write = await store.write(makeWriteRequest());

      const result = dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYING",
        reason: "",
      });

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("DECAY_REASON_REQUIRED");
    });

    it("rejects whitespace-only reason", async () => {
      const write = await store.write(makeWriteRequest());

      const result = dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYING",
        reason: "   ",
      });

      expect(result.ok).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Queries", () => {
    it("isDecayed returns correct value", async () => {
      const write = await store.write(makeWriteRequest());

      expect(dm.isDecayed(write.entry_id!)).toEqual({ ok: true, value: false });

      dm.completeDecay({
        target_entry_id: write.entry_id!,
        reason: "test",
      });

      expect(dm.isDecayed(write.entry_id!)).toEqual({ ok: true, value: true });
    });

    it("isActive returns correct value", async () => {
      const write = await store.write(makeWriteRequest());

      expect(dm.isActive(write.entry_id!)).toEqual({ ok: true, value: true });

      dm.markDecay({
        target_entry_id: write.entry_id!,
        level: "DECAYING",
        reason: "test",
      });

      expect(dm.isActive(write.entry_id!)).toEqual({ ok: true, value: false });
    });

    it("getDecayedEntries returns only decayed entries", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "test:active:entry" })
      );
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "test:decayed:entry" })
      );

      dm.completeDecay({
        target_entry_id: w2.entry_id!,
        reason: "test",
      });

      const decayed = dm.getDecayedEntries();
      expect(decayed).toHaveLength(1);
      expect(decayed[0].id).toBe(w2.entry_id);
    });

    it("countByDecayLevel returns correct counts", async () => {
      await store.write(
        makeWriteRequest({ canonical_key: "test:active:entry" })
      );
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "test:decaying:entry" })
      );
      const w3 = await store.write(
        makeWriteRequest({ canonical_key: "test:decayed:entry" })
      );

      dm.markDecay({
        target_entry_id: w2.entry_id!,
        level: "DECAYING",
        reason: "test",
      });

      dm.completeDecay({
        target_entry_id: w3.entry_id!,
        reason: "test",
      });

      const counts = dm.countByDecayLevel();
      expect(counts.ACTIVE).toBe(1);
      expect(counts.DECAYING).toBe(1);
      expect(counts.DECAYED).toBe(1);
    });
  });
});
