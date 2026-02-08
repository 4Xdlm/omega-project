/**
 * OMEGA Genesis Planner — Emotion Target Validator
 * Phase C.1 — G-INV-01: No plan without validated inputs.
 */

import type { ValidationResult, ValidationError } from '../types.js';

const TIMESTAMP_ZERO = '2026-02-08T00:00:00.000Z';

export function validateEmotionTarget(target: unknown, timestamp?: string): ValidationResult {
  const ts = timestamp ?? TIMESTAMP_ZERO;
  const errors: ValidationError[] = [];
  const invariant = 'G-INV-01' as const;

  if (!target || typeof target !== 'object') {
    errors.push({ invariant, path: 'emotion_target', message: 'EmotionTarget is null or not an object', severity: 'FATAL' });
    return { verdict: 'FAIL', errors, invariants_checked: [invariant], invariants_passed: [], timestamp_deterministic: ts };
  }

  const e = target as Record<string, unknown>;

  if (typeof e.arc_emotion !== 'string' || e.arc_emotion.trim() === '') {
    errors.push({ invariant, path: 'emotion_target.arc_emotion', message: 'arc_emotion must be a non-empty string', severity: 'FATAL' });
  }

  if (!Array.isArray(e.waypoints) || e.waypoints.length < 2) {
    errors.push({ invariant, path: 'emotion_target.waypoints', message: 'waypoints must have at least 2 entries', severity: 'FATAL' });
  } else {
    let lastPosition = -1;
    for (let idx = 0; idx < e.waypoints.length; idx++) {
      const wp = e.waypoints[idx] as Record<string, unknown>;
      const path = `emotion_target.waypoints[${idx}]`;

      if (typeof wp.position !== 'number' || wp.position < 0 || wp.position > 1) {
        errors.push({ invariant, path: `${path}.position`, message: 'position must be in [0, 1]', severity: 'FATAL' });
      } else if (wp.position < lastPosition) {
        errors.push({ invariant, path: `${path}.position`, message: 'positions must be sorted ascending', severity: 'FATAL' });
      } else {
        lastPosition = wp.position;
      }

      if (typeof wp.intensity !== 'number' || wp.intensity < 0 || wp.intensity > 1) {
        errors.push({ invariant, path: `${path}.intensity`, message: 'intensity must be in [0, 1]', severity: 'FATAL' });
      }

      if (typeof wp.emotion !== 'string' || wp.emotion.trim() === '') {
        errors.push({ invariant, path: `${path}.emotion`, message: 'emotion must be a non-empty string', severity: 'FATAL' });
      }
    }
  }

  if (typeof e.climax_position !== 'number' || e.climax_position < 0 || e.climax_position > 1) {
    errors.push({ invariant, path: 'emotion_target.climax_position', message: 'climax_position must be in [0, 1]', severity: 'FATAL' });
  }

  if (typeof e.resolution_emotion !== 'string' || e.resolution_emotion.trim() === '') {
    errors.push({ invariant, path: 'emotion_target.resolution_emotion', message: 'resolution_emotion must be a non-empty string', severity: 'FATAL' });
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
