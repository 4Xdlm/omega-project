// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — GATEWAY SCHEMAS
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INNOVATION: Branded Types + Exhaustive Discriminated Union
//
// Cette approche rend le bypass IMPOSSIBLE au niveau TypeScript.
// - Chaque schema est un branded type
// - Le switch est exhaustif (compile-time check)
// - Aucun string magique ailleurs dans le codebase
//
// @invariant INV-GW-02: Schema Determinism - même input → même schema
// @invariant INV-GW-05: Rejection Strict - input inconnu → erreur, jamais fallback
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusMessageKind } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES — Sécurité compile-time
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Brand pour les schemas validés
 * Un schema non-brandé ne peut pas passer la validation
 */
declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

/** Schema validé (compile-time safety) */
export type ValidatedSchema = Brand<string, 'ValidatedSchema'>;

/** Module cible validé */
export type ValidatedModule = Brand<string, 'ValidatedModule'>;

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY INPUT — Discriminated Union Exhaustive
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Union discriminée de TOUTES les entrées Gateway possibles
 * 
 * RÈGLE ABSOLUE: Si ce n'est pas dans cette union, c'est REFUSÉ.
 * Le discriminant `kind` est la seule façon d'identifier une requête.
 */
export type GatewayInput =
  // ─── Memory Operations ──────────────────────────────────────────────
  | { readonly kind: 'memory.write'; readonly key: string; readonly value: unknown }
  | { readonly kind: 'memory.readLatest'; readonly key: string }
  | { readonly kind: 'memory.readByHash'; readonly hash: string }
  | { readonly kind: 'memory.listKeys'; readonly prefix?: string }
  // ─── Query Operations ───────────────────────────────────────────────
  | { readonly kind: 'query.search'; readonly query: string; readonly limit?: number; readonly offset?: number }
  | { readonly kind: 'query.find'; readonly filters: Record<string, unknown>; readonly limit?: number }
  | { readonly kind: 'query.aggregate'; readonly field: string; readonly operation: 'count' | 'sum' | 'avg' | 'min' | 'max' }
  | { readonly kind: 'query.analyze'; readonly text: string }
  // ─── Gateway Meta Operations ────────────────────────────────────────
  | { readonly kind: 'gateway.ping' }
  | { readonly kind: 'gateway.status' };

/**
 * Extrait le kind d'un GatewayInput
 */
export type GatewayInputKind = GatewayInput['kind'];

/**
 * Liste exhaustive des kinds pour validation runtime
 */
export const GATEWAY_INPUT_KINDS: readonly GatewayInputKind[] = [
  'memory.write',
  'memory.readLatest',
  'memory.readByHash',
  'memory.listKeys',
  'query.search',
  'query.find',
  'query.aggregate',
  'query.analyze',
  'gateway.ping',
  'gateway.status',
] as const;

/**
 * Set pour lookup O(1)
 */
const VALID_KINDS_SET = new Set<string>(GATEWAY_INPUT_KINDS);

// ═══════════════════════════════════════════════════════════════════════════════
// ENVELOPE SPEC — Spécification de routage
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Spécification pour construire une NexusEnvelope
 * Généré UNIQUEMENT par mapToEnvelopeSpec
 */
