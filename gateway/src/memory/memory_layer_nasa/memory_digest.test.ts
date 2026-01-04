// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_digest.test.ts
// Phase 8E — NASA-Grade L4 / DO-178C Level A
// 
// INV-MEM-D1: Non-Destructive
// INV-MEM-D2: Complete Traceability
// INV-MEM-D3: Reproducibility
// INV-MEM-D4: Append-Only Updates
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore } from "./memory_store";
import {
  buildDigestPayload,
  validateDigestSources,
  sortSourcesDeterministic,
  isDigestEntry,
  getDigestSourceIds,
  verifyDigestIntegrity,
  DIGEST_PAYLOAD_TYPE,
  DIGEST_EVENT_TYPE,
} from "./memory_digest";
import { createAndWriteDigest, getDigestSources } from "./memory_digest_writer";
import { DIGEST_CONTEXT_V1, DIGEST_TIMELINE_V1 } from "./digest_rules";
import { MemoryWriteRequest, MemoryEntry } from "./types";

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

describe("memory_digest — Phase 8E Invariants", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-D1: Non-Destructive
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-D1: Non-Destructive", () => {
    it("creating digest does not modify source entries", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:one" })
      );
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:two" })
      );

      const entry1Before = store.getById(w1.entry_id!);
      const entry2Before = store.getById(w2.entry_id!);

      const sources = [entry1Before!, entry2Before!];

      // Create digest
      await createAndWriteDigest({
        store,
        canonical_key: "digest:context:chapter_01",
        sources,
        rule: DIGEST_CONTEXT_V1,
        timestamp_utc: TS,
      });

      // Original entries unchanged
      const entry1After = store.getById(w1.entry_id!);
      const entry2After = store.getById(w2.entry_id!);

      expect(entry1After).toEqual(entry1Before);
      expect(entry2After).toEqual(entry2Before);
    });

    it("source entries remain accessible after digest", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:one" })
      );

      const sources = [store.getById(w1.entry_id!)!];

      await createAndWriteDigest({
        store,
        canonical_key: "digest:context:chapter_01",
        sources,
        rule: DIGEST_CONTEXT_V1,
        timestamp_utc: TS,
      });

      // Can still read source
      const entry = store.getById(w1.entry_id!);
      expect(entry).not.toBeNull();
      expect((entry!.payload as any).hp).toBe(10);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-D2: Complete Traceability
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-D2: Complete Traceability", () => {
    it("digest references all sources (id/version/hash)", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:one" })
      );
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:two" })
      );

      const entry1 = store.getById(w1.entry_id!)!;
      const entry2 = store.getById(w2.entry_id!)!;

      const result = buildDigestPayload({
        sources: [entry1, entry2],
        rule: DIGEST_CONTEXT_V1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sources).toHaveLength(2);

        // Check first source reference
        expect(result.value.sources[0].entry_id).toBe(entry1.id);
        expect(result.value.sources[0].version).toBe(entry1.version);
        expect(result.value.sources[0].hash).toBe(entry1.hash);

        // Check second source reference
        expect(result.value.sources[1].entry_id).toBe(entry2.id);
        expect(result.value.sources[1].version).toBe(entry2.version);
        expect(result.value.sources[1].hash).toBe(entry2.hash);
      }
    });

    it("digest stores rule_id for traceability", async () => {
      const w1 = await store.write(makeWriteRequest());
      const entry = store.getById(w1.entry_id!)!;

      const result = buildDigestPayload({
        sources: [entry],
        rule: DIGEST_CONTEXT_V1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.rule_id).toBe("DIGEST_CONTEXT_V1");
      }
    });

    it("can retrieve source entries from digest", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:one" })
      );
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:two" })
      );

      const sources = [store.getById(w1.entry_id!)!, store.getById(w2.entry_id!)!];

      const digestResult = await createAndWriteDigest({
        store,
        canonical_key: "digest:context:chapter_01",
        sources,
        rule: DIGEST_CONTEXT_V1,
        timestamp_utc: TS,
      });

      expect(digestResult.ok).toBe(true);
      if (digestResult.ok) {
        const digestEntry = store.getById(digestResult.value.entry_id!)!;
        const retrievedSources = getDigestSources(store, digestEntry);

        expect(retrievedSources.size).toBe(2);
        expect(retrievedSources.has(w1.entry_id!)).toBe(true);
        expect(retrievedSources.has(w2.entry_id!)).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-D3: Reproducibility
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-D3: Reproducibility", () => {
    it("same sources + same rule = same payload hash", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:one" })
      );
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:two" })
      );

      const sources = [store.getById(w1.entry_id!)!, store.getById(w2.entry_id!)!];

      const result1 = buildDigestPayload({
        sources,
        rule: DIGEST_CONTEXT_V1,
      });

      const result2 = buildDigestPayload({
        sources,
        rule: DIGEST_CONTEXT_V1,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);

      // Deep equality
      expect(result1).toEqual(result2);
    });

    it("different source order (after sorting) produces same payload", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "aaa:source:one" })
      );
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "zzz:source:two" })
      );

      const entry1 = store.getById(w1.entry_id!)!;
      const entry2 = store.getById(w2.entry_id!)!;

      // Different input orders
      const sorted1 = sortSourcesDeterministic([entry1, entry2]);
      const sorted2 = sortSourcesDeterministic([entry2, entry1]);

      // Same sorted order
      expect(sorted1[0].id).toBe(sorted2[0].id);
      expect(sorted1[1].id).toBe(sorted2[1].id);

      // Same payload
      const result1 = buildDigestPayload({ sources: sorted1, rule: DIGEST_CONTEXT_V1 });
      const result2 = buildDigestPayload({ sources: sorted2, rule: DIGEST_CONTEXT_V1 });

      expect(result1).toEqual(result2);
    });

    it("sortSourcesDeterministic is stable", async () => {
      const writes = [];
      for (let i = 0; i < 10; i++) {
        writes.push(
          await store.write(
            makeWriteRequest({
              canonical_key: `test:source:num${(Math.random() * 100).toFixed(0).padStart(3, "0")}`,
            })
          )
        );
      }

      const sources = writes.map((w) => store.getById(w.entry_id!)!);

      // Sort multiple times
      const sorted1 = sortSourcesDeterministic(sources);
      const sorted2 = sortSourcesDeterministic([...sources].reverse());
      const sorted3 = sortSourcesDeterministic(sources);

      // All produce same order
      expect(sorted1.map((e) => e.id)).toEqual(sorted2.map((e) => e.id));
      expect(sorted1.map((e) => e.id)).toEqual(sorted3.map((e) => e.id));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INV-MEM-D4: Append-Only Updates
  // ─────────────────────────────────────────────────────────────────────────────

  describe("INV-MEM-D4: Append-Only Updates", () => {
    it("updating digest creates new entry (new version)", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:one" })
      );

      const sources = [store.getById(w1.entry_id!)!];

      // First digest
      const d1 = await createAndWriteDigest({
        store,
        canonical_key: "digest:context:chapter_01",
        sources,
        rule: DIGEST_CONTEXT_V1,
        timestamp_utc: "2026-01-01T00:00:00Z",
      });

      // Add more sources
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:two" })
      );

      const newSources = [
        store.getById(w1.entry_id!)!,
        store.getById(w2.entry_id!)!,
      ];

      // Second digest (same key = new version)
      const d2 = await createAndWriteDigest({
        store,
        canonical_key: "digest:context:chapter_01",
        sources: newSources,
        rule: DIGEST_CONTEXT_V1,
        timestamp_utc: "2026-01-02T00:00:00Z",
      });

      expect(d1.ok).toBe(true);
      expect(d2.ok).toBe(true);

      if (d1.ok && d2.ok) {
        expect(d2.value.version).toBe(2);

        // Both versions accessible
        const v1 = store.getByVersion("digest:context:chapter_01", 1);
        const v2 = store.getByVersion("digest:context:chapter_01", 2);

        expect(v1).not.toBeNull();
        expect(v2).not.toBeNull();
        expect(v1!.id).not.toBe(v2!.id);
      }
    });

    it("digest uses DIGEST_CREATED event type", async () => {
      const w1 = await store.write(makeWriteRequest());

      const result = await createAndWriteDigest({
        store,
        canonical_key: "digest:context:chapter_01",
        sources: [store.getById(w1.entry_id!)!],
        rule: DIGEST_CONTEXT_V1,
        timestamp_utc: TS,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const digestEntry = store.getById(result.value.entry_id!)!;
        expect(digestEntry.event_type).toBe(DIGEST_EVENT_TYPE);
        expect(digestEntry.payload_type).toBe(DIGEST_PAYLOAD_TYPE);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Validation", () => {
    it("rejects empty sources", () => {
      const result = validateDigestSources([]);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("DIGEST_NO_SOURCES");
    });

    it("rejects duplicate sources", async () => {
      const w1 = await store.write(makeWriteRequest());
      const entry = store.getById(w1.entry_id!)!;

      const result = validateDigestSources([entry, entry]);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toBe("DIGEST_DUPLICATE_SOURCE");
    });

    it("accepts valid sources", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:one" })
      );
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:two" })
      );

      const result = validateDigestSources([
        store.getById(w1.entry_id!)!,
        store.getById(w2.entry_id!)!,
      ]);

      expect(result.ok).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Utilities", () => {
    it("isDigestEntry correctly identifies digests", async () => {
      const w1 = await store.write(makeWriteRequest());
      const normalEntry = store.getById(w1.entry_id!)!;

      expect(isDigestEntry(normalEntry)).toBe(false);

      const digestResult = await createAndWriteDigest({
        store,
        canonical_key: "digest:context:chapter_01",
        sources: [normalEntry],
        rule: DIGEST_CONTEXT_V1,
        timestamp_utc: TS,
      });

      if (digestResult.ok) {
        const digestEntry = store.getById(digestResult.value.entry_id!)!;
        expect(isDigestEntry(digestEntry)).toBe(true);
      }
    });

    it("getDigestSourceIds extracts source IDs", async () => {
      const w1 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:one" })
      );
      const w2 = await store.write(
        makeWriteRequest({ canonical_key: "test:source:two" })
      );

      const sources = [store.getById(w1.entry_id!)!, store.getById(w2.entry_id!)!];

      const digestResult = await createAndWriteDigest({
        store,
        canonical_key: "digest:context:chapter_01",
        sources,
        rule: DIGEST_CONTEXT_V1,
        timestamp_utc: TS,
      });

      if (digestResult.ok) {
        const digestEntry = store.getById(digestResult.value.entry_id!)!;
        const sourceIds = getDigestSourceIds(digestEntry);

        expect(sourceIds).toHaveLength(2);
        expect(sourceIds).toContain(w1.entry_id);
        expect(sourceIds).toContain(w2.entry_id);
      }
    });

    it("verifyDigestIntegrity checks source hashes", async () => {
      const w1 = await store.write(makeWriteRequest());
      const sources = [store.getById(w1.entry_id!)!];

      const digestResult = await createAndWriteDigest({
        store,
        canonical_key: "digest:context:chapter_01",
        sources,
        rule: DIGEST_CONTEXT_V1,
        timestamp_utc: TS,
      });

      if (digestResult.ok) {
        const digestEntry = store.getById(digestResult.value.entry_id!)!;
        const sourceMap = new Map([[w1.entry_id!, store.getById(w1.entry_id!)!]]);

        expect(verifyDigestIntegrity(digestEntry, sourceMap)).toBe(true);

        // With wrong entry - should fail
        const wrongMap = new Map<string, MemoryEntry>();
        expect(verifyDigestIntegrity(digestEntry, wrongMap)).toBe(false);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Digest Rules
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Digest Rules", () => {
    it("DIGEST_CONTEXT_V1 produces metadata summary", async () => {
      const w1 = await store.write(makeWriteRequest());
      const entry = store.getById(w1.entry_id!)!;

      const result = buildDigestPayload({
        sources: [entry],
        rule: DIGEST_CONTEXT_V1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const summary = result.value.summary as any[];
        expect(summary).toHaveLength(1);
        expect(summary[0].key).toBe("character:marie:state");
        expect(summary[0].event_type).toBe("FACT_ESTABLISHED");
      }
    });

    it("DIGEST_TIMELINE_V1 produces chronological summary", async () => {
      const w1 = await store.write(
        makeWriteRequest({
          canonical_key: "test:source:one",
          timestamp_utc: "2026-01-01T00:00:00Z",
        })
      );
      const w2 = await store.write(
        makeWriteRequest({
          canonical_key: "test:source:two",
          timestamp_utc: "2026-01-03T00:00:00Z",
        })
      );

      const sources = [store.getById(w1.entry_id!)!, store.getById(w2.entry_id!)!];

      const result = buildDigestPayload({
        sources,
        rule: DIGEST_TIMELINE_V1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const summary = result.value.summary as any;
        expect(summary.start).toBe("2026-01-01T00:00:00Z");
        expect(summary.end).toBe("2026-01-03T00:00:00Z");
        expect(summary.count).toBe(2);
      }
    });
  });
});
