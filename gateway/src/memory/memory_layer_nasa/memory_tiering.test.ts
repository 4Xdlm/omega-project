// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_tiering.test.ts
// Phase 8D — NASA-Grade L4 / DO-178C Level A
// 
// INV-MEM-T1: Events Only
// INV-MEM-T2: Idempotence
// INV-MEM-T3: Deterministic Decisions
// INV-MEM-12: No Event Loop (C05)
// C11: Rate Limit
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore } from "./memory_store";
import {
  computeTieringActions,
  applyTieringActions,
  logAccess,
} from "./memory_tiering";
import {
  MemoryWriteRequest,
  MemoryEntry,
  MemoryMetaEvent,
  TieringPolicy,
  MemoryConfig,
} from "./types";

const TS_BASE = "2026-01-01T00:00:00Z";
const TS_8DAYS = "2026-01-09T00:00:00Z";
const TS_40DAYS = "2026-02-10T00:00:00Z";

function makeWriteRequest(
  overrides: Partial<MemoryWriteRequest> = {}
): MemoryWriteRequest {
  return {
    source: "RIPPLE_ENGINE",
    canonical_key: "character:marie:state",
    event_type: "FACT_ESTABLISHED",
    payload_type: "FACT",
    payload: { hp: 10 },
    timestamp_utc: TS_BASE,
    ...overrides,
  };
}