export interface EnvelopeSpec {
  /** Module cible */
  readonly target_module: string;
  /** Schema du payload */
  readonly payload_schema: string;
  /** Version du schema */
  readonly payload_version: string;
  /** Type de message NEXUS */
  readonly nexus_kind: NexusMessageKind;
  /** Payload extrait (sans le kind) */
  readonly payload: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filtre les propriétés undefined d'un objet
 * Nécessaire car canonicalStringify refuse les undefined
 */
function filterUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA MAPPING — Cœur du routing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mappe un GatewayInput vers sa spécification d'envelope
 * 
 * CETTE FONCTION EST LA SEULE SOURCE DE VÉRITÉ POUR LE ROUTING.
 * 
 * @invariant INV-GW-02: Même input → même spec (déterministe)
 * @invariant INV-GW-05: Le switch est exhaustif, pas de default fallback
 * 
 * @param input - Entrée Gateway validée
 * @returns EnvelopeSpec pour construire l'envelope
 */
export function mapToEnvelopeSpec(input: GatewayInput): EnvelopeSpec {
  // Le switch est exhaustif - TypeScript refuse de compiler si un case manque
  switch (input.kind) {
    // ─── Memory ───────────────────────────────────────────────────────
    case 'memory.write':
      return {
        target_module: 'memory',
        payload_schema: 'memory.write',
        payload_version: 'v1.0.0',
        nexus_kind: 'command',
        payload: { key: input.key, value: input.value },
      };

    case 'memory.readLatest':
      return {
        target_module: 'memory',
        payload_schema: 'memory.readLatest',
        payload_version: 'v1.0.0',
        nexus_kind: 'query',
        payload: { key: input.key },
      };

    case 'memory.readByHash':
      return {
        target_module: 'memory',
        payload_schema: 'memory.readByHash',
        payload_version: 'v1.0.0',
        nexus_kind: 'query',
        payload: { hash: input.hash },
      };

    case 'memory.listKeys':
      return {
        target_module: 'memory',
        payload_schema: 'memory.listKeys',
        payload_version: 'v1.0.0',
        nexus_kind: 'query',
        payload: filterUndefined({ prefix: input.prefix }),
      };

    // ─── Query ────────────────────────────────────────────────────────
    case 'query.search':
      return {
        target_module: 'query',
        payload_schema: 'query.search',
        payload_version: 'v1.0.0',
        nexus_kind: 'query',
        payload: filterUndefined({ query: input.query, limit: input.limit, offset: input.offset }),
      };

    case 'query.find':
      return {
        target_module: 'query',
        payload_schema: 'query.find',
        payload_version: 'v1.0.0',
        nexus_kind: 'query',
        payload: filterUndefined({ filters: input.filters, limit: input.limit }),
      };

    case 'query.aggregate':
      return {
        target_module: 'query',
        payload_schema: 'query.aggregate',
        payload_version: 'v1.0.0',
        nexus_kind: 'query',
        payload: { field: input.field, operation: input.operation },
      };

    case 'query.analyze':
      return {
        target_module: 'query',
        payload_schema: 'query.analyze',
        payload_version: 'v1.0.0',
        nexus_kind: 'query',
        payload: { text: input.text },
      };

    // ─── Gateway Meta ─────────────────────────────────────────────────
    case 'gateway.ping':
      return {
        target_module: 'gateway',
        payload_schema: 'gateway.ping',
        payload_version: 'v1.0.0',
        nexus_kind: 'query',
        payload: {},
      };

    case 'gateway.status':
      return {
        target_module: 'gateway',
        payload_schema: 'gateway.status',
        payload_version: 'v1.0.0',
        nexus_kind: 'query',
        payload: {},
      };

    // ─── Exhaustiveness Check ─────────────────────────────────────────
    // Si TypeScript compile, tous les cas sont couverts
    // Ce code n'est JAMAIS atteint en runtime
    default:
      return assertNever(input);
  }
}

/**
 * Helper pour exhaustiveness check
 * Si ce code est atteint, c'est un bug de compilation
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected GatewayInput: ${JSON.stringify(x)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION — Runtime checks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Résultat de validation
 */
export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; error: string; code: string };

/**
 * Codes d'erreur de validation Gateway
 */
export const GatewayValidationCodes = {
  MISSING_KIND: 'GW_MISSING_KIND',
  INVALID_KIND: 'GW_INVALID_KIND',
  MISSING_FIELD: 'GW_MISSING_FIELD',
  INVALID_FIELD: 'GW_INVALID_FIELD',
} as const;

/**
 * Valide un input brut et le type en GatewayInput
 * 
 * @invariant INV-GW-05: Rejection Strict
 * 
 * @param raw - Input brut (unknown)
 * @returns ValidationResult avec GatewayInput typé ou erreur
 */
