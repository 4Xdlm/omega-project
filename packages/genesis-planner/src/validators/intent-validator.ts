/**
 * OMEGA Genesis Planner — Intent Validator
 * Phase C.1 — G-INV-01: No plan without validated inputs.
 */

import type { ValidationResult, ValidationError } from '../types.js';

const TIMESTAMP_ZERO = '2026-02-08T00:00:00.000Z';

export function validateIntent(intent: unknown, timestamp?: string): ValidationResult {
  const ts = timestamp ?? TIMESTAMP_ZERO;
  const errors: ValidationError[] = [];
  const invariant = 'G-INV-01' as const;

  if (!intent || typeof intent !== 'object') {
    errors.push({ invariant, path: 'intent', message: 'Intent is null or not an object', severity: 'FATAL' });
    return { verdict: 'FAIL', errors, invariants_checked: [invariant], invariants_passed: [], timestamp_deterministic: ts };
  }

  const i = intent as Record<string, unknown>;

  if (typeof i.title !== 'string' || i.title.trim() === '') {
    errors.push({ invariant, path: 'intent.title', message: 'title must be a non-empty string', severity: 'FATAL' });
  }
  if (typeof i.premise !== 'string' || i.premise.trim() === '') {
    errors.push({ invariant, path: 'intent.premise', message: 'premise must be a non-empty string', severity: 'FATAL' });
  }
  if (!Array.isArray(i.themes) || i.themes.length < 1 || !i.themes.every((t: unknown) => typeof t === 'string' && t.trim() !== '')) {
    errors.push({ invariant, path: 'intent.themes', message: 'themes must be a non-empty array of non-empty strings', severity: 'FATAL' });
  }
  if (typeof i.core_emotion !== 'string' || i.core_emotion.trim() === '') {
    errors.push({ invariant, path: 'intent.core_emotion', message: 'core_emotion must be a non-empty string', severity: 'FATAL' });
  }
  if (typeof i.target_audience !== 'string' || i.target_audience.trim() === '') {
    errors.push({ invariant, path: 'intent.target_audience', message: 'target_audience must be a non-empty string', severity: 'FATAL' });
  }
  if (typeof i.message !== 'string' || i.message.trim() === '') {
    errors.push({ invariant, path: 'intent.message', message: 'message must be a non-empty string', severity: 'FATAL' });
  }
  if (typeof i.target_word_count !== 'number' || i.target_word_count <= 0) {
    errors.push({ invariant, path: 'intent.target_word_count', message: 'target_word_count must be a positive number', severity: 'FATAL' });
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
