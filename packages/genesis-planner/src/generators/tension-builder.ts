/**
 * OMEGA Genesis Planner — Tension Curve Builder
 * Phase C.1 — G-INV-04: monotonic-trend tension with controlled drops.
 */

import type { Scene, GConfig, GVerdict } from '../types.js';
import { resolveConfigRef } from '../config.js';

export function buildTensionCurve(scenes: readonly Scene[]): readonly number[] {
  const curve: number[] = [];
  let cumulative = 0;

  for (const scene of scenes) {
    let sceneTension = 0;
    for (const beat of scene.beats) {
      sceneTension += beat.tension_delta;
    }
    cumulative += sceneTension;
    curve.push(cumulative);
  }

  return curve;
}

export function validateTensionCurve(
  curve: readonly number[],
  config: GConfig,
): { verdict: GVerdict; plateaus: number; maxDrop: number } {
  const maxPlateau = resolveConfigRef(config, 'CONFIG:MAX_TENSION_PLATEAU');
  const maxDropAllowed = resolveConfigRef(config, 'CONFIG:MAX_TENSION_DROP');

  let plateauViolations = 0;
  let maxDrop = 0;
  let verdict: GVerdict = 'PASS';

  if (curve.length <= 1) {
    return { verdict: 'PASS', plateaus: 0, maxDrop: 0 };
  }

  let plateauCount = 1;
  for (let i = 1; i < curve.length; i++) {
    const diff = curve[i] - curve[i - 1];

    if (diff < 0 && Math.abs(diff) > maxDrop) {
      maxDrop = Math.abs(diff);
    }

    if (diff < -maxDropAllowed) {
      verdict = 'FAIL';
    }

    if (curve[i] === curve[i - 1]) {
      plateauCount++;
      if (plateauCount > maxPlateau) {
        plateauViolations++;
        verdict = 'FAIL';
      }
    } else {
      plateauCount = 1;
    }
  }

  return { verdict, plateaus: plateauViolations, maxDrop };
}
