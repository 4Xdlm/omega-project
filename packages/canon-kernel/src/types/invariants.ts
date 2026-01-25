/**
 * OMEGA Canon Kernel — Invariants
 * Invariants are rules that must always hold true in the Canon.
 */

import type { EntityId, SchemaId } from './identifiers';
import type { FieldPath } from './operations';

export type InvariantSeverity = 'error' | 'warning' | 'info';

export interface Invariant {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: InvariantSeverity;
  readonly check: (context: InvariantContext) => ValidationResult;
}

export interface InvariantContext {
  readonly entity_id: EntityId;
  readonly schema_id: SchemaId;
  readonly field_path?: FieldPath;
  readonly old_value?: unknown;
  readonly new_value?: unknown;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface Violation {
  readonly invariant_id: string;
  readonly message: string;
  readonly severity: InvariantSeverity;
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly violations: readonly Violation[];
}

export function createValidationResult(
  valid: boolean,
  violations: readonly Violation[] = []
): ValidationResult {
  return { valid, violations };
}

export function combineValidationResults(
  results: readonly ValidationResult[]
): ValidationResult {
  const allViolations = results.flatMap(r => r.violations);
  const hasErrors = allViolations.some(v => v.severity === 'error');
  return {
    valid: !hasErrors,
    violations: allViolations,
  };
}

export const VALID: ValidationResult = Object.freeze({ valid: true, violations: [] });

export function invalid(violation: Violation): ValidationResult {
  return { valid: false, violations: [violation] };
}
