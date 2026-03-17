/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DAMAGE GATE BENCHMARK TEST
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/microsurgery/damage-gate-bench.test.ts
 * Version: 1.0.0 (Phase W Integration)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Validates the Damage Gate against all archetype × perturbation × category
 * combinations. Ensures consistency and correctness of the slopes matrix.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  predictDamage,
  evaluateDamageGate,
  type PerturbationType,
  type ArchetypeId,
  type DamageCategory,
} from '../../src/microsurgery/damage-gate.js';
import { STYLE_PRESETS } from '../../src/microsurgery/style-presets.js';

const PERTURBATIONS: PerturbationType[] = [
  'P03_COMPLEXIFY_SYNTAX',
  'P04_REMOVE_INTERIORITY',
  'P05_INJECT_SYNCOPES',
];

const ARCHETYPES: ArchetypeId[] = [
  'BALANCED', 'BRUTAL', 'CATHEDRAL', 'INTERIOR', 'SENSORY',
];

const CATEGORIES: DamageCategory[] = [
  'MUSICALITE', 'COMPLEXITE', 'SENSORIEL', 'LEXICAL', 'INTERIORITE', 'TENSION',
];

describe('Damage Gate Benchmark (Phase W Integration)', () => {
  it('BENCH-01: all 3×5×6 = 90 combinations produce finite numbers', () => {
    let count = 0;
    for (const p of PERTURBATIONS) {
      for (const a of ARCHETYPES) {
        for (const c of CATEGORIES) {
          const delta = predictDamage(p, c, 0.5, a);
          expect(Number.isFinite(delta)).toBe(true);
          count++;
        }
      }
    }
    expect(count).toBe(90);
  });

  it('BENCH-02: BALANCED archetype has multiplier 1.0 (no distortion)', () => {
    for (const p of PERTURBATIONS) {
      for (const c of CATEGORIES) {
        const balanced = predictDamage(p, c, 0.5, 'BALANCED');
        // For BALANCED, delta = slope × 0.5 × 1.0
        // Re-compute with amplitude 0.25 to verify linearity
        const half = predictDamage(p, c, 0.25, 'BALANCED');
        if (balanced !== 0) {
          expect(half).toBeCloseTo(balanced / 2, 6);
        }
      }
    }
  });

  it('BENCH-03: amplitude=0 produces delta=0 for all combinations', () => {
    for (const p of PERTURBATIONS) {
      for (const a of ARCHETYPES) {
        for (const c of CATEGORIES) {
          const delta = predictDamage(p, c, 0, a);
          expect(delta).toBe(0);
        }
      }
    }
  });

  it('BENCH-04: evaluateDamageGate with each preset produces valid results', () => {
    const interventionTypes = ['TENSION_14D', 'HOOK_INJECTION'];
    for (const preset of Object.values(STYLE_PRESETS)) {
      for (const iType of interventionTypes) {
        const result = evaluateDamageGate(iType, 0.5, preset.archetype, preset.config);
        expect(result.predictions).toHaveLength(6);
        expect(typeof result.blocked).toBe('boolean');
        expect(Array.isArray(result.block_reasons)).toBe(true);
      }
    }
  });

  it('BENCH-05: P04_REMOVE_INTERIORITY has fewer non-zero slopes than P05', () => {
    let p04NonZero = 0;
    let p05NonZero = 0;
    for (const c of CATEGORIES) {
      if (predictDamage('P04_REMOVE_INTERIORITY', c, 0.5, 'BALANCED') !== 0) p04NonZero++;
      if (predictDamage('P05_INJECT_SYNCOPES', c, 0.5, 'BALANCED') !== 0) p05NonZero++;
    }
    // P04 has 2 slopes, P05 has 6 slopes
    expect(p04NonZero).toBe(2);
    expect(p05NonZero).toBe(6);
  });

  it('BENCH-06: MUSICALITE always blocks TENSION_14D (P05 has non-zero MUSICALITE slope)', () => {
    for (const a of ARCHETYPES) {
      const result = evaluateDamageGate('TENSION_14D', 0.5, a);
      // P05 has MUSICALITE slope = -1.156, so delta != 0, so blocked
      expect(result.blocked).toBe(true);
    }
  });
});
