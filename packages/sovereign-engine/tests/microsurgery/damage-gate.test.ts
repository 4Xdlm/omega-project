/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DAMAGE GATE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/microsurgery/damage-gate.test.ts
 * Version: 1.0.0 (Phase W Integration)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * 9 tests validating the Damage Gate predictor.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
  predictDamage,
  shouldBlock,
  evaluateDamageGate,
  mapInterventionType,
  DEFAULT_DAMAGE_GATE_CONFIG,
  type DamageCategory,
  type PerturbationType,
  type ArchetypeId,
  type DamageGateResult,
  type DamageGateConfig,
} from '../../src/microsurgery/damage-gate.js';

describe('Damage Gate (Phase W Integration)', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // DG-01: predictDamage returns correct delta for known slope
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-01: predictDamage computes slope × amplitude × archetype for known slope', () => {
    // P05_INJECT_SYNCOPES → MUSICALITE slope = -1.156, BALANCED archetype = ×1.0
    const delta = predictDamage('P05_INJECT_SYNCOPES', 'MUSICALITE', 0.5, 'BALANCED');
    // Expected: -1.156 × 0.5 × 1.0 = -0.578
    expect(delta).toBeCloseTo(-0.578, 3);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-02: predictDamage returns 0 for missing slope (no significant effect)
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-02: predictDamage returns 0 for category with no slope', () => {
    // P04_REMOVE_INTERIORITY has no slope for TENSION
    const delta = predictDamage('P04_REMOVE_INTERIORITY', 'TENSION', 0.5, 'BALANCED');
    expect(delta).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-03: amplitude is clamped to max_amplitude (0.50)
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-03: amplitude is clamped to max_amplitude', () => {
    const deltaAt50 = predictDamage('P03_COMPLEXIFY_SYNTAX', 'COMPLEXITE', 0.50, 'BALANCED');
    const deltaAt99 = predictDamage('P03_COMPLEXIFY_SYNTAX', 'COMPLEXITE', 0.99, 'BALANCED');
    // Both should be identical since amplitude is clamped to 0.50
    expect(deltaAt50).toBeCloseTo(deltaAt99, 6);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-04: archetype multiplier changes the delta
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-04: BRUTAL archetype amplifies TENSION for P03', () => {
    const balanced = predictDamage('P03_COMPLEXIFY_SYNTAX', 'TENSION', 0.5, 'BALANCED');
    const brutal = predictDamage('P03_COMPLEXIFY_SYNTAX', 'TENSION', 0.5, 'BRUTAL');
    // BRUTAL has 5.39× for P03:TENSION
    expect(Math.abs(brutal)).toBeCloseTo(Math.abs(balanced) * 5.39, 2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-05: MUSICALITE blocks any non-zero delta (threshold = 0)
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-05: shouldBlock returns true for MUSICALITE with any non-zero delta', () => {
    expect(shouldBlock('MUSICALITE', 0.001)).toBe(true);
    expect(shouldBlock('MUSICALITE', -0.001)).toBe(true);
    expect(shouldBlock('MUSICALITE', 0)).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-06: Other categories block only above their threshold
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-06: COMPLEXITE blocks only above 0.05 threshold', () => {
    expect(shouldBlock('COMPLEXITE', 0.04)).toBe(false);
    expect(shouldBlock('COMPLEXITE', 0.06)).toBe(true);
    expect(shouldBlock('COMPLEXITE', -0.06)).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-07: evaluateDamageGate returns blocked=true when MUSICALITE is hit
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-07: evaluateDamageGate blocks TENSION_14D (P05 hits MUSICALITE)', () => {
    const result = evaluateDamageGate('TENSION_14D', 0.5, 'BALANCED');
    expect(result.blocked).toBe(true);
    expect(result.block_reasons.length).toBeGreaterThan(0);
    expect(result.block_reasons.some(r => r.includes('MUSICALITE'))).toBe(true);
    expect(result.perturbation).toBe('P05_INJECT_SYNCOPES');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-08: mapInterventionType maps correctly
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-08: mapInterventionType maps TENSION_14D and HOOK_INJECTION', () => {
    expect(mapInterventionType('TENSION_14D')).toBe('P05_INJECT_SYNCOPES');
    expect(mapInterventionType('HOOK_INJECTION')).toBe('P03_COMPLEXIFY_SYNTAX');
    expect(mapInterventionType('UNKNOWN')).toBeUndefined();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-09: evaluateDamageGate returns 6 predictions (one per category)
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-09: evaluateDamageGate always returns 6 predictions', () => {
    const result = evaluateDamageGate('HOOK_INJECTION', 0.3, 'CATHEDRAL');
    expect(result.predictions).toHaveLength(6);
    const cats = result.predictions.map(p => p.category);
    expect(cats).toContain('MUSICALITE');
    expect(cats).toContain('COMPLEXITE');
    expect(cats).toContain('SENSORIEL');
    expect(cats).toContain('LEXICAL');
    expect(cats).toContain('INTERIORITE');
    expect(cats).toContain('TENSION');
  });
});
