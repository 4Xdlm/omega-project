// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA — MEMORY_LAYER — memory_digest.ts
// Phase 8E — NASA-Grade L4 / DO-178C Level A
// Version: 1.0.0-NASA
// 
// CNC-055: MEMORY_DIGEST
// - Digest is a NEW MemoryEntry (payload_type = DIGEST_CHUNK)
// - Must be reproducible: same sources + same rule -> same summary -> same hash
// - Must be traceable: sources list with entry_id/version/hash
// - No mutation of sources (append-only)
// 
// C06 FIX: Event type DIGEST_CREATED (pas FACT_PROPAGATED)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  MemoryEntry,
  MemoryPayloadType,
  RippleEventType,
  DigestSourceRef,
  DigestPayload,
  MemoryErrorCode,
  Result,
  ok,
  err,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────────
// CONSTANTS (C06 FIX)
// ─────────────────────────────────────────────────────────────────────────────────

/** Payload type pour les digests */
export const DIGEST_PAYLOAD_TYPE: MemoryPayloadType = "DIGEST_CHUNK";

/** Event type pour les digests (C06 FIX: dédié, pas FACT_PROPAGATED) */
export const DIGEST_EVENT_TYPE: RippleEventType = "DIGEST_CREATED";

/** Nombre maximum de sources par digest */
export const MAX_DIGEST_SOURCES = 100;

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST RULE INTERFACE
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Interface pour une règle de digest.
 * 
 * IMPORTANT: La fonction apply() DOIT être:
 * - Pure (pas de side effects)
 * - Déterministe (même input → même output)
 * - Sans dépendance externe (pas de Date.now(), Math.random(), etc.)
 */
export interface DigestRule {
  /** Identifiant unique de la règle */
  readonly id: string;
  /** Description de la règle */
  readonly description: string;
  /**
   * Applique la règle aux sources.
   * PURE + DETERMINISTIC - pas de side effects
   */
  apply(sources: readonly MemoryEntry[]): unknown;
}

// ─────────────────────────────────────────────────────────────────────────────────
// SOURCE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Valide les sources avant digest.
 * 
 * Règles:
 * - Non vide
 * - Pas de doublons (par entry_id)
 * - Chaque source est valide
 * - Max MAX_DIGEST_SOURCES sources
 * 
 * @param sources - Sources à valider
 * @returns Ok si valide, erreur sinon
 */
export function validateDigestSources(
  sources: readonly MemoryEntry[]
): Result<void, MemoryErrorCode> {
  // Check non-empty
  if (!Array.isArray(sources) || sources.length === 0) {
    return err("DIGEST_NO_SOURCES");
  }

  // Check max sources
  if (sources.length > MAX_DIGEST_SOURCES) {
    return err("INVALID_PAYLOAD");
  }

  // Check uniqueness and validity
  const seen = new Set<string>();
  for (const source of sources) {
    // Validate source
    if (!source || typeof source.id !== "string") {
      return err("DIGEST_INVALID_SOURCE");
    }

    // Check duplicate
    if (seen.has(source.id)) {
      return err("DIGEST_DUPLICATE_SOURCE");
    }
    seen.add(source.id);
  }

  return ok(undefined);
}

/**
 * Assertion version de validateDigestSources.
 * @throws Error si invalide
 */
export function assertDigestableSources(
  sources: readonly MemoryEntry[]
): void {
  const result = validateDigestSources(sources);
  if (!result.ok) {
    throw new Error(result.error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// SOURCE ORDERING
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Trie les sources de manière déterministe.
 * 
 * Ordre: canonical_key ASC → version ASC → id ASC
 * 
 * IMPORTANT: Utiliser cette fonction AVANT d'appliquer une règle
 * pour garantir la reproductibilité.
 */
export function sortSourcesDeterministic(
  sources: readonly MemoryEntry[]
): MemoryEntry[] {
  return [...sources].sort((a, b) => {
    // 1. canonical_key
    if (a.canonical_key < b.canonical_key) return -1;
    if (a.canonical_key > b.canonical_key) return 1;
    // 2. version
    if (a.version !== b.version) return a.version - b.version;
    // 3. id (tie-breaker)
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

// ─────────────────────────────────────────────────────────────────────────────────
// BUILD DIGEST PAYLOAD
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Construit un payload de digest.
 * 
 * INV-MEM-D2: Référence toutes les sources (id/version/hash)
 * INV-MEM-D3: Reproductible (mêmes sources + règle → même payload)
 * 
 * @param params - Paramètres
 * @returns DigestPayload ou erreur
 */
export function buildDigestPayload(params: {
  sources: readonly MemoryEntry[];
  rule: DigestRule;
}): Result<DigestPayload, MemoryErrorCode> {
  // Validate sources
  const validation = validateDigestSources(params.sources);
  if (!validation.ok) {
    return validation;
  }

  // Validate rule
  if (
    !params.rule ||
    typeof params.rule.id !== "string" ||
    params.rule.id.length === 0
  ) {
    return err("DIGEST_INVALID_RULE");
  }

  // Build source references
  const sourcesRef: DigestSourceRef[] = params.sources.map((e) =>
    Object.freeze({
      entry_id: e.id,
      version: e.version,
      hash: e.hash,
    })
  );

  // Apply rule (must be deterministic)
  let summary: unknown;
  try {
    summary = params.rule.apply(params.sources);
  } catch (e) {
    return err("INVALID_PAYLOAD");
  }

  // Build frozen payload
  const payload: DigestPayload = Object.freeze({
    sources: Object.freeze(sourcesRef),
    rule_id: params.rule.id,
    summary,
  });

  return ok(payload);
}

// ─────────────────────────────────────────────────────────────────────────────────
// DIGEST UTILITIES
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si un payload est un DigestPayload.
 */
export function isDigestPayload(payload: unknown): payload is DigestPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    Array.isArray(p.sources) &&
    typeof p.rule_id === "string" &&
    "summary" in p
  );
}

/**
 * Vérifie si une entrée est un digest.
 */
export function isDigestEntry(entry: MemoryEntry): boolean {
  return (
    entry.payload_type === DIGEST_PAYLOAD_TYPE &&
    entry.event_type === DIGEST_EVENT_TYPE &&
    isDigestPayload(entry.payload)
  );
}

/**
 * Extrait les IDs de sources d'un digest.
 */
export function getDigestSourceIds(entry: MemoryEntry): string[] {
  if (!isDigestEntry(entry)) return [];
  const payload = entry.payload as DigestPayload;
  return payload.sources.map((s) => s.entry_id);
}

/**
 * Vérifie l'intégrité d'un digest (sources hashes match).
 */
export function verifyDigestIntegrity(
  digest: MemoryEntry,
  sourceEntries: Map<string, MemoryEntry>
): boolean {
  if (!isDigestEntry(digest)) return false;

  const payload = digest.payload as DigestPayload;

  for (const ref of payload.sources) {
    const source = sourceEntries.get(ref.entry_id);
    if (!source) return false;
    if (source.version !== ref.version) return false;
    if (source.hash !== ref.hash) return false;
  }

  return true;
}
