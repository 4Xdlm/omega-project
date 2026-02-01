/**
 * VALIDATION SPECIFICATIONS
 * Phase E-SPEC — Validation contracts (no implementation)
 *
 * Manual schema validation without external dependencies (no Ajv)
 */

import type { DriftEvent, DriftPolicy, EscalationLevel, DriftType } from './DRIFT_TYPES.spec';

// ─────────────────────────────────────────────────────────────
// VALIDATION RESULT
// ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────
// VALIDATOR INTERFACE
// ─────────────────────────────────────────────────────────────

export interface IValidator {
  /**
   * Validate DriftEvent structure
   * Manual validation - no external dependencies
   */
  validateDriftEvent(event: unknown): ValidationResult;

  /**
   * Validate DriftPolicy structure
   */
  validatePolicy(policy: unknown): ValidationResult;

  /**
   * Validate SHA256 hash format (64 hex chars)
   */
  validateHash(hash: unknown): boolean;

  /**
   * Validate ISO8601 timestamp
   */
  validateTimestamp(timestamp: unknown): boolean;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION CONSTANTS (from policy, not magic numbers)
// ─────────────────────────────────────────────────────────────

export const VALID_DRIFT_TYPES: readonly DriftType[] = [
  'SCHEMA_MISMATCH',
  'HASH_DEVIATION',
  'INVARIANT_VIOLATION',
  'THRESHOLD_BREACH',
  'CHAIN_BREAK'
] as const;

export const VALID_ESCALATION_LEVELS: readonly EscalationLevel[] = [
  'INFO',
  'WARNING',
  'CRITICAL',
  'HALT'
] as const;

export const HASH_PATTERN = /^[A-Fa-f0-9]{64}$/;
export const ISO8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