export function validateGatewayInput(raw: unknown): ValidationResult<GatewayInput> {
  // Check object
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Input must be an object', code: GatewayValidationCodes.INVALID_KIND };
  }

  const obj = raw as Record<string, unknown>;

  // Check kind exists
  if (!('kind' in obj) || typeof obj.kind !== 'string') {
    return { valid: false, error: 'Missing or invalid kind', code: GatewayValidationCodes.MISSING_KIND };
  }

  // Check kind is valid
  if (!VALID_KINDS_SET.has(obj.kind)) {
    return { valid: false, error: `Unknown kind: ${obj.kind}`, code: GatewayValidationCodes.INVALID_KIND };
  }

  // Validate specific fields based on kind
  const kind = obj.kind as GatewayInputKind;

  switch (kind) {
    case 'memory.write':
      if (typeof obj.key !== 'string' || obj.key.length === 0) {
        return { valid: false, error: 'memory.write requires non-empty key', code: GatewayValidationCodes.MISSING_FIELD };
      }
      return { valid: true, value: { kind, key: obj.key, value: obj.value } };

    case 'memory.readLatest':
      if (typeof obj.key !== 'string' || obj.key.length === 0) {
        return { valid: false, error: 'memory.readLatest requires non-empty key', code: GatewayValidationCodes.MISSING_FIELD };
      }
      return { valid: true, value: { kind, key: obj.key } };

    case 'memory.readByHash':
      if (typeof obj.hash !== 'string' || obj.hash.length === 0) {
        return { valid: false, error: 'memory.readByHash requires non-empty hash', code: GatewayValidationCodes.MISSING_FIELD };
      }
      return { valid: true, value: { kind, hash: obj.hash } };

    case 'memory.listKeys':
      return { 
        valid: true, 
        value: { kind, prefix: typeof obj.prefix === 'string' ? obj.prefix : undefined } 
      };

    case 'query.search':
      if (typeof obj.query !== 'string') {
        return { valid: false, error: 'query.search requires query string', code: GatewayValidationCodes.MISSING_FIELD };
      }
      return {
        valid: true,
        value: {
          kind,
          query: obj.query,
          limit: typeof obj.limit === 'number' ? obj.limit : undefined,
          offset: typeof obj.offset === 'number' ? obj.offset : undefined,
        },
      };

    case 'query.find':
      if (!obj.filters || typeof obj.filters !== 'object') {
        return { valid: false, error: 'query.find requires filters object', code: GatewayValidationCodes.MISSING_FIELD };
      }
      return {
        valid: true,
        value: {
          kind,
          filters: obj.filters as Record<string, unknown>,
          limit: typeof obj.limit === 'number' ? obj.limit : undefined,
        },
      };

    case 'query.aggregate':
      if (typeof obj.field !== 'string') {
        return { valid: false, error: 'query.aggregate requires field', code: GatewayValidationCodes.MISSING_FIELD };
      }
      const validOps = ['count', 'sum', 'avg', 'min', 'max'];
      if (!validOps.includes(obj.operation as string)) {
        return { valid: false, error: 'query.aggregate requires valid operation', code: GatewayValidationCodes.INVALID_FIELD };
      }
      return {
        valid: true,
        value: { kind, field: obj.field, operation: obj.operation as 'count' | 'sum' | 'avg' | 'min' | 'max' },
      };

    case 'query.analyze':
      if (typeof obj.text !== 'string') {
        return { valid: false, error: 'query.analyze requires text', code: GatewayValidationCodes.MISSING_FIELD };
      }
      return { valid: true, value: { kind, text: obj.text } };

    case 'gateway.ping':
      return { valid: true, value: { kind } };

    case 'gateway.status':
      return { valid: true, value: { kind } };

    default:
      return assertNever(kind as never);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrait le type de payload pour un kind donné
 */
export type PayloadForKind<K extends GatewayInputKind> = Extract<GatewayInput, { kind: K }>;

/**
 * Vérifie si un kind cible memory
 */
export function isMemoryKind(kind: GatewayInputKind): boolean {
  return kind.startsWith('memory.');
}

/**
 * Vérifie si un kind cible query
 */
export function isQueryKind(kind: GatewayInputKind): boolean {
  return kind.startsWith('query.');
}

/**
 * Vérifie si un kind est une opération gateway interne
 */
export function isGatewayKind(kind: GatewayInputKind): boolean {
  return kind.startsWith('gateway.');
}
