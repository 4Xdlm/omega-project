// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_snapshot.ts
// Phase 8 — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// C03 FIX: Snapshot system pour INV-MEM-07 et INV-MEM-11
// Garantit: même snapshot_id → même résultat de lecture (éternellement)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  MemoryEntry,
  MemoryMetaEvent,
  MemorySnapshot,
  MemoryErrorCode,
  Result,
  ok,
  err,
} from "./types";
import { MemoryStore } from "./memory_store";
import { sha256Hex, uuid, nowUtcIso } from "./canonical_encode";

// ─────────────────────────────────────────────────────────────────────────────────
// SNAPSHOT INDEX (structure interne figée)
// ─────────────────────────────────────────────────────────────────────────────────

interface SnapshotIndex {
  /** Map: canonical_key → [entry_ids in version order] */
  readonly entriesByKey: ReadonlyMap<string, readonly string[]>;
  /** Map: entry_id → MemoryEntry (copie figée) */
  readonly entriesById: ReadonlyMap<string, MemoryEntry>;
  /** Liste des meta-events au moment du snapshot */
  readonly metaEventIds: readonly string[];
  /** Map: entry_id → [meta_event_ids] */
  readonly metaByEntryId: ReadonlyMap<string, readonly string[]>;
  /** Map: meta_event_id → MemoryMetaEvent */
  readonly metaEventsById: ReadonlyMap<string, MemoryMetaEvent>;
}

interface StoredSnapshot {
  readonly snapshot: MemorySnapshot;
  readonly index: SnapshotIndex;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SNAPSHOT MANAGER
// ─────────────────────────────────────────────────────────────────────────────────

export class SnapshotManager {
  private readonly store: MemoryStore;
  private readonly snapshots: Map<string, StoredSnapshot> = new Map();

