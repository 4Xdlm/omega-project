/**
 * OMEGA Genesis Planner — Canon Validator
 * Phase C.1 — G-INV-01: No plan without validated inputs.
 */

import type { ValidationResult, ValidationError, CanonCategory } from '../types.js';

const TIMESTAMP_ZERO = '2026-02-08T00:00:00.000Z';
const VALID_CATEGORIES: ReadonlySet<string> = new Set<CanonCategory>(['character', 'world', 'event', 'rule', 'relationship']);

export function validateCanon(canon: unknown, timestamp?: string): ValidationResult {
  const ts = timestamp ?? TIMESTAMP_ZERO;
  const errors: ValidationError[] = [];
  const invariant = 'G-INV-01' as const;

  if (!canon || typeof canon !== 'object') {
    errors.push({ invariant, path: 'canon', message: 'Canon is null or not an object', severity: 'FATAL' });
    return { verdict: 'FAIL', errors, invariants_checked: [invariant], invariants_passed: [], timestamp_deterministic: ts };
  }

  const c = canon as Record<string, unknown>;

  if (!Array.isArray(c.entries) || c.entries.length < 1) {
    errors.push({ invariant, path: 'canon.entries', message: 'entries must be a non-empty array', severity: 'FATAL' });
    return { verdict: 'FAIL', errors, invariants_checked: [invariant], invariants_passed: [], timestamp_deterministic: ts };
  }

  const seenIds = new Set<string>();
  for (let idx = 0; idx < c.entries.length; idx++) {
    const entry = c.entries[idx] as Record<string, unknown>;
    const path = `canon.entries[${idx}]`;

    if (typeof entry.id !== 'string' || entry.id.trim() === '') {
      errors.push({ invariant, path: `${path}.id`, message: 'entry id must be a non-empty string', severity: 'FATAL' });
    } else if (seenIds.has(entry.id)) {
      errors.push({ invariant, path: `${path}.id`, message: `duplicate entry id: ${entry.id}`, severity: 'FATAL' });
    } else {
      seenIds.add(entry.id);
    }

    if (typeof entry.category !== 'string' || !VALID_CATEGORIES.has(entry.category)) {
      errors.push({ invariant, path: `${path}.category`, message: `category must be one of: ${[...VALID_CATEGORIES].join(', ')}`, severity: 'FATAL' });
    }

    if (typeof entry.statement !== 'string' || entry.statement.trim() === '') {
      errors.push({ invariant, path: `${path}.statement`, message: 'statement must be a non-empty string', severity: 'FATAL' });
    }
  }

  const passed = errors.length === 0;
  return {
    verdict: passed ? 'PASS' : 'FAIL',
    errors,
    invariants_checked: [invariant],
    invariants_passed: passed ? [invariant] : [],
    timestamp_deterministic: ts,
  };
}
