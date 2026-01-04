// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_store.ts
// Phase 8 — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// CORRECTIONS APPLIQUÉES:
// - C02: MAX_PAYLOAD_SIZE validation
// - C07: listKeys() API
// - C09: Index optimisé metaByEntryId
// - C10: verifyChain() pour INV-MEM-08
// - F06: Mutex pour async safety
// ═══════════════════════════════════════════════════════════════════════════════

import {
  MemoryEntry,
  MemoryMetaEvent,
  MemoryWriteRequest,
  MemoryWriteResponse,
  MemoryConfig,
  MemoryErrorCode,
  DEFAULT_MEMORY_CONFIG,
  RippleEventType,
  Result,
  ok,
  err,
} from "./types";
import {
  canonicalEncode,
  sha256Hex,
  uuid,
  nowUtcIso,
  isIso8601UtcZ,
  byteLength,
  chainHashFirst,
  chainHashNext,
  CanonicalEncodeError,
} from "./canonical_encode";
import { isValidCanonicalKey } from "./canonical_key";

// ─────────────────────────────────────────────────────────────────────────────────
// VALID EVENT TYPES (pour validation)
// ─────────────────────────────────────────────────────────────────────────────────

const VALID_RIPPLE_EVENT_TYPES: ReadonlySet<RippleEventType> = new Set([
  "FACT_ESTABLISHED",
  "FACT_PROPAGATED",
  "EMOTION_SHIFTED",
  "RELATION_CHANGED",
  "PROMISE_CREATED",
  "PROMISE_RESOLVED",
  "PROMISE_BROKEN",
  "TIMELINE_ADVANCED",
  "DIGEST_CREATED",
]);

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY STORE CLASS
// ─────────────────────────────────────────────────────────────────────────────────

export class MemoryStore {
  // Configuration
  private readonly config: Readonly<MemoryConfig>;

  // Primary storage (append-only)
  private readonly entriesByKey: Map<string, MemoryEntry[]> = new Map();
  private readonly entryById: Map<string, MemoryEntry> = new Map();

  // Meta events (append-only)
  private readonly metaEvents: MemoryMetaEvent[] = [];
  // C09 FIX: Index optimisé pour lookup O(1)
  private readonly metaByEntryId: Map<string, MemoryMetaEvent[]> = new Map();

