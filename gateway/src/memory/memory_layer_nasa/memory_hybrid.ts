// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_hybrid.ts
// Phase 8C — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// CNC-053: MEMORY_HYBRID
// - No mutation of MemoryEntry (immutable)
// - Tier changes via MetaEvents only (append-only)
// - Short/Long term views are computed (read-time), deterministic
// 
// C08 FIX: Validation from_tier dans markTier
// ═══════════════════════════════════════════════════════════════════════════════

import {
  MemoryEntry,
  MemoryMetaEvent,
  MemoryTier,
  MemoryErrorCode,
  TierChangedPayload,
  isTierChangedPayload,
  Result,
  ok,
  err,
} from "./types";
import { MemoryStore } from "./memory_store";
import { nowUtcIso } from "./canonical_encode";

// ─────────────────────────────────────────────────────────────────────────────────
// EFFECTIVE TIER CALCULATION
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le tier effectif d'une entrée.
 * 
 * Règles:
 * - Commence avec entry.initial_tier
 * - Applique le dernier TIER_CHANGED (s'il existe)
 * - Tri déterministe: timestamp_utc ASC, puis id ASC
 * 
 * @param entry - Entrée mémoire
 * @param metaEvents - Meta-events pour cette entrée
 * @returns Tier effectif
 */
export function getEffectiveTier(
  entry: MemoryEntry,
  metaEvents: readonly MemoryMetaEvent[]
): MemoryTier {
  // Filter relevant TIER_CHANGED events
  const tierChanges = metaEvents.filter(
    (e) =>
      e.target_entry_id === entry.id &&
      e.event_type === "TIER_CHANGED" &&
      isTierChangedPayload(e.payload)
  );

  if (tierChanges.length === 0) {
    return entry.initial_tier;
  }

  // Sort deterministically: timestamp ASC, then id ASC
  const sorted = [...tierChanges].sort((a, b) => {
    const tsCmp = a.timestamp_utc.localeCompare(b.timestamp_utc);
    if (tsCmp !== 0) return tsCmp;
    return a.id.localeCompare(b.id);
  });

  // Return to_tier of the last change
  const last = sorted[sorted.length - 1];
  const payload = last.payload as TierChangedPayload;
  return payload.to_tier;
}

/**
 * Retourne le timestamp du dernier TIER_CHANGED pour une entrée.
 */
export function getLastTierChangeTimestamp(
  entryId: string,
  metaEvents: readonly MemoryMetaEvent[]
): string | null {
  const tierChanges = metaEvents.filter(
    (e) => e.target_entry_id === entryId && e.event_type === "TIER_CHANGED"
  );

  if (tierChanges.length === 0) return null;

  // Sort and get last
  const sorted = [...tierChanges].sort((a, b) =>
    a.timestamp_utc.localeCompare(b.timestamp_utc)
  );
  return sorted[sorted.length - 1].timestamp_utc;
}

// ─────────────────────────────────────────────────────────────────────────────────
// HYBRID VIEW CALCULATION
// ─────────────────────────────────────────────────────────────────────────────────

export interface HybridView {
  shortTerm: readonly MemoryEntry[];
  longTerm: readonly MemoryEntry[];
}

/**
 * Sépare les entrées en vues Short-Term et Long-Term.
 * 
 * Règle:
 * - Short-term: tier effectif = HOT ou WARM
 * - Long-term: tier effectif = COLD
 * 
 * @param entries - Entrées à classifier
 * @param metaEvents - Meta-events pour calcul du tier effectif
 * @returns Vues ST/LT
 */
export function splitHybridView(
  entries: readonly MemoryEntry[],
  metaEvents: readonly MemoryMetaEvent[]
): HybridView {
  const shortTerm: MemoryEntry[] = [];
  const longTerm: MemoryEntry[] = [];

  for (const entry of entries) {
    const tier = getEffectiveTier(entry, metaEvents);
    if (tier === "COLD") {
      longTerm.push(entry);
    } else {
      shortTerm.push(entry);
    }
  }

  return { shortTerm, longTerm };
}

// ─────────────────────────────────────────────────────────────────────────────────
// HYBRID OPTIONS
// ─────────────────────────────────────────────────────────────────────────────────

export interface MemoryHybridOptions {
  /** If true, short-term only includes latest version per key */
  latestOnlyShortTerm?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY HYBRID CLASS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Facade over MemoryStore for Hybrid views + tier changes via MetaEvents.
 */
export class MemoryHybrid {
  private readonly store: MemoryStore;
  private readonly opts: MemoryHybridOptions;

  constructor(store: MemoryStore, opts: MemoryHybridOptions = {}) {
    this.store = store;
    this.opts = opts;
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // TIER CHANGES (C08 FIX: validation from_tier)
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Marque un changement de tier via meta-event (append-only).
   * 
   * C08 FIX: Valide que from_tier correspond au tier effectif actuel.
   * 
   * @param params - Paramètres du changement
   * @returns Meta-event créé ou erreur
   */
  markTier(params: {
    target_entry_id: string;
    from_tier: MemoryTier;
    to_tier: MemoryTier;
    reason: string;
    timestamp_utc?: string;
  }): Result<MemoryMetaEvent, MemoryErrorCode> {
    // Validate entry exists
    const entry = this.store.getById(params.target_entry_id);
    if (!entry) {
      return err("ENTRY_NOT_FOUND");
    }

    // C08 FIX: Validate from_tier matches current effective tier
    const currentTier = getEffectiveTier(
      entry,
      this.store.getMetaEventsForEntry(entry.id)
    );
    if (currentTier !== params.from_tier) {
      return err("TIER_MISMATCH");
    }

    // Validate reason is non-empty
    if (!params.reason || params.reason.trim().length === 0) {
      return err("INVALID_PAYLOAD");
    }

    // Create payload
    const payload: TierChangedPayload = {
      from_tier: params.from_tier,
      to_tier: params.to_tier,
      reason: params.reason,
    };

    // Append meta-event via store
    return this.store.appendMetaEvent({
      target_entry_id: params.target_entry_id,
      event_type: "TIER_CHANGED",
      timestamp_utc: params.timestamp_utc ?? nowUtcIso(),
      payload,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // HYBRID VIEWS
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Retourne la vue hybrid pour plusieurs clés.
   * 
   * INV-MEM-H3: Déterministe pour mêmes inputs
   */
  getHybridViewForKeys(keys: readonly string[]): HybridView {
    const allEntries: MemoryEntry[] = [];

    for (const key of keys) {
      const history = this.store.getHistory(key);

      if (this.opts.latestOnlyShortTerm) {
        // Only include latest version
        if (history.length > 0) {
          allEntries.push(history[history.length - 1]);
        }
      } else {
        // Include all versions
        allEntries.push(...history);
      }
    }

    // C09 FIX: Optimized - collect meta-events once
    const metaEvents: MemoryMetaEvent[] = [];
    const seenEntryIds = new Set<string>();

    for (const entry of allEntries) {
      if (!seenEntryIds.has(entry.id)) {
        seenEntryIds.add(entry.id);
        metaEvents.push(...this.store.getMetaEventsForEntry(entry.id));
      }
    }

    return splitHybridView(allEntries, metaEvents);
  }

  /**
   * Retourne la vue hybrid pour une seule clé.
   */
  getHybridViewForKey(key: string): HybridView {
    return this.getHybridViewForKeys([key]);
  }

  /**
   * Retourne la vue hybrid globale (toutes les clés).
   */
  getGlobalHybridView(): HybridView {
    const keys = this.store.listKeys();
    return this.getHybridViewForKeys(keys);
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // TIER QUERIES
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Retourne le tier effectif d'une entrée.
   */
  getEffectiveTierForEntry(entryId: string): Result<MemoryTier, MemoryErrorCode> {
    const entry = this.store.getById(entryId);
    if (!entry) {
      return err("ENTRY_NOT_FOUND");
    }

    const tier = getEffectiveTier(
      entry,
      this.store.getMetaEventsForEntry(entryId)
    );
    return ok(tier);
  }

  /**
   * Retourne toutes les entrées d'un tier spécifique.
   */
  getEntriesByTier(tier: MemoryTier): readonly MemoryEntry[] {
    const result: MemoryEntry[] = [];

    for (const key of this.store.listKeys()) {
      for (const entry of this.store.getHistory(key)) {
        const effectiveTier = getEffectiveTier(
          entry,
          this.store.getMetaEventsForEntry(entry.id)
        );
        if (effectiveTier === tier) {
          result.push(entry);
        }
      }
    }

    return result;
  }

  /**
   * Compte les entrées par tier.
   */
  countByTier(): { HOT: number; WARM: number; COLD: number } {
    const counts = { HOT: 0, WARM: 0, COLD: 0 };

    for (const key of this.store.listKeys()) {
      for (const entry of this.store.getHistory(key)) {
        const tier = getEffectiveTier(
          entry,
          this.store.getMetaEventsForEntry(entry.id)
        );
        counts[tier]++;
      }
    }

    return counts;
  }
}
