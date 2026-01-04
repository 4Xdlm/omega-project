// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — digest_rules.ts
// Phase 8E — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// Example deterministic digest rules for CNC-055
// IMPORTANT: All rules MUST be pure and deterministic
// ═══════════════════════════════════════════════════════════════════════════════

import { DigestRule } from "./memory_digest";
import { MemoryEntry } from "./types";

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST_CONTEXT_V1 — Lossless provenance digest
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Rule: keep a compact structured snapshot of "what happened"
 * 
 * Deterministic summary:
 * - list sources: canonical_key@version + event_type + payload_type
 * - does NOT attempt NLP; it just condenses metadata (lossless for provenance)
 * 
 * Output format:
 * ```
 * [
 *   { key, version, event_type, payload_type, hash, timestamp_utc },
 *   ...
 * ]
 * ```
 */
export const DIGEST_CONTEXT_V1: DigestRule = Object.freeze({
  id: "DIGEST_CONTEXT_V1",
  description: "Lossless provenance digest (metadata-focused).",
  apply(sources: readonly MemoryEntry[]): unknown {
    // PURE: No side effects, no external dependencies
    return sources.map((e) =>
      Object.freeze({
        key: e.canonical_key,
        version: e.version,
        event_type: e.event_type,
        payload_type: e.payload_type,
        hash: e.hash,
        timestamp_utc: e.timestamp_utc,
      })
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST_FACTS_V1 — Extract facts only
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Rule: Extract only FACT entries
 * 
 * Filters sources to only include payload_type === "FACT"
 * Returns metadata + payload for each fact.
 */
export const DIGEST_FACTS_V1: DigestRule = Object.freeze({
  id: "DIGEST_FACTS_V1",
  description: "Extract facts with their payloads.",
  apply(sources: readonly MemoryEntry[]): unknown {
    // Filter facts only
    const facts = sources.filter((e) => e.payload_type === "FACT");

    // Return deterministic summary
    return facts.map((e) =>
      Object.freeze({
        key: e.canonical_key,
        version: e.version,
        payload: e.payload,
        timestamp_utc: e.timestamp_utc,
      })
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST_TIMELINE_V1 — Timeline summary
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Rule: Create a timeline summary
 * 
 * Sorts entries by timestamp and creates a chronological summary.
 */
export const DIGEST_TIMELINE_V1: DigestRule = Object.freeze({
  id: "DIGEST_TIMELINE_V1",
  description: "Chronological timeline digest.",
  apply(sources: readonly MemoryEntry[]): unknown {
    // Sort by timestamp (deterministic for same inputs)
    const sorted = [...sources].sort((a, b) => {
      if (a.timestamp_utc < b.timestamp_utc) return -1;
      if (a.timestamp_utc > b.timestamp_utc) return 1;
      // Tie-breaker: id
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    // Build timeline
    return Object.freeze({
      start: sorted.length > 0 ? sorted[0].timestamp_utc : null,
      end: sorted.length > 0 ? sorted[sorted.length - 1].timestamp_utc : null,
      count: sorted.length,
      events: sorted.map((e) =>
        Object.freeze({
          timestamp: e.timestamp_utc,
          key: e.canonical_key,
          event_type: e.event_type,
        })
      ),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST_KEYS_V1 — Key inventory
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Rule: Create inventory of unique keys
 * 
 * Groups entries by canonical_key and counts versions.
 */
export const DIGEST_KEYS_V1: DigestRule = Object.freeze({
  id: "DIGEST_KEYS_V1",
  description: "Inventory of canonical keys with version counts.",
  apply(sources: readonly MemoryEntry[]): unknown {
    // Group by key
    const byKey = new Map<string, number>();
    for (const e of sources) {
      byKey.set(e.canonical_key, (byKey.get(e.canonical_key) ?? 0) + 1);
    }

    // Sort keys for determinism
    const sortedKeys = Array.from(byKey.keys()).sort();

    // Build inventory
    return Object.freeze({
      total_keys: sortedKeys.length,
      total_entries: sources.length,
      keys: sortedKeys.map((k) =>
        Object.freeze({
          key: k,
          entry_count: byKey.get(k)!,
        })
      ),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST_EMOTIONS_V1 — Emotion state digest
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Rule: Extract emotion states
 * 
 * Filters sources to only include payload_type === "EMOTION_STATE"
 */
export const DIGEST_EMOTIONS_V1: DigestRule = Object.freeze({
  id: "DIGEST_EMOTIONS_V1",
  description: "Extract emotion states.",
  apply(sources: readonly MemoryEntry[]): unknown {
    const emotions = sources.filter((e) => e.payload_type === "EMOTION_STATE");

    return emotions.map((e) =>
      Object.freeze({
        key: e.canonical_key,
        version: e.version,
        payload: e.payload,
        timestamp_utc: e.timestamp_utc,
      })
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────────
// RULE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Registry of available digest rules.
 */
export const DIGEST_RULES: ReadonlyMap<string, DigestRule> = new Map([
  [DIGEST_CONTEXT_V1.id, DIGEST_CONTEXT_V1],
  [DIGEST_FACTS_V1.id, DIGEST_FACTS_V1],
  [DIGEST_TIMELINE_V1.id, DIGEST_TIMELINE_V1],
  [DIGEST_KEYS_V1.id, DIGEST_KEYS_V1],
  [DIGEST_EMOTIONS_V1.id, DIGEST_EMOTIONS_V1],
]);

/**
 * Get a rule by ID.
 */
export function getDigestRule(id: string): DigestRule | undefined {
  return DIGEST_RULES.get(id);
}

/**
 * List all available rule IDs.
 */
export function listDigestRuleIds(): readonly string[] {
  return Array.from(DIGEST_RULES.keys()).sort();
}
