/**
 * OMEGA Genesis Planner — Style Genome Validator
 * Phase C.1 — G-INV-01: No plan without validated inputs.
 */

import type { ValidationResult, ValidationError } from '../types.js';

const TIMESTAMP_ZERO = '2026-02-08T00:00:00.000Z';

function inRange(val: unknown, min: number, max: number): boolean {
  return typeof val === 'number' && val >= min && val <= max;
}

export function validateGenome(genome: unknown, timestamp?: string): ValidationResult {
  const ts = timestamp ?? TIMESTAMP_ZERO;
  const errors: ValidationError[] = [];
  const invariant = 'G-INV-01' as const;

  if (!genome || typeof genome !== 'object') {
    errors.push({ invariant, path: 'genome', message: 'Genome is null or not an object', severity: 'FATAL' });
    return { verdict: 'FAIL', errors, invariants_checked: [invariant], invariants_passed: [], timestamp_deterministic: ts };
  }

  const g = genome as Record<string, unknown>;

  if (!inRange(g.target_burstiness, 0, 1)) {
    errors.push({ invariant, path: 'genome.target_burstiness', message: 'target_burstiness must be in [0, 1]', severity: 'FATAL' });
  }

  if (!inRange(g.target_lexical_richness, 0, 1)) {
    errors.push({ invariant, path: 'genome.target_lexical_richness', message: 'target_lexical_richness must be in [0, 1]', severity: 'FATAL' });
  }

  if (typeof g.target_avg_sentence_length !== 'number' || g.target_avg_sentence_length <= 0) {
    errors.push({ invariant, path: 'genome.target_avg_sentence_length', message: 'target_avg_sentence_length must be > 0', severity: 'FATAL' });
  }

  if (!inRange(g.target_dialogue_ratio, 0, 1)) {
    errors.push({ invariant, path: 'genome.target_dialogue_ratio', message: 'target_dialogue_ratio must be in [0, 1]', severity: 'FATAL' });
  }

  if (!inRange(g.target_description_density, 0, 1)) {
    errors.push({ invariant, path: 'genome.target_description_density', message: 'target_description_density must be in [0, 1]', severity: 'FATAL' });
  }

  if (!Array.isArray(g.signature_traits) || g.signature_traits.length < 1 || !g.signature_traits.every((t: unknown) => typeof t === 'string' && (t as string).trim() !== '')) {
    errors.push({ invariant, path: 'genome.signature_traits', message: 'signature_traits must be a non-empty array of non-empty strings', severity: 'FATAL' });
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
