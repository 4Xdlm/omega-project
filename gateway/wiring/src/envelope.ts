// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — ENVELOPE BUILDER & VALIDATOR
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-ENV-01: message_id obligatoire et unique
// @invariant INV-ENV-02: timestamp via Clock injectable
// @invariant INV-ENV-03: payload_schema + payload_version obligatoires
// @invariant INV-ENV-04: champs hors contrat = rejet
// @invariant INV-ENV-05: même input → même replay_protection_key
//
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  Clock,
  IdFactory,
  NexusEnvelope,
  NexusMessageKind,
  NexusAuthContext,
  NexusResult,
} from './types.js';
import {
  ENVELOPE_ALLOWED_FIELDS,
  ENVELOPE_REQUIRED_STRING_FIELDS,
  ok,
  fail,
} from './types.js';
import { canonicalStringify, canonicalHash } from './canonical_json.js';
import { EnvelopeErrors } from './errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES POUR BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Arguments pour construire une envelope
 */
export interface BuildEnvelopeArgs<TPayload> {
  /** Clock injectable (OBLIGATOIRE) */
  clock: Clock;
  /** IdFactory injectable (OBLIGATOIRE) */
  ids: IdFactory;
  /** Trace ID pour corrélation */
  trace_id: string;
  /** Module source */
  source_module: string;
  /** Module cible */
  target_module: string;
  /** Type de message */
  kind: NexusMessageKind;
  /** Schema du payload */
  payload_schema: string;
  /** Version du schema */
  payload_version: string;
  /** Version du module cible */
  module_version: string;
  /** Payload */
  payload: TPayload;
  /** Parent span ID (optionnel) */
  parent_span_id?: string;
  /** Contexte d'auth (optionnel) */
  auth_context?: NexusAuthContext;
  /** Hash précédent attendu (optionnel) */
  expected_previous_hash?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit une NexusEnvelope déterministe
 * 
 * @param args - Arguments de construction
 * @returns NexusEnvelope complète avec replay_protection_key
 * 
 * @invariant INV-ENV-02: timestamp vient de args.clock
 * @invariant INV-ENV-05: replay_protection_key est déterministe
 */
export function buildEnvelope<TPayload>(
  args: BuildEnvelopeArgs<TPayload>
): NexusEnvelope<TPayload> {
  // INV-ENV-02: timestamp via Clock injectable
  const timestamp = args.clock.nowMs();
  
  // INV-ENV-01: message_id via IdFactory injectable
  const message_id = args.ids.newId();

  // Construire l'envelope sans replay_protection_key d'abord
  const envelope: NexusEnvelope<TPayload> = {
    message_id,
    trace_id: args.trace_id,
    parent_span_id: args.parent_span_id,
    timestamp,
    source_module: args.source_module,
    target_module: args.target_module,
    kind: args.kind,
    payload_schema: args.payload_schema,
    payload_version: args.payload_version,
    module_version: args.module_version,
    auth_context: args.auth_context,
    expected_previous_hash: args.expected_previous_hash,
    // replay_protection_key sera calculé ci-dessous
    replay_protection_key: '',
    payload: args.payload,
  };

  // INV-ENV-05: replay_protection_key déterministe
  // Basé UNIQUEMENT sur les champs qui définissent l'intention du message
  // (exclut message_id et timestamp qui varient)
  const replayInput = {
    trace_id: envelope.trace_id,
    source_module: envelope.source_module,
    target_module: envelope.target_module,
    kind: envelope.kind,
    payload_schema: envelope.payload_schema,
    payload_version: envelope.payload_version,
    module_version: envelope.module_version,
    expected_previous_hash: envelope.expected_previous_hash ?? null,
    payload: envelope.payload,
  };

  envelope.replay_protection_key = canonicalHash(replayInput);

  return envelope;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_KINDS: Set<string> = new Set(['command', 'query', 'event']);

/**
 * Valide une envelope de manière STRICTE
 * 
 * @param env - Objet à valider
 * @returns NexusResult avec l'envelope validée ou une erreur
 * 
 * @invariant INV-ENV-04: champs hors contrat = rejet
 */
export function validateEnvelopeStrict(env: unknown): NexusResult<NexusEnvelope> {
  // Vérifier que c'est un objet
  if (!env || typeof env !== 'object') {
    return fail(EnvelopeErrors.invalidEnvelope());
  }

  const obj = env as Record<string, unknown>;

  // INV-ENV-04: Rejeter les champs inconnus (STRICT CONTRACT)
  for (const key of Object.keys(obj)) {
    if (!ENVELOPE_ALLOWED_FIELDS.has(key)) {
      return fail(EnvelopeErrors.unknownField(key));
    }
  }

  // Vérifier les champs string obligatoires
  for (const field of ENVELOPE_REQUIRED_STRING_FIELDS) {
    const value = obj[field as string];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return fail(EnvelopeErrors.missingField(String(field)));
    }
  }

  // Vérifier timestamp
  if (typeof obj.timestamp !== 'number' || !Number.isFinite(obj.timestamp)) {
    return fail(EnvelopeErrors.badTimestamp());
  }

  // Vérifier kind
  if (!VALID_KINDS.has(obj.kind as string)) {
    return fail(EnvelopeErrors.badKind(String(obj.kind)));
  }

  // INV-ENV-03: payload_schema doit contenir un point (module.action)
  if (typeof obj.payload_schema !== 'string' || !obj.payload_schema.includes('.')) {
    return fail(EnvelopeErrors.badSchema());
  }

  // Vérifier replay_protection_key
  if (typeof obj.replay_protection_key !== 'string' || obj.replay_protection_key.length === 0) {
    return fail(EnvelopeErrors.noReplayKey());
  }

  // Validation passée
  return ok(env as NexusEnvelope);
}

/**
 * Valide une envelope de manière non-stricte (permet des champs supplémentaires)
 * Utilisé pour la rétrocompatibilité
 */
export function validateEnvelopeLenient(env: unknown): NexusResult<NexusEnvelope> {
  // Vérifier que c'est un objet
  if (!env || typeof env !== 'object') {
    return fail(EnvelopeErrors.invalidEnvelope());
  }

  const obj = env as Record<string, unknown>;

  // Vérifier les champs string obligatoires
  for (const field of ENVELOPE_REQUIRED_STRING_FIELDS) {
    const value = obj[field as string];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return fail(EnvelopeErrors.missingField(String(field)));
    }
  }

