// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_digest_writer.ts
// Phase 8E — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// Helper for RIPPLE_ENGINE to write digest into MemoryStore
// IMPORTANT: This enforces source = "RIPPLE_ENGINE"
// ═══════════════════════════════════════════════════════════════════════════════

import { MemoryStore } from "./memory_store";
import {
  MemoryTier,
  MemoryWriteResponse,
  DigestPayload,
  MemoryEntry,
  MemoryErrorCode,
  Result,
  ok,
  err,
} from "./types";
import {
  DIGEST_EVENT_TYPE,
  DIGEST_PAYLOAD_TYPE,
  buildDigestPayload,
  sortSourcesDeterministic,
  DigestRule,
} from "./memory_digest";

// ─────────────────────────────────────────────────────────────────────────────────
// WRITE DIGEST
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Écrit un digest dans le store.
 * 
 * INV-MEM-02: Source = RIPPLE_ENGINE (enforced)
 * INV-MEM-D1: Sources non modifiées
 * INV-MEM-D2: Sources référencées dans payload
 * INV-MEM-D4: Append-only (nouvelle entrée)
 * 
 * @param params - Paramètres d'écriture
 * @returns Response ou erreur
 */
export function writeDigest(params: {
  store: MemoryStore;
  canonical_key: string;
  payload: DigestPayload;
  timestamp_utc: string;
  initial_tier?: MemoryTier;
}): MemoryWriteResponse {
  // Write via store with RIPPLE_ENGINE source
  return params.store.write({
    source: "RIPPLE_ENGINE",
    canonical_key: params.canonical_key,
    event_type: DIGEST_EVENT_TYPE,
    payload_type: DIGEST_PAYLOAD_TYPE,
    payload: params.payload,
    timestamp_utc: params.timestamp_utc,
    initial_tier: params.initial_tier,
  }) as MemoryWriteResponse;
}

// ─────────────────────────────────────────────────────────────────────────────────
// CREATE AND WRITE DIGEST (convenience)
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Crée et écrit un digest en une seule opération.
 * 
 * Étapes:
 * 1. Trie les sources de manière déterministe
 * 2. Construit le payload via la règle
 * 3. Écrit le digest dans le store
 * 
 * @param params - Paramètres
 * @returns Response ou erreur
 */
export async function createAndWriteDigest(params: {
  store: MemoryStore;
  canonical_key: string;
  sources: readonly MemoryEntry[];
  rule: DigestRule;
  timestamp_utc: string;
  initial_tier?: MemoryTier;
}): Promise<Result<MemoryWriteResponse, MemoryErrorCode>> {
  // 1. Sort sources for determinism (INV-MEM-D3)
  const sortedSources = sortSourcesDeterministic(params.sources);

  // 2. Build payload
  const payloadResult = buildDigestPayload({
    sources: sortedSources,
    rule: params.rule,
  });

  if (!payloadResult.ok) {
    return payloadResult;
  }

  // 3. Write digest
  const response = await params.store.write({
    source: "RIPPLE_ENGINE",
    canonical_key: params.canonical_key,
    event_type: DIGEST_EVENT_TYPE,
    payload_type: DIGEST_PAYLOAD_TYPE,
    payload: payloadResult.value,
    timestamp_utc: params.timestamp_utc,
    initial_tier: params.initial_tier,
  });

  if (!response.success) {
    return err(response.error!);
  }

  return ok(response);
}

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST CHAIN
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Crée une chaîne de digests (digest de digests).
 * 
 * Utile pour créer des résumés hiérarchiques.
 */
export async function createChainedDigest(params: {
  store: MemoryStore;
  canonical_key: string;
  digestEntries: readonly MemoryEntry[];
  rule: DigestRule;
  timestamp_utc: string;
}): Promise<Result<MemoryWriteResponse, MemoryErrorCode>> {
  // Validate all entries are digests
  for (const entry of params.digestEntries) {
    if (entry.payload_type !== DIGEST_PAYLOAD_TYPE) {
      return err("DIGEST_INVALID_SOURCE");
    }
  }

  return createAndWriteDigest({
    store: params.store,
    canonical_key: params.canonical_key,
    sources: params.digestEntries,
    rule: params.rule,
    timestamp_utc: params.timestamp_utc,
    initial_tier: "COLD", // Chained digests are typically cold
  });
}

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Récupère les entrées sources d'un digest.
 * 
 * @param store - Memory store
 * @param digestEntry - Entrée digest
 * @returns Map des entrées sources (id -> entry)
 */
export function getDigestSources(
  store: MemoryStore,
  digestEntry: MemoryEntry
): Map<string, MemoryEntry> {
  const sources = new Map<string, MemoryEntry>();

  if (digestEntry.payload_type !== DIGEST_PAYLOAD_TYPE) {
    return sources;
  }

  const payload = digestEntry.payload as DigestPayload;
  for (const ref of payload.sources) {
    const entry = store.getById(ref.entry_id);
    if (entry) {
      sources.set(ref.entry_id, entry);
    }
  }

  return sources;
}

/**
 * Vérifie qu'un digest est complet (toutes les sources existent).
 */
export function isDigestComplete(
  store: MemoryStore,
  digestEntry: MemoryEntry
): boolean {
  if (digestEntry.payload_type !== DIGEST_PAYLOAD_TYPE) {
    return false;
  }

  const payload = digestEntry.payload as DigestPayload;
  for (const ref of payload.sources) {
    if (!store.hasEntry(ref.entry_id)) {
      return false;
    }
  }

  return true;
}
