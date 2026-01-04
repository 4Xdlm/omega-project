// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — types.ts
// Phase 8 — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────────
// PAYLOAD TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export type MemoryPayloadType =
  | "FACT"
  | "RIPPLE_EFFECT"
  | "EMOTION_STATE"
  | "TIMELINE_MARKER"
  | "RELATION_DELTA"
  | "PROMISE_STATE"
  | "DIGEST_CHUNK";

// ─────────────────────────────────────────────────────────────────────────────────
// RIPPLE EVENT TYPES (C06 FIX: DIGEST_CREATED ajouté)
// ─────────────────────────────────────────────────────────────────────────────────

export type RippleEventType =
  | "FACT_ESTABLISHED"
  | "FACT_PROPAGATED"
  | "EMOTION_SHIFTED"
  | "RELATION_CHANGED"
  | "PROMISE_CREATED"
  | "PROMISE_RESOLVED"
  | "PROMISE_BROKEN"
  | "TIMELINE_ADVANCED"
  | "DIGEST_CREATED";      // C06 FIX — Event type dédié pour Digest

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY TIERS
// ─────────────────────────────────────────────────────────────────────────────────

export type MemoryTier = "HOT" | "WARM" | "COLD";

// ─────────────────────────────────────────────────────────────────────────────────
// META EVENT TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export type MetaEventType =
  | "ACCESS_LOGGED"
  | "TIER_CHANGED"
  | "DECAY_MARKED"
  | "DECAY_COMPLETED";

// ─────────────────────────────────────────────────────────────────────────────────
// DECAY LEVELS
// ─────────────────────────────────────────────────────────────────────────────────

export type DecayLevel = "ACTIVE" | "DECAYING" | "DECAYED";

// ─────────────────────────────────────────────────────────────────────────────────
// ERROR CODES (EXHAUSTIVE — pour debugging et audit)
// ─────────────────────────────────────────────────────────────────────────────────

export type MemoryErrorCode =
  // Write errors
  | "INVALID_SOURCE"
  | "INVALID_KEY"
  | "INVALID_EVENT_TYPE"
  | "INVALID_PAYLOAD"
  | "INVALID_TIMESTAMP"
  | "INTEGRITY_FAILURE"
  // C02 — Payload size
  | "PAYLOAD_TOO_LARGE"
  // C10 — Chain integrity
  | "CHAIN_CORRUPTED"
  // C12 — Entry existence
  | "ENTRY_NOT_FOUND"
  // C08 — Tier mismatch
  | "TIER_MISMATCH"
  // C11 — Rate limiting
  | "RATE_LIMITED"
  // C03 — Snapshots
  | "SNAPSHOT_NOT_FOUND"
  // C01 — Float validation
  | "FLOAT_NOT_FINITE"
  // F06 — Concurrency
  | "CONCURRENT_WRITE"
  // Digest errors
  | "DIGEST_NO_SOURCES"
  | "DIGEST_INVALID_SOURCE"
  | "DIGEST_DUPLICATE_SOURCE"
  | "DIGEST_INVALID_RULE"
  // Decay errors
  | "DECAY_INVALID_TARGET"
  | "DECAY_REASON_REQUIRED";

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURATION (avec defaults NASA-grade)
// ─────────────────────────────────────────────────────────────────────────────────

export interface MemoryConfig {
  /** Maximum payload size in bytes (default: 1MB) */
  readonly maxPayloadBytes: number;
  /** Maximum entries per canonical key (default: 10000) */
  readonly maxEntriesPerKey: number;
  /** Tiering cooldown in milliseconds (default: 0 = no cooldown) */
  readonly tieringCooldownMs: number;
  /** Maximum tiering events per run (default: 100) */
  readonly maxTieringEventsPerRun: number;
  /** Default tier for new entries (default: HOT) */
  readonly defaultTier: MemoryTier;
}

export const DEFAULT_MEMORY_CONFIG: Readonly<MemoryConfig> = Object.freeze({
  maxPayloadBytes: 1_048_576,        // 1 MB
  maxEntriesPerKey: 10_000,
  tieringCooldownMs: 0,
  maxTieringEventsPerRun: 100,
  defaultTier: "HOT",
});

// ─────────────────────────────────────────────────────────────────────────────────
// MEMORY ENTRY (100% IMMUTABLE — INV-MEM-01)
// ─────────────────────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  /** UUID unique, généré à l'écriture */
  readonly id: string;
  /** Clé indexée par CANON */
  readonly canonical_key: string;
  /** Numéro de version pour cette clé */
  readonly version: number;

  /** Données mémorisées (agnostique) */
  readonly payload: unknown;
  /** Type de payload */
  readonly payload_type: MemoryPayloadType;

  /** Seule source autorisée: RIPPLE_ENGINE */
  readonly source: "RIPPLE_ENGINE";
  /** Type d'événement déclencheur */
  readonly event_type: RippleEventType;
  /** Horodatage fourni par RIPPLE */
  readonly timestamp_utc: string;
  /** Horodatage d'ingestion MEMORY */
  readonly ingested_at_utc: string;

  /** Lien vers entrée précédente (null si v1) */
  readonly previous_entry_id: string | null;

  /** SHA-256 de CANONICAL_ENCODE(payload) */
  readonly hash: string;
  /** Hash chaîné par canonical_key */
  readonly chain_hash: string;

  /** Tier assigné à la création */
  readonly initial_tier: MemoryTier;

  /** Taille du payload encodé en bytes */
  readonly payload_bytes: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// WRITE REQUEST / RESPONSE