describe("memory_tiering — Phase 8D Invariants", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-T1: Events Only
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-T1: Events Only", () => {
    it("computeTieringActions does not modify store", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );
      const entry = store.getById(write.entry_id!)!;
      const countBefore = store.getMetaEventCount();

      // Compute actions (should not modify anything)
      computeTieringActions({
        entries: [entry],
        metaEvents: [],
        now_utc: TS_8DAYS, // 8 days later
      });

      // No new meta-events
      expect(store.getMetaEventCount()).toBe(countBefore);

      // Entry unchanged
      expect(store.getById(write.entry_id!)).toEqual(entry);
    });

    it("applyTieringActions creates TIER_CHANGED meta-events", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );
      const entry = store.getById(write.entry_id!)!;

      const result = computeTieringActions({
        entries: [entry],
        metaEvents: [],
        now_utc: TS_8DAYS,
      });

      expect(result.actions.length).toBeGreaterThan(0);

      const metaEvents = applyTieringActions(store, result.actions);
      expect(metaEvents.length).toBeGreaterThan(0);
      expect(metaEvents[0].event_type).toBe("TIER_CHANGED");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-T2: Idempotence
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-T2: Idempotence", () => {
    it("same input produces same actions (deterministic)", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );
      const entry = store.getById(write.entry_id!)!;

      const result1 = computeTieringActions({
        entries: [entry],
        metaEvents: [],
        now_utc: TS_8DAYS,
      });

      const result2 = computeTieringActions({
        entries: [entry],
        metaEvents: [],
        now_utc: TS_8DAYS,
      });

      expect(result1.actions.length).toBe(result2.actions.length);
      expect(result1.actions[0]).toEqual(result2.actions[0]);
    });

    it("no duplicate events for already-demoted entries", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );
      const entry = store.getById(write.entry_id!)!;

      // First run - demote HOT -> WARM
      const result1 = computeTieringActions({
        entries: [entry],
        metaEvents: [],
        now_utc: TS_8DAYS,
      });

      const applied = applyTieringActions(store, result1.actions);

      // Second run - with the new meta-events
      const result2 = computeTieringActions({
        entries: [entry],
        metaEvents: applied,
        now_utc: TS_8DAYS, // Same time
      });

      // Should produce no actions (already demoted)
      expect(result2.actions).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-T3: Deterministic Decisions
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-T3: Deterministic Decisions", () => {
    it("entries processed in deterministic order", async () => {
      // Create entries with different keys
      await store.write(
        makeWriteRequest({
          canonical_key: "zzz:test:key",
          initial_tier: "HOT",
        })
      );
      await store.write(
        makeWriteRequest({
          canonical_key: "aaa:test:key",
          initial_tier: "HOT",
        })
      );
      await store.write(
        makeWriteRequest({
          canonical_key: "mmm:test:key",
          initial_tier: "HOT",
        })
      );

      const entries: MemoryEntry[] = [];
      for (const key of store.listKeys()) {
        entries.push(...store.getHistory(key));
      }

      const result = computeTieringActions({
        entries,
        metaEvents: [],
        now_utc: TS_8DAYS,
      });

      // Actions should be in sorted order (aaa < mmm < zzz)
      expect(result.actions[0].kind).toBe("TIER_CHANGED");
      if (result.actions[0].kind === "TIER_CHANGED") {
        const entry0 = store.getById(result.actions[0].target_entry_id)!;
        expect(entry0.canonical_key).toBe("aaa:test:key");
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-12: No Event Loop (C05)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-12: No Event Loop (C05)", () => {
    it("max 1 tier event per entry per run", async () => {
      // Create entry that could match both promo and demo conditions
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );
      const entry = store.getById(write.entry_id!)!;

      // Create many access events (for promotion) and old timestamp (for demotion)
      const metaEvents: MemoryMetaEvent[] = [];
      for (let i = 0; i < 10; i++) {
        metaEvents.push({
          id: `access-${i}`,
          target_entry_id: entry.id,
          event_type: "ACCESS_LOGGED",
          timestamp_utc: TS_8DAYS,
          payload: { accessor: "test", context: "stress" },
        });
      }

      const result = computeTieringActions({
        entries: [entry],
        metaEvents,
        now_utc: TS_8DAYS,
      });

      // Only 1 action for this entry
      const actionsForEntry = result.actions.filter(
        (a) => a.kind === "TIER_CHANGED" && a.target_entry_id === entry.id
      );
      expect(actionsForEntry.length).toBeLessThanOrEqual(1);
    });

    it("respects cooldown period", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );
      const entry = store.getById(write.entry_id!)!;

      // Add recent tier change
      const recentTierChange: MemoryMetaEvent = {
        id: "recent-change",
        target_entry_id: entry.id,
        event_type: "TIER_CHANGED",
        timestamp_utc: "2026-01-08T23:00:00Z", // 1 hour before now
        payload: { from_tier: "HOT", to_tier: "WARM", reason: "test" },
      };

      const config: Partial<MemoryConfig> = {
        tieringCooldownMs: 2 * 60 * 60 * 1000, // 2 hours
      };

      const result = computeTieringActions({
        entries: [entry],
        metaEvents: [recentTierChange],
        config: { ...store.getConfig(), ...config },
        now_utc: TS_8DAYS, // 2026-01-09T00:00:00Z
      });

      // Entry should be skipped (cooldown)
      expect(result.entriesSkipped).toBe(1);
      expect(result.actions).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // C11: Rate Limit
  // ─────────────────────────────────────────────────────────────────────────────

  describe("C11: Rate Limit", () => {
    it("stops at maxTieringEventsPerRun", async () => {
      // Create many entries
      for (let i = 0; i < 10; i++) {
        await store.write(
          makeWriteRequest({
            canonical_key: `test:entry:num${i.toString().padStart(2, "0")}`,
            initial_tier: "HOT",
          })
        );
      }

      const entries: MemoryEntry[] = [];
      for (const key of store.listKeys()) {
        entries.push(...store.getHistory(key));
      }

      const config: Partial<MemoryConfig> = {
        maxTieringEventsPerRun: 3,
      };

      const result = computeTieringActions({
        entries,
        metaEvents: [],
        config: { ...store.getConfig(), ...config },
        now_utc: TS_8DAYS,
      });

      expect(result.actions).toHaveLength(3);
      expect(result.rateLimited).toBe(true);
    });

    it("rateLimited is false when under limit", async () => {
      await store.write(makeWriteRequest({ initial_tier: "HOT" }));
      const entries = store.getHistory("character:marie:state");

      const result = computeTieringActions({
        entries,
        metaEvents: [],
        now_utc: TS_8DAYS,
      });

      expect(result.rateLimited).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Tiering Logic
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Tiering Logic", () => {
    it("demotes HOT to WARM after hot_ttl_days", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "HOT" })
      );
      const entry = store.getById(write.entry_id!)!;

      const result = computeTieringActions({
        entries: [entry],
        metaEvents: [],
        now_utc: TS_8DAYS, // 8 days later (> 7 days default)
      });

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].kind).toBe("TIER_CHANGED");
      if (result.actions[0].kind === "TIER_CHANGED") {
        expect(result.actions[0].from_tier).toBe("HOT");
        expect(result.actions[0].to_tier).toBe("WARM");
      }
    });

    it("demotes WARM to COLD after warm_ttl_days", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "WARM" })
      );
      const entry = store.getById(write.entry_id!)!;

      const result = computeTieringActions({
        entries: [entry],
        metaEvents: [],
        now_utc: TS_40DAYS, // 40 days later (> 30 days default)
      });

      expect(result.actions).toHaveLength(1);
      if (result.actions[0].kind === "TIER_CHANGED") {
        expect(result.actions[0].from_tier).toBe("WARM");
        expect(result.actions[0].to_tier).toBe("COLD");
      }
    });

    it("promotes COLD to WARM on frequent access", async () => {
      const write = await store.write(
        makeWriteRequest({ initial_tier: "COLD" })
      );
      const entry = store.getById(write.entry_id!)!;

      // Create access events
      const metaEvents: MemoryMetaEvent[] = [];
      for (let i = 0; i < 5; i++) {
        metaEvents.push({
          id: `access-${i}`,
          target_entry_id: entry.id,
          event_type: "ACCESS_LOGGED",
          timestamp_utc: `2026-01-0${i + 2}T00:00:00Z`,
          payload: { accessor: "test", context: "promo" },
        });
      }

      const result = computeTieringActions({
        entries: [entry],
        metaEvents,
        now_utc: TS_8DAYS,
      });

      expect(result.actions).toHaveLength(1);
      if (result.actions[0].kind === "TIER_CHANGED") {
        expect(result.actions[0].from_tier).toBe("COLD");
        expect(result.actions[0].to_tier).toBe("WARM");
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // logAccess
  // ─────────────────────────────────────────────────────────────────────────────

  describe("logAccess", () => {
    it("creates ACCESS_LOGGED meta-event", async () => {
      const write = await store.write(makeWriteRequest());

      const result = logAccess(store, {
        target_entry_id: write.entry_id!,
        accessor: "test-user",
        context: "unit-test",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.event_type).toBe("ACCESS_LOGGED");
      }
    });

    it("rejects empty accessor", async () => {
      const write = await store.write(makeWriteRequest());

      const result = logAccess(store, {
        target_entry_id: write.entry_id!,
        accessor: "",
        context: "test",
      });

      expect(result.ok).toBe(false);
    });

    it("rejects non-existent entry", () => {
      const result = logAccess(store, {
        target_entry_id: "ghost",
        accessor: "test",
        context: "test",
      });

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("ENTRY_NOT_FOUND");
    });
  });
});