  constructor(store: MemoryStore) {
    this.store = store;
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // CREATE SNAPSHOT
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Crée un snapshot de l'état actuel.
   * 
   * INV-MEM-11: Le snapshot est figé — les lectures retournent toujours
   * les mêmes valeurs, même si le store continue d'évoluer.
   */
  createSnapshot(): MemorySnapshot {
    const keys = this.store.listKeys();
    
    // Build entry index
    const entriesByKey = new Map<string, string[]>();
    const entriesById = new Map<string, MemoryEntry>();
    const chainHashes: string[] = [];
    let entryCount = 0;

    for (const key of keys) {
      const history = this.store.getHistory(key);
      const entryIds: string[] = [];

      for (const entry of history) {
        entryIds.push(entry.id);
        entriesById.set(entry.id, entry);
        entryCount++;
      }

      entriesByKey.set(key, entryIds);

      // Collect last chain_hash for root hash calculation
      if (history.length > 0) {
        chainHashes.push(history[history.length - 1].chain_hash);
      }
    }

    // Build meta-event index
    const allMetaEvents = this.store.getAllMetaEvents();
    const metaEventIds: string[] = [];
    const metaEventsById = new Map<string, MemoryMetaEvent>();
    const metaByEntryId = new Map<string, string[]>();

    for (const evt of allMetaEvents) {
      metaEventIds.push(evt.id);
      metaEventsById.set(evt.id, evt);

      const existing = metaByEntryId.get(evt.target_entry_id) ?? [];
      metaByEntryId.set(evt.target_entry_id, [...existing, evt.id]);
    }

    // Calculate root hash (merkle-like)
    // Sort chain hashes for determinism, then hash the concatenation
    const sortedHashes = chainHashes.sort();
    const rootHash = sha256Hex(sortedHashes.join(":") || "EMPTY");

    // Create snapshot metadata
    const snapshot: MemorySnapshot = Object.freeze({
      id: uuid(),
      created_at_utc: nowUtcIso(),
      root_hash: rootHash,
      entry_count: entryCount,
      meta_event_count: allMetaEvents.length,
    });

    // Create frozen index
    const index: SnapshotIndex = {
      entriesByKey: new Map(entriesByKey),
      entriesById: new Map(entriesById),
      metaEventIds: Object.freeze([...metaEventIds]),
      metaByEntryId: new Map(metaByEntryId),
      metaEventsById: new Map(metaEventsById),
    };

    // Store snapshot
    this.snapshots.set(snapshot.id, { snapshot, index });

    return snapshot;
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // READ AT SNAPSHOT
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Retourne une entrée par version au moment du snapshot.
   * 
   * INV-MEM-07: Déterministe via snapshot_id
   * INV-MEM-11: Figé éternellement
   */
  getByVersion(
    snapshotId: string,
    canonicalKey: string,
    version: number
  ): Result<MemoryEntry | null, MemoryErrorCode> {
    const stored = this.snapshots.get(snapshotId);
    if (!stored) {
      return err("SNAPSHOT_NOT_FOUND");
    }

    const entryIds = stored.index.entriesByKey.get(canonicalKey);
    if (!entryIds || version < 1 || version > entryIds.length) {
      return ok(null);
    }

    const entryId = entryIds[version - 1];
    const entry = stored.index.entriesById.get(entryId);
    return ok(entry ?? null);
  }

  /**
   * Retourne la dernière version au moment du snapshot.
   */
  getLatest(
    snapshotId: string,
    canonicalKey: string
  ): Result<MemoryEntry | null, MemoryErrorCode> {
    const stored = this.snapshots.get(snapshotId);
    if (!stored) {
      return err("SNAPSHOT_NOT_FOUND");
    }

    const entryIds = stored.index.entriesByKey.get(canonicalKey);
    if (!entryIds || entryIds.length === 0) {
      return ok(null);
    }

    const lastId = entryIds[entryIds.length - 1];
    const entry = stored.index.entriesById.get(lastId);
    return ok(entry ?? null);
  }

  /**
   * Retourne l'historique complet au moment du snapshot.
   */
  getHistory(
    snapshotId: string,
    canonicalKey: string
  ): Result<readonly MemoryEntry[], MemoryErrorCode> {
    const stored = this.snapshots.get(snapshotId);
    if (!stored) {
      return err("SNAPSHOT_NOT_FOUND");
    }

    const entryIds = stored.index.entriesByKey.get(canonicalKey);
    if (!entryIds) {
      return ok([]);
    }

    const entries: MemoryEntry[] = [];
    for (const id of entryIds) {
      const entry = stored.index.entriesById.get(id);
      if (entry) entries.push(entry);
    }
    return ok(entries);
  }

  /**
   * Retourne une entrée par ID au moment du snapshot.
   */
  getById(
    snapshotId: string,
    entryId: string
  ): Result<MemoryEntry | null, MemoryErrorCode> {
    const stored = this.snapshots.get(snapshotId);
    if (!stored) {
      return err("SNAPSHOT_NOT_FOUND");
    }

    const entry = stored.index.entriesById.get(entryId);
    return ok(entry ?? null);
  }

  /**
   * Liste les clés au moment du snapshot.
   */
  listKeys(snapshotId: string): Result<readonly string[], MemoryErrorCode> {
    const stored = this.snapshots.get(snapshotId);
    if (!stored) {
      return err("SNAPSHOT_NOT_FOUND");
    }

    return ok(Array.from(stored.index.entriesByKey.keys()).sort());
  }

  /**
   * Retourne les meta-events pour une entrée au moment du snapshot.
   */
  getMetaEventsForEntry(
    snapshotId: string,
    entryId: string
  ): Result<readonly MemoryMetaEvent[], MemoryErrorCode> {
    const stored = this.snapshots.get(snapshotId);
    if (!stored) {
      return err("SNAPSHOT_NOT_FOUND");
    }

    const metaIds = stored.index.metaByEntryId.get(entryId);
    if (!metaIds) {
      return ok([]);
    }

    const events: MemoryMetaEvent[] = [];
    for (const id of metaIds) {
      const evt = stored.index.metaEventsById.get(id);
      if (evt) events.push(evt);
    }
    return ok(events);
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // SNAPSHOT MANAGEMENT
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Retourne les métadonnées d'un snapshot.
   */
  getSnapshot(snapshotId: string): MemorySnapshot | null {
    const stored = this.snapshots.get(snapshotId);
    return stored?.snapshot ?? null;
  }

  /**
   * Vérifie si un snapshot existe.
   */
  hasSnapshot(snapshotId: string): boolean {
    return this.snapshots.has(snapshotId);
  }

  /**
   * Liste tous les snapshots (triés par date de création).
   */
  listSnapshots(): readonly MemorySnapshot[] {
    return Array.from(this.snapshots.values())
      .map((s) => s.snapshot)
      .sort((a, b) => a.created_at_utc.localeCompare(b.created_at_utc));
  }

  /**
   * Supprime un snapshot (libère la mémoire).
   * Note: Ceci est acceptable car les snapshots sont des copies.
   */
  deleteSnapshot(snapshotId: string): boolean {
    return this.snapshots.delete(snapshotId);
  }

  /**
   * Retourne le nombre de snapshots stockés.
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }

  /**
   * Vérifie l'intégrité d'un snapshot en recalculant le root_hash.
   */
  verifySnapshot(snapshotId: string): Result<boolean, MemoryErrorCode> {
    const stored = this.snapshots.get(snapshotId);
    if (!stored) {
      return err("SNAPSHOT_NOT_FOUND");
    }

    // Recalculate root hash
    const chainHashes: string[] = [];
    for (const key of stored.index.entriesByKey.keys()) {
      const entryIds = stored.index.entriesByKey.get(key)!;
      if (entryIds.length > 0) {
        const lastId = entryIds[entryIds.length - 1];
        const entry = stored.index.entriesById.get(lastId);
        if (entry) {
          chainHashes.push(entry.chain_hash);
        }
      }
    }

    const sortedHashes = chainHashes.sort();
    const expectedRootHash = sha256Hex(sortedHashes.join(":") || "EMPTY");

    return ok(stored.snapshot.root_hash === expectedRootHash);
  }
}
