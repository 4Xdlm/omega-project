// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_decay.ts
// Phase 8F — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// CNC-075: MEMORY_DECAY
// - Non destructive (entries never deleted)
// - Append-only via MetaEvents
// - Deterministic projection
// 
// CORRECTIONS:
// - C04: Decay via store uniquement (plus d'events hors store)
// - C12: Validation existence entrée avant decay
// ═══════════════════════════════════════════════════════════════════════════════

import {
  MemoryEntry,
  MemoryMetaEvent,
  DecayLevel,
  DecayDecision,
  DecayMarkedPayload,
  isDecayMarkedPayload,
  MemoryErrorCode,
  Result,
  ok,
  err,
} from "./types";
import { MemoryStore } from "./memory_store";
import { nowUtcIso } from "./canonical_encode";

// ─────────────────────────────────────────────────────────────────────────────────
// DECAY PROJECTION
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calcule l'état de decay effectif d'une entrée.
 * 
 * INV-MEM-DC3: Déterministe (même snapshot → même résultat)
 * 
 * Règles:
 * - Par défaut: ACTIVE
 * - Applique les DECAY_MARKED dans l'ordre chronologique
 * - DECAY_COMPLETED force DECAYED
 * 
 * @param entry - Entrée mémoire
 * @param metaEvents - Meta-events pour cette entrée
 * @returns État de decay effectif
 */
