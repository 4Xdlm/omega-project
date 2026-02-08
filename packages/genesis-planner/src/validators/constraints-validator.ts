/**
 * OMEGA Genesis Planner — Constraints Validator
 * Phase C.1 — G-INV-01: No plan without validated inputs.
 */

import type { ValidationResult, ValidationError, POV, Tense } from '../types.js';

const TIMESTAMP_ZERO = '2026-02-08T00:00:00.000Z';
const VALID_POV: ReadonlySet<string> = new Set<POV>(['first', 'third-limited', 'third-omniscient', 'second', 'mixed']);
const VALID_TENSE: ReadonlySet<string> = new Set<Tense>(['past', 'present', 'mixed']);

export function validateConstraints(constraints: unknown, timestamp?: string): ValidationResult {
  const ts = timestamp ?? TIMESTAMP_ZERO;
  const errors: ValidationError[] = [];
  const invariant = 'G-INV-01' as const;

  if (!constraints || typeof constraints !== 'object') {
    errors.push({ invariant, path: 'constraints', message: 'Constraints is null or not an object', severity: 'FATAL' });
    return { verdict: 'FAIL', errors, invariants_checked: [invariant], invariants_passed: [], timestamp_deterministic: ts };
  }

  const c = constraints as Record<string, unknown>;

  if (typeof c.pov !== 'string' || !VALID_POV.has(c.pov)) {
    errors.push({ invariant, path: 'constraints.pov', message: `pov must be one of: ${[...VALID_POV].join(', ')}`, severity: 'FATAL' });
  }

  if (typeof c.tense !== 'string' || !VALID_TENSE.has(c.tense)) {
    errors.push({ invariant, path: 'constraints.tense', message: `tense must be one of: ${[...VALID_TENSE].join(', ')}`, severity: 'FATAL' });
  }

  if (typeof c.max_dialogue_ratio !== 'number' || c.max_dialogue_ratio < 0 || c.max_dialogue_ratio > 1) {
    errors.push({ invariant, path: 'constraints.max_dialogue_ratio', message: 'max_dialogue_ratio must be in [0, 1]', severity: 'FATAL' });
  }

  if (typeof c.min_sensory_anchors_per_scene !== 'number' || c.min_sensory_anchors_per_scene < 0) {
    errors.push({ invariant, path: 'constraints.min_sensory_anchors_per_scene', message: 'min_sensory_anchors_per_scene must be >= 0', severity: 'FATAL' });
  }

  const maxScenes = typeof c.max_scenes === 'number' ? c.max_scenes : -1;
  const minScenes = typeof c.min_scenes === 'number' ? c.min_scenes : -1;

  if (typeof c.min_scenes !== 'number' || c.min_scenes <= 0) {
    errors.push({ invariant, path: 'constraints.min_scenes', message: 'min_scenes must be > 0', severity: 'FATAL' });
  }

  if (typeof c.max_scenes !== 'number' || c.max_scenes <= 0) {
    errors.push({ invariant, path: 'constraints.max_scenes', message: 'max_scenes must be > 0', severity: 'FATAL' });
  }

  if (maxScenes > 0 && minScenes > 0 && maxScenes < minScenes) {
    errors.push({ invariant, path: 'constraints.max_scenes', message: 'max_scenes must be >= min_scenes', severity: 'FATAL' });
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
