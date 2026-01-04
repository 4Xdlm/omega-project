// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_tiering.ts
// Phase 8D — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// CNC-054: MEMORY_TIERING
// Auto tier changes via append-only MetaEvents.
// 
// CORRECTIONS:
// - C05: Anti-boucle (max 1 event per entry per run + cooldown)
// - C11: Rate limit (max events per run)
// - F13: localeCompare → comparaison Unicode stable
// ═══════════════════════════════════════════════════════════════════════════════

import {
  MemoryEntry,
  MemoryMetaEvent,
  MemoryTier,
  MemoryConfig,
  TieringPolicy,
  TieringAction,
  TierChangedPayload,
  AccessLoggedPayload,
  DEFAULT_TIERING_POLICY,
  DEFAULT_MEMORY_CONFIG,
  Result,
  ok,
  err,
  MemoryErrorCode,
} from "./types";
import { MemoryStore } from "./memory_store";
import { nowUtcIso } from "./canonical_encode";
import { getEffectiveTier, getLastTierChangeTimestamp } from "./memory_hybrid";

// ─────────────────────────────────────────────────────────────────────────────────
// TIME UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le nombre de jours entre deux timestamps ISO 8601.
 * Retourne toujours >= 0 (C05 FIX: clamp négatifs).
 */
function daysBetween(olderIso: string, newerIso: string): number {
  const older = Date.parse(olderIso);
  const newer = Date.parse(newerIso);
  const diff = (newer - older) / (1000 * 60 * 60 * 24);
  return Math.max(0, diff); // C05 FIX: never negative
}

/**
 * Calcule le nombre de millisecondes entre deux timestamps.
 */
function msBetween(olderIso: string, newerIso: string): number {
  const older = Date.parse(olderIso);
  const newer = Date.parse(newerIso);
  return Math.max(0, newer - older);
}

// ─────────────────────────────────────────────────────────────────────────────────
// ACCESS EVENT HELPERS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Retourne les ACCESS_LOGGED events pour une entrée.
 */
function getAccessEventsForEntry(
  entryId: string,
  metaEvents: readonly MemoryMetaEvent[]
): MemoryMetaEvent[] {
  return metaEvents.filter(
    (e) => e.target_entry_id === entryId && e.event_type === "ACCESS_LOGGED"
  );
}

/**
 * Retourne le timestamp du dernier accès.
 */