// ─────────────────────────────────────────────────────────────────────────────────

export interface MemoryWriteRequest {
  /** OBLIGATOIRE: seul RIPPLE_ENGINE peut écrire */
  source: "RIPPLE_ENGINE";
  /** Clé canonique cible */
  canonical_key: string;
  /** Type d'événement */
  event_type: RippleEventType;
  /** Type de payload */
  payload_type: MemoryPayloadType;
  /** Données à mémoriser */
  payload: unknown;
  /** Horodatage ISO 8601 UTC */
  timestamp_utc: string;
  /** Tier initial (optionnel, défaut: config.defaultTier) */
  initial_tier?: MemoryTier;
}

export interface MemoryWriteResponse {
  success: boolean;
  entry_id?: string;
  version?: number;
  hash?: string;
  chain_hash?: string;
  ingested_at_utc?: string;
  payload_bytes?: number;
  error?: MemoryErrorCode;
}

// ─────────────────────────────────────────────────────────────────────────────────
// META EVENTS (APPEND-ONLY)
// ─────────────────────────────────────────────────────────────────────────────────

export interface MemoryMetaEvent {
  /** UUID unique */
  readonly id: string;
  /** Référence à MemoryEntry.id */
  readonly target_entry_id: string;
  /** Type d'événement meta */
  readonly event_type: MetaEventType;
  /** Horodatage ISO 8601 UTC */
  readonly timestamp_utc: string;
  /** Payload de l'événement */
  readonly payload: Readonly<Record<string, unknown>>;
}

// ─────────────────────────────────────────────────────────────────────────────────
// META EVENT PAYLOADS (TYPED)
// ─────────────────────────────────────────────────────────────────────────────────

export interface AccessLoggedPayload {
  readonly accessor: string;
  readonly context: string;
}

export interface TierChangedPayload {
  readonly from_tier: MemoryTier;
  readonly to_tier: MemoryTier;
  readonly reason: string;
}

export interface DecayMarkedPayload {
  readonly decay_level: DecayLevel;
  readonly decay_reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// TYPE GUARDS
// ─────────────────────────────────────────────────────────────────────────────────

export function isMemoryTier(x: unknown): x is MemoryTier {
  return x === "HOT" || x === "WARM" || x === "COLD";
}

export function isDecayLevel(x: unknown): x is DecayLevel {
  return x === "ACTIVE" || x === "DECAYING" || x === "DECAYED";
}

export function isTierChangedPayload(x: unknown): x is TierChangedPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    isMemoryTier(o.from_tier) &&
    isMemoryTier(o.to_tier) &&
    typeof o.reason === "string" &&
    o.reason.length > 0
  );
}

export function isDecayMarkedPayload(x: unknown): x is DecayMarkedPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    isDecayLevel(o.decay_level) &&
    typeof o.decay_reason === "string" &&
    o.decay_reason.length > 0
  );
}

export function isAccessLoggedPayload(x: unknown): x is AccessLoggedPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.accessor === "string" &&
    typeof o.context === "string"
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// RESULT TYPE (pour erreurs typées)
// ─────────────────────────────────────────────────────────────────────────────────

export type Result<T, E = MemoryErrorCode> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ─────────────────────────────────────────────────────────────────────────────────
// TIERING POLICY
// ─────────────────────────────────────────────────────────────────────────────────

export interface TieringPolicy {
  /** Days after which HOT becomes WARM (default: 7) */
  readonly hot_ttl_days: number;
  /** Days after which WARM becomes COLD (default: 30) */
  readonly warm_ttl_days: number;
  /** Window in days for access counting (default: 7) */
  readonly promote_window_days: number;
  /** Access count to trigger promotion (default: 3) */
  readonly promote_on_access_count: number;
}

export const DEFAULT_TIERING_POLICY: Readonly<TieringPolicy> = Object.freeze({
  hot_ttl_days: 7,
  warm_ttl_days: 30,
  promote_window_days: 7,
  promote_on_access_count: 3,
});

// ─────────────────────────────────────────────────────────────────────────────────
// SNAPSHOT TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface MemorySnapshot {
  /** UUID unique du snapshot */
  readonly id: string;
  /** Horodatage de création */
  readonly created_at_utc: string;
  /** Hash racine (merkle-like) */
  readonly root_hash: string;
  /** Nombre d'entrées capturées */
  readonly entry_count: number;
  /** Nombre de meta-events capturés */
  readonly meta_event_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST TYPES
// ─────────────────────────────────────────────────────────────────────────────────

export interface DigestSourceRef {
  readonly entry_id: string;
  readonly version: number;
  readonly hash: string;
}

export interface DigestPayload {
  readonly sources: readonly DigestSourceRef[];
  readonly rule_id: string;
  readonly summary: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────────
// TIERING ACTION
// ─────────────────────────────────────────────────────────────────────────────────

export type TieringAction =
  | {
      kind: "TIER_CHANGED";
      target_entry_id: string;
      from_tier: MemoryTier;
      to_tier: MemoryTier;
      reason: string;
      timestamp_utc: string;
    }
  | { kind: "NOOP" };

// ─────────────────────────────────────────────────────────────────────────────────
// DECAY DECISION
// ─────────────────────────────────────────────────────────────────────────────────

export interface DecayDecision {
  readonly level: DecayLevel;
  readonly reason?: string;
}
