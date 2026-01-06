// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — ERRORS CODÉES
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-WIRE-04: Erreurs = NexusError (error_code, pas de stack leak)
// @invariant INV-ADP-05: Jamais de path local, stack, secrets
//
// RÈGLES:
// - Jamais de stack trace brute
// - Jamais de path local  
// - Jamais d'erreur JS native exposée
// - Même erreur = même forme (determinism)
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { NexusError } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CODES D'ERREUR STANDARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Codes d'erreur pour le module Envelope
 */
export const EnvelopeErrorCodes = {
  INVALID_ENVELOPE: 'ENV_INVALID',
  UNKNOWN_FIELD: 'ENV_UNKNOWN_FIELD',
  MISSING_FIELD: 'ENV_MISSING_FIELD',
  BAD_TIMESTAMP: 'ENV_BAD_TIMESTAMP',
  BAD_SCHEMA: 'ENV_BAD_SCHEMA',
  NO_REPLAY_KEY: 'ENV_NO_REPLAY_KEY',
  BAD_KIND: 'ENV_BAD_KIND',
} as const;

/**
 * Codes d'erreur pour le module Wiring
 */
export const WiringErrorCodes = {
  NO_HANDLER: 'WIRE_NO_HANDLER',
  POLICY_REJECT: 'WIRE_POLICY_REJECT',
  VERSION_MISMATCH: 'WIRE_VERSION_MISMATCH',
  REPLAY_BLOCKED: 'WIRE_REPLAY_BLOCKED',
  DISPATCH_FAILED: 'WIRE_DISPATCH_FAILED',
} as const;

/**
 * Codes d'erreur pour les Adapters
 */
export const AdapterErrorCodes = {
  // Memory
  MEMORY_WRITE_FAILED: 'ADP_MEM_WRITE_FAILED',
  MEMORY_READ_FAILED: 'ADP_MEM_READ_FAILED',
  MEMORY_BAD_PAYLOAD: 'ADP_MEM_BAD_PAYLOAD',
  // Query
  QUERY_FAILED: 'ADP_QRY_FAILED',
  QUERY_BAD_PAYLOAD: 'ADP_QRY_BAD_PAYLOAD',
  QUERY_TIMEOUT: 'ADP_QRY_TIMEOUT',
  // Gateway
  GATEWAY_FAILED: 'ADP_GW_FAILED',
  GATEWAY_RATE_LIMITED: 'ADP_GW_RATE_LIMITED',
  GATEWAY_UNAUTHORIZED: 'ADP_GW_UNAUTHORIZED',
  // Generic
  UNSUPPORTED_SCHEMA: 'ADP_UNSUPPORTED_SCHEMA',
  BAD_PAYLOAD: 'ADP_BAD_PAYLOAD',
  INTERNAL_ERROR: 'ADP_INTERNAL_ERROR',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée une NexusError standardisée
 * 
 * @param module - Module source de l'erreur
 * @param error_code - Code d'erreur stable
 * @param message - Message humain stable
 * @param retryable - Indique si l'opération peut être retentée
 */
export function err(
  module: string,
  error_code: string,
  message: string,
  retryable: boolean = false
): NexusError {
  return {
    module,
    error_code,
    message,
    retryable,
  };
}

/**
 * Crée une erreur Envelope
 */
export function envelopeError(
  error_code: string,
  message: string
): NexusError {
  return err('envelope', error_code, message, false);
}

/**
 * Crée une erreur Wiring
 */
export function wiringError(
  error_code: string,
  message: string,
  retryable: boolean = false
): NexusError {
  return err('wiring', error_code, message, retryable);
}

/**
 * Crée une erreur Adapter
 */
export function adapterError(
  module: string,
  error_code: string,
  message: string,
  retryable: boolean = false
): NexusError {
  return err(module, error_code, message, retryable);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERREURS PRÉ-DÉFINIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Erreurs Envelope pré-définies
 */
export const EnvelopeErrors = {
  invalidEnvelope: () => 
    envelopeError(EnvelopeErrorCodes.INVALID_ENVELOPE, 'Envelope is not a valid object'),
  unknownField: (field: string) => 
    envelopeError(EnvelopeErrorCodes.UNKNOWN_FIELD, `Unknown envelope field: ${field}`),
  missingField: (field: string) => 
    envelopeError(EnvelopeErrorCodes.MISSING_FIELD, `Missing or invalid field: ${field}`),
  badTimestamp: () => 
    envelopeError(EnvelopeErrorCodes.BAD_TIMESTAMP, 'Invalid timestamp'),
  badSchema: () => 
    envelopeError(EnvelopeErrorCodes.BAD_SCHEMA, 'payload_schema must contain a dot (module.action)'),
  noReplayKey: () => 
    envelopeError(EnvelopeErrorCodes.NO_REPLAY_KEY, 'Missing replay_protection_key'),
  badKind: (kind: string) => 
    envelopeError(EnvelopeErrorCodes.BAD_KIND, `Invalid kind: ${kind}`),
} as const;

/**
 * Erreurs Wiring pré-définies
 */
export const WiringErrors = {
  noHandler: (target: string, schema: string) => 
    wiringError(WiringErrorCodes.NO_HANDLER, `No handler for ${target}:${schema}`),
  policyReject: (reason: string) => 
    wiringError(WiringErrorCodes.POLICY_REJECT, reason),
  versionMismatch: (expected: string, got: string) => 
    wiringError(WiringErrorCodes.VERSION_MISMATCH, `Expected ${expected}, got ${got}`),
  replayBlocked: () => 
    wiringError(WiringErrorCodes.REPLAY_BLOCKED, 'Replay blocked - message already processed'),
  dispatchFailed: () => 
    wiringError(WiringErrorCodes.DISPATCH_FAILED, 'Dispatch failed', true),
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE ERROR WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convertit une erreur native en NexusError sécurisée
 * AUCUNE fuite de stack, path ou secrets
 * 
 * @param caught - Erreur capturée (unknown)
 * @param module - Module source
 * @param error_code - Code d'erreur par défaut
 * @param retryable - Indique si l'opération peut être retentée
 */
export function safeError(
  _caught: unknown,
  module: string,
  error_code: string = AdapterErrorCodes.INTERNAL_ERROR,
  retryable: boolean = true
): NexusError {
  // RÈGLE: On ne lit JAMAIS le message de l'erreur native
  // pour éviter toute fuite d'information
  return err(module, error_code, 'An internal error occurred', retryable);
}

/**
 * Wrapper try/catch sécurisé
 * Garantit qu'aucune erreur native n'est exposée
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  module: string,
  error_code: string = AdapterErrorCodes.INTERNAL_ERROR
): Promise<{ ok: true; value: T } | { ok: false; error: NexusError }> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (caught) {
    return { ok: false, error: safeError(caught, module, error_code) };
  }
}