  // F06 FIX: Mutex pour async safety
  private writeQueue: Promise<void> = Promise.resolve();
  private isWriting = false;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = Object.freeze({ ...DEFAULT_MEMORY_CONFIG, ...config });
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // MUTEX (F06 FIX)
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Exécute une fonction avec le mutex.
   * Garantit qu'une seule opération d'écriture s'exécute à la fois.
   */
  private async withLock<T>(fn: () => T): Promise<T> {
    // Capture la queue actuelle
    const previousQueue = this.writeQueue;

    // Créer une nouvelle promesse pour la queue
    let resolve: () => void;
    this.writeQueue = new Promise((r) => {
      resolve = r;
    });

    // Attendre les opérations précédentes
    await previousQueue;

    // Exécuter l'opération
    this.isWriting = true;
    try {
      return fn();
    } finally {
      this.isWriting = false;
      resolve!();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // WRITE OPERATIONS
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Écrit une nouvelle entrée en mémoire (async avec mutex).
   * 
   * INV-MEM-01: Append-only (nouvelle entrée, jamais de modification)
   * INV-MEM-02: Source unique (RIPPLE_ENGINE only)
   * INV-MEM-03: Versionnement (auto-increment)
   * INV-MEM-04: Indexation canonique (clé validée)
   * INV-MEM-05: Hash déterministe (CANONICAL_ENCODE)
   */
  async write(req: MemoryWriteRequest): Promise<MemoryWriteResponse> {
    return this.withLock(() => this.writeSync(req));
  }

  /**
   * Version synchrone de write (appelée via mutex).
   */
  private writeSync(req: MemoryWriteRequest): MemoryWriteResponse {
    // ─── VALIDATION INV-MEM-02: Source unique ───
    if (!req || req.source !== "RIPPLE_ENGINE") {
      return { success: false, error: "INVALID_SOURCE" };
    }

    // ─── VALIDATION INV-MEM-04: Clé canonique ───
    if (!isValidCanonicalKey(req.canonical_key)) {
      return { success: false, error: "INVALID_KEY" };
    }

    // ─── VALIDATION: Event type ───
    if (!VALID_RIPPLE_EVENT_TYPES.has(req.event_type)) {
      return { success: false, error: "INVALID_EVENT_TYPE" };
    }

    // ─── VALIDATION: Payload non null ───
    if (req.payload === null || req.payload === undefined) {
      return { success: false, error: "INVALID_PAYLOAD" };
    }

    // ─── VALIDATION: Timestamp ISO 8601 ───
    if (!isIso8601UtcZ(req.timestamp_utc)) {
      return { success: false, error: "INVALID_TIMESTAMP" };
    }

    // ─── C02 FIX: Payload size check ───
    let encoded: string;
    try {
      encoded = canonicalEncode(req.payload);
    } catch (e) {
      if (e instanceof CanonicalEncodeError) {
        if (e.code === "FLOAT_NOT_FINITE") {
          return { success: false, error: "FLOAT_NOT_FINITE" };
        }
      }
      return { success: false, error: "INVALID_PAYLOAD" };
    }

    const payloadBytes = byteLength(encoded);
    if (payloadBytes > this.config.maxPayloadBytes) {
      return { success: false, error: "PAYLOAD_TOO_LARGE" };
    }

    // ─── Get existing history ───
    const list = this.entriesByKey.get(req.canonical_key) ?? [];

    // ─── Check max entries per key ───
    if (list.length >= this.config.maxEntriesPerKey) {
      return { success: false, error: "RATE_LIMITED" };
    }

    const previous = list.length > 0 ? list[list.length - 1] : null;

    // ─── INV-MEM-03: Version auto-increment ───
    const version = previous ? previous.version + 1 : 1;

    // ─── Timestamps ───
    const ingested_at_utc = nowUtcIso();

    // ─── INV-MEM-05: Hash déterministe ───
    const hash = sha256Hex(encoded);

    // ─── Chain hash (per canonical_key) ───
    const chain_hash = previous
      ? chainHashNext(previous.chain_hash, hash)
      : chainHashFirst(req.canonical_key, hash);

    // ─── INV-MEM-01: Create immutable entry ───
    const entry: MemoryEntry = Object.freeze({
      id: uuid(),
      canonical_key: req.canonical_key,
      version,

      payload: req.payload,
      payload_type: req.payload_type,

      source: "RIPPLE_ENGINE",
      event_type: req.event_type,
      timestamp_utc: req.timestamp_utc,
      ingested_at_utc,

      previous_entry_id: previous ? previous.id : null,

      hash,
      chain_hash,

      initial_tier: req.initial_tier ?? this.config.defaultTier,
      payload_bytes: payloadBytes,
    });

    // ─── INV-MEM-01: Append-only storage ───
    const nextList = [...list, entry];
    this.entriesByKey.set(req.canonical_key, nextList);
    this.entryById.set(entry.id, entry);

    return {
      success: true,
      entry_id: entry.id,
      version: entry.version,
      hash: entry.hash,
      chain_hash: entry.chain_hash,
      ingested_at_utc: entry.ingested_at_utc,
      payload_bytes: payloadBytes,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // READ OPERATIONS
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Retourne la dernière version d'une clé.
   */
  getLatest(canonicalKey: string): MemoryEntry | null {
    const list = this.entriesByKey.get(canonicalKey);
    if (!list || list.length === 0) return null;
    return list[list.length - 1];
  }

  /**
   * Retourne une version spécifique d'une clé.
   * INV-MEM-07: Déterministe (même key + version = même résultat)
   */
  getByVersion(canonicalKey: string, version: number): MemoryEntry | null {
    const list = this.entriesByKey.get(canonicalKey);
    if (!list) return null;
    // Version 1-indexed
    if (version < 1 || version > list.length) return null;
    return list[version - 1];
  }

  /**
   * Retourne l'historique complet d'une clé (toutes les versions).
   */
  getHistory(canonicalKey: string): readonly MemoryEntry[] {
    const list = this.entriesByKey.get(canonicalKey);
    return list ? [...list] : [];
  }

  /**
   * Retourne une entrée par son ID.
   */
  getById(entryId: string): MemoryEntry | null {
    return this.entryById.get(entryId) ?? null;
  }

  /**
   * Vérifie si une entrée existe.
   */
  hasEntry(entryId: string): boolean {
    return this.entryById.has(entryId);
  }

  /**
   * C07 FIX: Liste toutes les clés canoniques.
   * Retourne les clés triées pour déterminisme.
   */
  listKeys(): readonly string[] {
    return Array.from(this.entriesByKey.keys()).sort();
  }

  /**
   * Retourne le nombre total d'entrées.
   */
  getEntryCount(): number {
    return this.entryById.size;
  }

  /**
   * Retourne le nombre de clés distinctes.
   */
  getKeyCount(): number {
    return this.entriesByKey.size;
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // META EVENTS
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Ajoute un meta-event (append-only).
   * C04 FIX: Point d'entrée unique pour meta-events.
   */
  appendMetaEvent(
    evt: Omit<MemoryMetaEvent, "id">
  ): Result<MemoryMetaEvent, MemoryErrorCode> {
    // C12 FIX: Validate target entry exists
    if (!this.entryById.has(evt.target_entry_id)) {
      return err("ENTRY_NOT_FOUND");
    }

    const full: MemoryMetaEvent = Object.freeze({
      id: uuid(),
      target_entry_id: evt.target_entry_id,
      event_type: evt.event_type,
      timestamp_utc: evt.timestamp_utc,
      payload: Object.freeze({ ...evt.payload }),
    });

    // Append to global list
    this.metaEvents.push(full);

    // C09 FIX: Update index
    const existing = this.metaByEntryId.get(evt.target_entry_id) ?? [];
    this.metaByEntryId.set(evt.target_entry_id, [...existing, full]);

    return ok(full);
  }

  /**
   * C09 FIX: Retourne les meta-events pour une entrée (O(1) via index).
   */
  getMetaEventsForEntry(entryId: string): readonly MemoryMetaEvent[] {
    return this.metaByEntryId.get(entryId) ?? [];
  }

  /**
   * Retourne tous les meta-events (pour snapshot/export).
   */
  getAllMetaEvents(): readonly MemoryMetaEvent[] {
    return [...this.metaEvents];
  }

  /**
   * Retourne le nombre total de meta-events.
   */
  getMetaEventCount(): number {
    return this.metaEvents.length;
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // INTEGRITY VERIFICATION
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Vérifie l'intégrité du hash d'une entrée.
   * INV-MEM-05: hash = SHA256(CANONICAL_ENCODE(payload))
   */
  verifyEntry(entryId: string): Result<boolean, MemoryErrorCode> {
    const entry = this.entryById.get(entryId);
    if (!entry) return err("ENTRY_NOT_FOUND");

    try {
      const encoded = canonicalEncode(entry.payload);
      const computed = sha256Hex(encoded);
      return ok(computed === entry.hash);
    } catch {
      return ok(false);
    }
  }

  /**
   * C10 FIX: Vérifie l'intégrité de la chaîne pour une clé.
   * INV-MEM-08: Chain Integrity
   * 
   * @param canonicalKey - Clé à vérifier
   * @returns true si chaîne intègre, false si corrompue
   */
  verifyChain(canonicalKey: string): Result<boolean, MemoryErrorCode> {
    const history = this.entriesByKey.get(canonicalKey);
    
    // Empty or non-existent key is valid (vacuous truth)
    if (!history || history.length === 0) {
      return ok(true);
    }

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];

      // 1. Verify hash
      try {
        const encoded = canonicalEncode(entry.payload);
        const expectedHash = sha256Hex(encoded);
        if (entry.hash !== expectedHash) {
          return ok(false);
        }
      } catch {
        return ok(false);
      }

      // 2. Verify chain_hash
      const expectedChain =
        i === 0
          ? chainHashFirst(canonicalKey, entry.hash)
          : chainHashNext(history[i - 1].chain_hash, entry.hash);

      if (entry.chain_hash !== expectedChain) {
        return ok(false);
      }

      // 3. Verify version sequence
      if (entry.version !== i + 1) {
        return ok(false);
      }

      // 4. Verify previous_entry_id linkage
      if (i === 0) {
        if (entry.previous_entry_id !== null) {
          return ok(false);
        }
      } else {
        if (entry.previous_entry_id !== history[i - 1].id) {
          return ok(false);
        }
      }
    }

    return ok(true);
  }

  /**
   * Vérifie l'intégrité de toutes les chaînes.
   * 
   * @returns Map<key, isValid>
   */
  verifyAllChains(): Map<string, boolean> {
    const results = new Map<string, boolean>();
    for (const key of this.entriesByKey.keys()) {
      const result = this.verifyChain(key);
      results.set(key, result.ok ? result.value : false);
    }
    return results;
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // STATISTICS
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Retourne des statistiques sur le store.
   */
  getStats(): {
    keyCount: number;
    entryCount: number;
    metaEventCount: number;
    totalPayloadBytes: number;
  } {
    let totalPayloadBytes = 0;
    for (const entry of this.entryById.values()) {
      totalPayloadBytes += entry.payload_bytes;
    }

    return {
      keyCount: this.entriesByKey.size,
      entryCount: this.entryById.size,
      metaEventCount: this.metaEvents.length,
      totalPayloadBytes,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // CONFIGURATION ACCESS
  // ───────────────────────────────────────────────────────────────────────────────

  /**
   * Retourne la configuration (read-only).
   */
  getConfig(): Readonly<MemoryConfig> {
    return this.config;
  }
}
