// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_store.test.ts
// Phase 8 — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// TESTS DES INVARIANTS INV-MEM-01 à INV-MEM-13
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore } from "./memory_store";
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

describe("MemoryStore — Phase 8B Core Invariants", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-01: Append-Only Strict
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-01: Append-Only Strict", () => {
    it("entries are frozen (Object.freeze)", async () => {
      const res = await store.write(makeWriteRequest());
      expect(res.success).toBe(true);

      const entry = store.getById(res.entry_id!);
      expect(entry).not.toBeNull();
      expect(Object.isFrozen(entry)).toBe(true);
    });

    it("cannot modify entry fields", async () => {
      const res = await store.write(makeWriteRequest());
      const entry = store.getById(res.entry_id!) as any;

      // Attempt mutation (should silently fail or throw in strict mode)
      expect(() => {
        entry.version = 999;
      }).toThrow();
    });

    it("new write creates new entry, old remains unchanged", async () => {
      const r1 = await store.write(makeWriteRequest({ payload: { hp: 10 } }));
      const r2 = await store.write(makeWriteRequest({ payload: { hp: 20 } }));

      expect(r1.version).toBe(1);
      expect(r2.version).toBe(2);

      const e1 = store.getById(r1.entry_id!);
      const e2 = store.getById(r2.entry_id!);

      expect((e1!.payload as any).hp).toBe(10);
      expect((e2!.payload as any).hp).toBe(20);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-02: Source Unique (RIPPLE only)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-02: Source Unique", () => {
    it("rejects non-RIPPLE source", async () => {
      const res = await store.write({
        // @ts-expect-error testing invalid source
        source: "NOT_RIPPLE",
        canonical_key: "character:marie:state",
        event_type: "FACT_ESTABLISHED",
        payload_type: "FACT",
        payload: { hp: 10 },
        timestamp_utc: TS,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("INVALID_SOURCE");
    });

    it("accepts RIPPLE_ENGINE source", async () => {
      const res = await store.write(makeWriteRequest());
      expect(res.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-03: Versionnement Obligatoire
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-03: Versionnement Obligatoire", () => {
    it("versions increment correctly (1..10)", async () => {
      for (let i = 1; i <= 10; i++) {
        const res = await store.write(
          makeWriteRequest({ payload: { step: i } })
        );
        expect(res.success).toBe(true);
        expect(res.version).toBe(i);
      }
    });

    it("all versions are accessible via getHistory", async () => {
      for (let i = 1; i <= 5; i++) {
        await store.write(makeWriteRequest({ payload: { step: i } }));
      }

      const history = store.getHistory("character:marie:state");
      expect(history).toHaveLength(5);
      expect(history[0].version).toBe(1);
      expect(history[4].version).toBe(5);
    });

    it("getByVersion returns correct entry", async () => {
      for (let i = 1; i <= 5; i++) {
        await store.write(makeWriteRequest({ payload: { step: i } }));
      }

      const v3 = store.getByVersion("character:marie:state", 3);
      expect(v3).not.toBeNull();
      expect(v3!.version).toBe(3);
      expect((v3!.payload as any).step).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-04: Indexation Canonique
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-04: Indexation Canonique", () => {
    it("rejects invalid canonical key (caps)", async () => {
      const res = await store.write(
        makeWriteRequest({ canonical_key: "Character:Marie:state" })
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe("INVALID_KEY");
    });

    it("rejects invalid canonical key (too few segments)", async () => {
      const res = await store.write(
        makeWriteRequest({ canonical_key: "character:marie" })
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe("INVALID_KEY");
    });

    it("rejects invalid canonical key (empty segment)", async () => {
      const res = await store.write(
        makeWriteRequest({ canonical_key: "character::state" })
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe("INVALID_KEY");
    });

    it("accepts valid canonical key", async () => {
      const res = await store.write(
        makeWriteRequest({ canonical_key: "character:marie:state" })
      );
      expect(res.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-05: Intégrité Hash Déterministe
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-05: Intégrité Hash Déterministe", () => {
    it("verifyEntry returns true for valid entry", async () => {
      const res = await store.write(makeWriteRequest());
      expect(res.success).toBe(true);

      const verify = store.verifyEntry(res.entry_id!);
      expect(verify.ok).toBe(true);
      expect(verify.ok && verify.value).toBe(true);
    });

    it("same payload produces same hash", async () => {
      const payload = { a: 1, b: 2, nested: { x: 10 } };

      const r1 = await store.write(
        makeWriteRequest({
          canonical_key: "test:key:one",
          payload,
        })
      );
      const r2 = await store.write(
        makeWriteRequest({
          canonical_key: "test:key:two",
          payload,
        })
      );

      expect(r1.hash).toBe(r2.hash);
    });

    it("different payload produces different hash", async () => {
      const r1 = await store.write(
        makeWriteRequest({
          canonical_key: "test:key:one",
          payload: { a: 1 },
        })
      );
      const r2 = await store.write(
        makeWriteRequest({
          canonical_key: "test:key:two",
          payload: { a: 2 },
        })
      );

      expect(r1.hash).not.toBe(r2.hash);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-07: Déterminisme Lecture
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-07: Déterminisme Lecture", () => {
    it("100 reads of same version return identical results", async () => {
      await store.write(makeWriteRequest());

      const first = store.getByVersion("character:marie:state", 1);
      expect(first).not.toBeNull();

      for (let i = 0; i < 100; i++) {
        const read = store.getByVersion("character:marie:state", 1);
        expect(read).toEqual(first);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-08: Chain Integrity (C10)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-08: Chain Integrity", () => {
    it("verifyChain returns true for valid chain", async () => {
      for (let i = 1; i <= 5; i++) {
        await store.write(makeWriteRequest({ payload: { step: i } }));
      }

      const result = store.verifyChain("character:marie:state");
      expect(result.ok).toBe(true);
      expect(result.ok && result.value).toBe(true);
    });

    it("verifyChain returns true for empty key", () => {
      const result = store.verifyChain("nonexistent:key:here");
      expect(result.ok).toBe(true);
      expect(result.ok && result.value).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-09: Payload Size Limit (C02)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-09: Payload Size Limit", () => {
    it("rejects payload exceeding max size", async () => {
      const smallStore = new MemoryStore({ maxPayloadBytes: 100 });

      // Create payload > 100 bytes
      const largePayload = { data: "x".repeat(200) };

      const res = await smallStore.write(
        makeWriteRequest({ payload: largePayload })
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe("PAYLOAD_TOO_LARGE");
    });

    it("accepts payload within limit", async () => {
      const smallStore = new MemoryStore({ maxPayloadBytes: 1000 });

      const res = await smallStore.write(
        makeWriteRequest({ payload: { small: true } })
      );

      expect(res.success).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-10: Float Determinism (C01)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-10: Float Determinism", () => {
    it("0.1 + 0.2 produces deterministic hash", async () => {
      const r1 = await store.write(
        makeWriteRequest({
          canonical_key: "test:float:one",
          payload: { x: 0.1 + 0.2 },
        })
      );
      const r2 = await store.write(
        makeWriteRequest({
          canonical_key: "test:float:two",
          payload: { x: 0.30000000000000004 },
        })
      );

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r1.hash).toBe(r2.hash);
    });

    it("rejects NaN", async () => {
      const res = await store.write(
        makeWriteRequest({ payload: { x: NaN } })
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe("FLOAT_NOT_FINITE");
    });

    it("rejects Infinity", async () => {
      const res = await store.write(
        makeWriteRequest({ payload: { x: Infinity } })
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe("FLOAT_NOT_FINITE");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-13: Decay Existence (via appendMetaEvent)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-13: Decay Existence", () => {
    it("appendMetaEvent rejects non-existent entry", () => {
      const result = store.appendMetaEvent({
        target_entry_id: "ghost-id",
        event_type: "DECAY_MARKED",
        timestamp_utc: TS,
        payload: { decay_level: "DECAYING", decay_reason: "test" },
      });

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("ENTRY_NOT_FOUND");
    });

    it("appendMetaEvent accepts existing entry", async () => {
      const write = await store.write(makeWriteRequest());
      expect(write.success).toBe(true);

      const result = store.appendMetaEvent({
        target_entry_id: write.entry_id!,
        event_type: "DECAY_MARKED",
        timestamp_utc: TS,
        payload: { decay_level: "DECAYING", decay_reason: "test" },
      });

      expect(result.ok).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ADDITIONAL TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Additional Store Tests", () => {
    it("listKeys returns sorted keys", async () => {
      await store.write(
        makeWriteRequest({ canonical_key: "zzz:test:key" })
      );
      await store.write(
        makeWriteRequest({ canonical_key: "aaa:test:key" })
      );
      await store.write(
        makeWriteRequest({ canonical_key: "mmm:test:key" })
      );

      const keys = store.listKeys();
      expect(keys).toEqual(["aaa:test:key", "mmm:test:key", "zzz:test:key"]);
    });

    it("getStats returns correct counts", async () => {
      await store.write(
        makeWriteRequest({ canonical_key: "test:one:key" })
      );
      await store.write(
        makeWriteRequest({ canonical_key: "test:two:key" })
      );
      await store.write(
        makeWriteRequest({ canonical_key: "test:one:key" })
      );

      const stats = store.getStats();
      expect(stats.keyCount).toBe(2);
      expect(stats.entryCount).toBe(3);
    });

    it("rejects invalid timestamp", async () => {
      const res = await store.write(
        makeWriteRequest({ timestamp_utc: "not-a-timestamp" })
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe("INVALID_TIMESTAMP");
    });

    it("rejects null payload", async () => {
      const res = await store.write(
        makeWriteRequest({ payload: null })
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe("INVALID_PAYLOAD");
    });
  });
});