  // Vérifier timestamp
  if (typeof obj.timestamp !== 'number' || !Number.isFinite(obj.timestamp)) {
    return fail(EnvelopeErrors.badTimestamp());
  }

  // Vérifier kind
  if (!VALID_KINDS.has(obj.kind as string)) {
    return fail(EnvelopeErrors.badKind(String(obj.kind)));
  }

  // Vérifier payload_schema format
  if (typeof obj.payload_schema !== 'string' || !obj.payload_schema.includes('.')) {
    return fail(EnvelopeErrors.badSchema());
  }

  return ok(env as NexusEnvelope);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrait le module et l'action du payload_schema
 * @example "memory.write" → { module: "memory", action: "write" }
 */
export function parsePayloadSchema(schema: string): { module: string; action: string } | null {
  const parts = schema.split('.');
  if (parts.length !== 2) return null;
  return { module: parts[0], action: parts[1] };
}

/**
 * Construit un payload_schema
 */
export function buildPayloadSchema(module: string, action: string): string {
  return `${module}.${action}`;
}

/**
 * Vérifie si deux envelopes ont le même replay_protection_key
 * (utile pour détecter les replays)
 */
export function isSameReplayKey(a: NexusEnvelope, b: NexusEnvelope): boolean {
  return a.replay_protection_key === b.replay_protection_key;
}

/**
 * Calcule le replay_protection_key pour une envelope existante
 * (utile pour vérification)
 */
export function computeReplayKey(env: NexusEnvelope): string {
  const replayInput = {
    trace_id: env.trace_id,
    source_module: env.source_module,
    target_module: env.target_module,
    kind: env.kind,
    payload_schema: env.payload_schema,
    payload_version: env.payload_version,
    module_version: env.module_version,
    expected_previous_hash: env.expected_previous_hash ?? null,
    payload: env.payload,
  };
  return canonicalHash(replayInput);
}

/**
 * Vérifie l'intégrité du replay_protection_key
 */
export function verifyReplayKey(env: NexusEnvelope): boolean {
  return env.replay_protection_key === computeReplayKey(env);
}