function getLatestAccessTimestamp(
  entryId: string,
  metaEvents: readonly MemoryMetaEvent[],
  fallbackIso: string
): string {
  const events = getAccessEventsForEntry(entryId, metaEvents);
  if (events.length === 0) return fallbackIso;

  // F13 FIX: Tri déterministe avec comparaison Unicode stable
  const sorted = [...events].sort((a, b) => {
    if (a.timestamp_utc < b.timestamp_utc) return -1;
    if (a.timestamp_utc > b.timestamp_utc) return 1;
    // Tie-breaker: ID comparison (stable)
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  return sorted[sorted.length - 1].timestamp_utc;
}

/**
 * Compte les accès dans une fenêtre de temps.
 */
function countAccessInWindow(
  entryId: string,
  metaEvents: readonly MemoryMetaEvent[],
  nowIso: string,
  windowDays: number
): number {
  const events = getAccessEventsForEntry(entryId, metaEvents);
  let count = 0;

  for (const e of events) {
    const ageDays = daysBetween(e.timestamp_utc, nowIso);
    if (ageDays <= windowDays) {
      count++;
    }
  }

  return count;
}

// ─────────────────────────────────────────────────────────────────────────────────
// TIERING RESULT
// ─────────────────────────────────────────────────────────────────────────────────

export interface TieringResult {
  /** Actions à appliquer */
  actions: TieringAction[];
  /** True si rate limit atteint */
  rateLimited: boolean;
  /** Nombre d'entrées analysées */
  entriesAnalyzed: number;
  /** Nombre d'entrées skippées (cooldown) */
  entriesSkipped: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// COMPUTE TIERING ACTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calcule les actions de tiering à effectuer.
 * 
 * INV-MEM-T1: Events only (ne modifie rien directement)
 * INV-MEM-T2: Idempotent (même input → même output, pas de double events)
 * INV-MEM-T3: Déterministe (ordre stable)
 * INV-MEM-12: Max 1 event per entry per run (C05 FIX)
 * 
 * @param params - Paramètres de calcul
 * @returns Résultat avec actions et statistiques
 */
export function computeTieringActions(params: {
  entries: readonly MemoryEntry[];
  metaEvents: readonly MemoryMetaEvent[];
  policy?: TieringPolicy;
  config?: MemoryConfig;
  now_utc: string;
}): TieringResult {
  const policy = params.policy ?? DEFAULT_TIERING_POLICY;
  const config = params.config ?? DEFAULT_MEMORY_CONFIG;

  const actions: TieringAction[] = [];
  let entriesSkipped = 0;

  // C05 FIX: Track entries processed in this run (INV-MEM-12)
  const processedInRun = new Set<string>();

  // F13 FIX: Tri déterministe avec comparaison Unicode stable
  const ordered = [...params.entries].sort((a, b) => {
    if (a.canonical_key < b.canonical_key) return -1;
    if (a.canonical_key > b.canonical_key) return 1;
    if (a.version !== b.version) return a.version - b.version;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  for (const entry of ordered) {
    // C05 FIX: Skip if already processed in this run
    if (processedInRun.has(entry.id)) {
      continue;
    }

    // C11 FIX: Rate limit check
    if (actions.length >= config.maxTieringEventsPerRun) {
      return {
        actions,
        rateLimited: true,
        entriesAnalyzed: ordered.length,
        entriesSkipped,
      };
    }

    // C05 FIX: Cooldown check
    if (config.tieringCooldownMs > 0) {
      const lastChange = getLastTierChangeTimestamp(entry.id, params.metaEvents);
      if (lastChange) {
        const elapsed = msBetween(lastChange, params.now_utc);
        if (elapsed < config.tieringCooldownMs) {
          entriesSkipped++;
          continue; // Skip, cooldown actif
        }
      }
    }

    // Calculate effective tier
    const effectiveTier = getEffectiveTier(entry, params.metaEvents);

    // Get last access time
    const lastAccessIso = getLatestAccessTimestamp(
      entry.id,
      params.metaEvents,
      entry.timestamp_utc
    );
    const ageDays = daysBetween(lastAccessIso, params.now_utc);

    // Count recent accesses
    const accessCount = countAccessInWindow(
      entry.id,
      params.metaEvents,
      params.now_utc,
      policy.promote_window_days
    );

    // ─── PROMOTION LOGIC (access-based) ───
    if (accessCount >= policy.promote_on_access_count) {
      if (effectiveTier === "COLD") {
        actions.push({
          kind: "TIER_CHANGED",
          target_entry_id: entry.id,
          from_tier: "COLD",
          to_tier: "WARM",
          reason: `promote_on_access>=${policy.promote_on_access_count}`,
          timestamp_utc: params.now_utc,
        });
        processedInRun.add(entry.id);
        continue;
      }
      if (effectiveTier === "WARM") {
        actions.push({
          kind: "TIER_CHANGED",
          target_entry_id: entry.id,
          from_tier: "WARM",
          to_tier: "HOT",
          reason: `promote_on_access>=${policy.promote_on_access_count}`,
          timestamp_utc: params.now_utc,
        });
        processedInRun.add(entry.id);
        continue;
      }
    }

    // ─── DEMOTION LOGIC (time-based) ───
    if (effectiveTier === "HOT" && ageDays > policy.hot_ttl_days) {
      actions.push({
        kind: "TIER_CHANGED",
        target_entry_id: entry.id,
        from_tier: "HOT",
        to_tier: "WARM",
        reason: `hot_ttl_days>${policy.hot_ttl_days}`,
        timestamp_utc: params.now_utc,
      });
      processedInRun.add(entry.id);
      continue;
    }

    if (effectiveTier === "WARM" && ageDays > policy.warm_ttl_days) {
      actions.push({
        kind: "TIER_CHANGED",
        target_entry_id: entry.id,
        from_tier: "WARM",
        to_tier: "COLD",
        reason: `warm_ttl_days>${policy.warm_ttl_days}`,
        timestamp_utc: params.now_utc,
      });
      processedInRun.add(entry.id);
      continue;
    }
  }

  return {
    actions,
    rateLimited: false,
    entriesAnalyzed: ordered.length,
    entriesSkipped,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// APPLY TIERING ACTIONS
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Applique les actions de tiering en émettant des meta-events.
 * 
 * @param store - Memory store
 * @param actions - Actions à appliquer
 * @returns Meta-events émis
 */
export function applyTieringActions(
  store: MemoryStore,
  actions: readonly TieringAction[]
): MemoryMetaEvent[] {
  const out: MemoryMetaEvent[] = [];

  for (const action of actions) {
    if (action.kind !== "TIER_CHANGED") continue;

    const payload: TierChangedPayload = {
      from_tier: action.from_tier,
      to_tier: action.to_tier,
      reason: action.reason,
    };

    const result = store.appendMetaEvent({
      target_entry_id: action.target_entry_id,
      event_type: "TIER_CHANGED",
      timestamp_utc: action.timestamp_utc,
      payload,
    });

    if (result.ok) {
      out.push(result.value);
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────
// ACCESS LOGGING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Log un accès en lecture (append-only).
 * 
 * @param store - Memory store
 * @param params - Paramètres de l'accès
 * @returns Meta-event créé ou erreur
 */
export function logAccess(
  store: MemoryStore,
  params: {
    target_entry_id: string;
    accessor: string;
    context: string;
    timestamp_utc?: string;
  }
): Result<MemoryMetaEvent, MemoryErrorCode> {
  // Validate accessor and context
  if (!params.accessor || params.accessor.trim().length === 0) {
    return err("INVALID_PAYLOAD");
  }
  if (!params.context || params.context.trim().length === 0) {
    return err("INVALID_PAYLOAD");
  }

  const payload: AccessLoggedPayload = {
    accessor: params.accessor,
    context: params.context,
  };

  return store.appendMetaEvent({
    target_entry_id: params.target_entry_id,
    event_type: "ACCESS_LOGGED",
    timestamp_utc: params.timestamp_utc ?? nowUtcIso(),
    payload,
  });
}

// ─────────────────────────────────────────────────────────────────────────────────
// TIERING STATISTICS
// ─────────────────────────────────────────────────────────────────────────────────

export interface TieringStats {
  totalEntries: number;
  byTier: { HOT: number; WARM: number; COLD: number };
  totalTierChanges: number;
  totalAccessLogs: number;
}

/**
 * Calcule les statistiques de tiering.
 */
export function getTieringStats(
  store: MemoryStore,
  metaEvents: readonly MemoryMetaEvent[]
): TieringStats {
  const byTier = { HOT: 0, WARM: 0, COLD: 0 };
  let totalTierChanges = 0;
  let totalAccessLogs = 0;

  // Count tier changes and access logs
  for (const evt of metaEvents) {
    if (evt.event_type === "TIER_CHANGED") totalTierChanges++;
    if (evt.event_type === "ACCESS_LOGGED") totalAccessLogs++;
  }

  // Count by effective tier
  for (const key of store.listKeys()) {
    for (const entry of store.getHistory(key)) {
      const tier = getEffectiveTier(entry, metaEvents);
      byTier[tier]++;
    }
  }

  return {
    totalEntries: byTier.HOT + byTier.WARM + byTier.COLD,
    byTier,
    totalTierChanges,
    totalAccessLogs,
  };
}
