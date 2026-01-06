// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TYPES CORE (FROZEN)
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// CE FICHIER EST GELÉ — Toute modification nécessite une nouvelle version
//
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type de message NEXUS
 */
export type NexusMessageKind = 'command' | 'query' | 'event';

/**
 * Contexte d'authentification (optionnel)
 */
export interface NexusAuthContext {
  subject?: string;
  role?: string;
  scope?: string[];
}

/**
 * NEXUS ENVELOPE — Contrat unique de message
 * 
 * RÈGLE ABSOLUE: Aucun module ne reçoit autre chose qu'un NexusEnvelope
 * 
 * @invariant INV-ENV-01: message_id obligatoire et unique
 * @invariant INV-ENV-02: timestamp via Clock injectable
 * @invariant INV-ENV-03: payload_schema + payload_version obligatoires
 * @invariant INV-ENV-04: champs hors contrat = rejet
 * @invariant INV-ENV-05: même input → même replay_protection_key
 */
export interface NexusEnvelope<TPayload = unknown> {
  // ─── Identité & traçabilité ─────────────────────────────
  /** Identifiant unique du message (via IdFactory injectable) */
  message_id: string;
  /** Identifiant de trace pour corrélation E2E */
  trace_id: string;
  /** Parent span pour chaînage (optionnel) */
  parent_span_id?: string;
  /** Timestamp en ms epoch (via Clock injectable, JAMAIS Date.now() direct) */
  timestamp: number;

  // ─── Routage ────────────────────────────────────────────
  /** Module source (gateway | memory | query | oracle | muse | etc.) */
  source_module: string;
  /** Module cible */
  target_module: string;
  /** Type de message */
  kind: NexusMessageKind;

  // ─── Versioning & contrat ───────────────────────────────
  /** Schema du payload (ex: "memory.write", "query.search") */
  payload_schema: string;
  /** Version du schema (ex: "v1.0.0") */
  payload_version: string;
  /** Version du module cible (ex: "memory@3.21.0") */
  module_version: string;

  // ─── Sécurité & contexte ────────────────────────────────
  /** Contexte d'authentification (optionnel) */
  auth_context?: NexusAuthContext;

  // ─── Intégrité & replay ─────────────────────────────────
  /** Hash attendu de l'entrée précédente (pour Memory/Ledger) */
  expected_previous_hash?: string;
  /** Clé de protection replay (hash canonical du contenu déterministe) */
  replay_protection_key: string;

  // ─── Données ────────────────────────────────────────────
  /** Payload du message */
  payload: TPayload;
}

/**
 * Liste des champs autorisés dans NexusEnvelope
 * Utilisé pour validation stricte (INV-ENV-04)
 */
export const ENVELOPE_ALLOWED_FIELDS = new Set([
  'message_id',
  'trace_id',
  'parent_span_id',
  'timestamp',
  'source_module',
  'target_module',
  'kind',
  'payload_schema',
  'payload_version',
  'module_version',
  'auth_context',
  'expected_previous_hash',
  'replay_protection_key',
  'payload',
]);

/**
 * Champs string obligatoires dans NexusEnvelope
 */
export const ENVELOPE_REQUIRED_STRING_FIELDS: Array<keyof NexusEnvelope> = [
  'message_id',
  'trace_id',
  'source_module',
  'target_module',
  'kind',
  'payload_schema',
  'payload_version',
  'module_version',
  'replay_protection_key',
];

/**
 * NEXUS ERROR — Erreur codée (pas de fuite)
 * 
 * RÈGLES:
 * - Jamais de stack trace brute
 * - Jamais de path local
 * - Jamais d'erreur JS native exposée
 * - Même erreur = même forme (determinism)
 */
export interface NexusError {
  /** Code d'erreur stable (ex: MEMORY_WRITE_FAILED) */
  error_code: string;
  /** Message humain stable */
  message: string;
  /** Module source de l'erreur */
  module: string;
  /** Indique si l'opération peut être retentée */
  retryable: boolean;
}

/**
 * Résultat OK
 */
export interface NexusOk<T> {
  ok: true;
  value: T;
}

/**
 * Résultat Erreur
 */
export interface NexusErr {
  ok: false;
  error: NexusError;
}

/**
 * Résultat NEXUS (union discriminée)
 */
export type NexusResult<T> = NexusOk<T> | NexusErr;

/**
 * Interface Clock injectable
 * @invariant INV-ENV-02: timestamp DOIT venir d'un Clock injectable
 */
export interface Clock {
  /** Retourne le timestamp actuel en millisecondes */
  nowMs(): number;
}

/**
 * Interface IdFactory injectable
 * @invariant INV-ADP-07: UUID via factory, pas crypto.randomUUID() direct
 */
export interface IdFactory {
  /** Génère un nouvel identifiant unique */
  newId(): string;
}

/**
 * Handler NEXUS — Implémenté par chaque adapter
 */
export interface NexusHandler {
  /** Vérifie si ce handler peut traiter l'envelope */
  canHandle(env: NexusEnvelope): boolean;
  /** Traite l'envelope et retourne le résultat */
  handle(env: NexusEnvelope): Promise<NexusResult<unknown>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS DE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper pour créer un résultat OK
 */
export function ok<T>(value: T): NexusOk<T> {
  return { ok: true, value };
}

/**
 * Helper pour créer un résultat Erreur
 */
export function fail(error: NexusError): NexusErr {
  return { ok: false, error };
}

/**
 * Type guard pour NexusOk
 */
export function isOk<T>(result: NexusResult<T>): result is NexusOk<T> {
  return result.ok === true;
}

/**
 * Type guard pour NexusErr
 */
export function isErr<T>(result: NexusResult<T>): result is NexusErr {
  return result.ok === false;
}