export function projectDecayState(
  entry: MemoryEntry,
  metaEvents: readonly MemoryMetaEvent[]
): DecayDecision {
  let level: DecayLevel = "ACTIVE";
  let reason: string | undefined;

  // Filter relevant events
  const decayEvents = metaEvents.filter(
    (e) =>
      e.target_entry_id === entry.id &&
      (e.event_type === "DECAY_MARKED" || e.event_type === "DECAY_COMPLETED")
  );

  if (decayEvents.length === 0) {
    return Object.freeze({ level });
  }

  // Sort chronologically (deterministic)
  const sorted = [...decayEvents].sort((a, b) => {
    if (a.timestamp_utc < b.timestamp_utc) return -1;
    if (a.timestamp_utc > b.timestamp_utc) return 1;
    // Tie-breaker: ID (stable)
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  // Apply events in order
  for (const evt of sorted) {
    if (evt.event_type === "DECAY_COMPLETED") {
      level = "DECAYED";
      if (isDecayMarkedPayload(evt.payload)) {
        reason = evt.payload.decay_reason;
      }
    } else if (evt.event_type === "DECAY_MARKED") {
      if (isDecayMarkedPayload(evt.payload)) {
        level = evt.payload.decay_level;
        reason = evt.payload.decay_reason;
      }
    }
  }

  return Object.freeze({ level, reason });
}

// ─────────────────────────────────────────────────────────────────────────────────
// DECAY MANAGER
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Gestionnaire de decay (wrapper sur MemoryStore).
 * 
 * C04 FIX: Toutes les opérations passent par le store.
 */
export class DecayManager {
  private readonly store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // MARK DECAY (C04 + C12 FIX)
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Marque une entrée comme DECAYING ou DECAYED.
   * 
   * INV-MEM-DC1: Non-destructif (l'entrée reste accessible)
   * INV-MEM-DC2: Via MetaEvent uniquement
   * 
   * C04 FIX: Passe par store.appendMetaEvent()
   * C12 FIX: Valide que l'entrée existe
   * 
   * @param params - Paramètres du marquage
   * @returns Meta-event créé ou erreur
   */
  markDecay(params: {
    target_entry_id: string;
    level: "DECAYING" | "DECAYED";
    reason: string;
    timestamp_utc?: string;
  }): Result<MemoryMetaEvent, MemoryErrorCode> {
    // C12 FIX: Validate entry exists
    if (!this.store.hasEntry(params.target_entry_id)) {
      return err("ENTRY_NOT_FOUND");
    }

    // Validate reason
    if (!params.reason || params.reason.trim().length === 0) {
      return err("DECAY_REASON_REQUIRED");
    }

    const payload: DecayMarkedPayload = {
      decay_level: params.level,
      decay_reason: params.reason,
    };

    // C04 FIX: Via store
    return this.store.appendMetaEvent({
      target_entry_id: params.target_entry_id,
      event_type: "DECAY_MARKED",
      timestamp_utc: params.timestamp_utc ?? nowUtcIso(),
      payload,
    });
  }

  /**
   * Complète le decay d'une entrée (force DECAYED).
   */
  completeDecay(params: {
    target_entry_id: string;
    reason: string;
    timestamp_utc?: string;
  }): Result<MemoryMetaEvent, MemoryErrorCode> {
    // Validate entry exists
    if (!this.store.hasEntry(params.target_entry_id)) {
      return err("ENTRY_NOT_FOUND");
    }

    // Validate reason
    if (!params.reason || params.reason.trim().length === 0) {
      return err("DECAY_REASON_REQUIRED");
    }

    const payload: DecayMarkedPayload = {
      decay_level: "DECAYED",
      decay_reason: params.reason,
    };

    return this.store.appendMetaEvent({
      target_entry_id: params.target_entry_id,
      event_type: "DECAY_COMPLETED",
      timestamp_utc: params.timestamp_utc ?? nowUtcIso(),
      payload,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // DECAY STATE QUERIES
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Retourne l'état de decay d'une entrée.
   */
  getDecayState(entryId: string): Result<DecayDecision, MemoryErrorCode> {
    const entry = this.store.getById(entryId);
    if (!entry) {
      return err("ENTRY_NOT_FOUND");
    }

    const metaEvents = this.store.getMetaEventsForEntry(entryId);
    return ok(projectDecayState(entry, metaEvents));
  }

  /**
   * Vérifie si une entrée est décayée.
   */
  isDecayed(entryId: string): Result<boolean, MemoryErrorCode> {
    const result = this.getDecayState(entryId);
    if (!result.ok) return result;
    return ok(result.value.level === "DECAYED");
  }

  /**
   * Vérifie si une entrée est en cours de decay.
   */
  isDecaying(entryId: string): Result<boolean, MemoryErrorCode> {
    const result = this.getDecayState(entryId);
    if (!result.ok) return result;
    return ok(result.value.level === "DECAYING");
  }

  /**
   * Vérifie si une entrée est active (non décayée).
   */
  isActive(entryId: string): Result<boolean, MemoryErrorCode> {
    const result = this.getDecayState(entryId);
    if (!result.ok) return result;
    return ok(result.value.level === "ACTIVE");
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // BULK QUERIES
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Retourne toutes les entrées décayées.
   */
  getDecayedEntries(): readonly MemoryEntry[] {
    const result: MemoryEntry[] = [];

    for (const key of this.store.listKeys()) {
      for (const entry of this.store.getHistory(key)) {
        const state = projectDecayState(
          entry,
          this.store.getMetaEventsForEntry(entry.id)
        );
        if (state.level === "DECAYED") {
          result.push(entry);
        }
      }
    }

    return result;
  }

  /**
   * Retourne toutes les entrées en cours de decay.
   */
  getDecayingEntries(): readonly MemoryEntry[] {
    const result: MemoryEntry[] = [];

    for (const key of this.store.listKeys()) {
      for (const entry of this.store.getHistory(key)) {
        const state = projectDecayState(
          entry,
          this.store.getMetaEventsForEntry(entry.id)
        );
        if (state.level === "DECAYING") {
          result.push(entry);
        }
      }
    }

    return result;
  }

  /**
   * Retourne toutes les entrées actives.
   */
  getActiveEntries(): readonly MemoryEntry[] {
    const result: MemoryEntry[] = [];

    for (const key of this.store.listKeys()) {
      for (const entry of this.store.getHistory(key)) {
        const state = projectDecayState(
          entry,
          this.store.getMetaEventsForEntry(entry.id)
        );
        if (state.level === "ACTIVE") {
          result.push(entry);
        }
      }
    }

    return result;
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // STATISTICS
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Compte les entrées par état de decay.
   */
  countByDecayLevel(): { ACTIVE: number; DECAYING: number; DECAYED: number } {
    const counts = { ACTIVE: 0, DECAYING: 0, DECAYED: 0 };

    for (const key of this.store.listKeys()) {
      for (const entry of this.store.getHistory(key)) {
        const state = projectDecayState(
          entry,
          this.store.getMetaEventsForEntry(entry.id)
        );
        counts[state.level]++;
      }
    }

    return counts;
  }
}
