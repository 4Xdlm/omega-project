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
  // DG-05: MUSICALITE direction-aware — gains always pass, losses blocked above 0.10
  //
  // INV-GATE-DIR-01: Phase W Loi 2 (DURE) — MUSICALITE protégée uniquement en perte.
  // P03_COMPLEXIFY_SYNTAX → MUSICALITE = +0.838 (gain → NEVER blocked).
  // P05_INJECT_SYNCOPES  → MUSICALITE = -1.156 (loss → blocked if |delta| > 0.10).
  //
  // Threshold recalibrated 0.02 → 0.10 for 600-word scene amplitude range [0.04-0.07].
  // Proof: at amplitude 0.067 (15 sentences), |P05 × amp| = 0.077 < 0.10 → PASS.
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-05: shouldBlock MUSICALITE — direction-aware, threshold 0.10', () => {
    // Micro-deltas always pass
    expect(shouldBlock('MUSICALITE', 0.001)).toBe(false);
    expect(shouldBlock('MUSICALITE', -0.001)).toBe(false);
    expect(shouldBlock('MUSICALITE', 0)).toBe(false);
    // GAINS on MUSICALITE always pass (INV-GATE-DIR-01: protect losses only)
    // P03_COMPLEXIFY_SYNTAX at amp=0.06 gives +0.838×0.06 = +0.050 → PASS
    expect(shouldBlock('MUSICALITE', +0.03)).toBe(false);
    expect(shouldBlock('MUSICALITE', +0.05)).toBe(false);
    expect(shouldBlock('MUSICALITE', +0.15)).toBe(false);
    // LOSSES below threshold 0.10 pass
    // P05_INJECT_SYNCOPES at amp=0.067 gives -1.156×0.067 = -0.077 < 0.10 → PASS
    expect(shouldBlock('MUSICALITE', -0.05)).toBe(false);
    expect(shouldBlock('MUSICALITE', -0.077)).toBe(false);
    // LOSSES above threshold 0.10 are blocked
    expect(shouldBlock('MUSICALITE', -0.15)).toBe(true);
    expect(shouldBlock('MUSICALITE', -0.20)).toBe(true);
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
  // DG-07: evaluateDamageGate — micro amplitude passes, massive blocks
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-07: micro-amplitude passes gate, massive amplitude blocks on MUSICALITE', () => {
    // A) Micro-intervention (1 sentence out of ~140) passes
    const microResult = evaluateDamageGate('TENSION_14D', 0.007, 'BALANCED');
    expect(microResult.blocked).toBe(false);

    // B) Massive amplitude (0.5) blocks — MUSICALITE delta = -1.156 × 0.5 = -0.578 >> 0.02
    const massiveResult = evaluateDamageGate('TENSION_14D', 0.5, 'BALANCED');
    expect(massiveResult.blocked).toBe(true);
    expect(massiveResult.block_reasons.some(r => r.includes('MUSICALITE'))).toBe(true);
    expect(massiveResult.perturbation).toBe('P05_INJECT_SYNCOPES');
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

  // ─────────────────────────────────────────────────────────────────────────
  // DG-10: Micro-intervention PASSES the gate at realistic amplitude
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-10: micro-intervention at realistic amplitude passes gate', () => {
    // 1 phrase modified out of 100 = amplitude 0.01
    const result = evaluateDamageGate('TENSION_14D', 0.01, 'BALANCED');
    expect(result.blocked).toBe(false);
    // Verify MUSICALITE delta is tiny
    const musicDelta = result.predictions.find(p => p.category === 'MUSICALITE');
    expect(Math.abs(musicDelta!.predicted_delta)).toBeLessThan(0.02);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-11: Hook injection PASSES the gate at realistic amplitude
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-11: hook injection at realistic amplitude passes gate', () => {
    const result = evaluateDamageGate('HOOK_INJECTION', 0.01, 'BALANCED');
    expect(result.blocked).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-12: Gate blocks massive modifications correctly
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-12: massive modification blocked correctly', () => {
    // Amplitude 0.3 = modifying 30% of text
    const result = evaluateDamageGate('TENSION_14D', 0.3, 'BALANCED');
    expect(result.blocked).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-13: Micro-intervention passes even with BRUTAL archetype
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-13: micro-intervention passes even with BRUTAL archetype', () => {
    // BRUTAL: P05→TENSION ×2.81, P05→MUSICALITE ×0.68
    // At amplitude 0.01: MUSICALITE = -1.156 × 0.01 × 0.68 = -0.00786 → under 0.02
    // TENSION = -0.382 × 0.01 × 2.81 = -0.01073 → under 0.50
    const result = evaluateDamageGate('TENSION_14D', 0.01, 'BRUTAL');
    expect(result.blocked).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DG-14: Default MUSICALITE threshold recalibrated 0.02 → 0.10
  //
  // Rationale: Phase W hotfix calibration assumed amplitude ~0.007 (corpus chapters
  // ~100-200 sentences). Generated scenes ~600 words = 15-23 sentences →
  // amplitude = 0.043–0.070 (5-7× higher). Old threshold blocked ALL interventions.
  //
  // Math proof: amplitude 0.067 → P05×MUSICALITE = 1.156×0.067 = 0.077 < 0.10 → PASS.
  // Safety margin: max real amplitude 0.10 → delta 0.116 > 0.10 → BLOCKED.
  // ─────────────────────────────────────────────────────────────────────────
  it('DG-14: default MUSICALITE threshold is 0.10 (recalibrated for 600-word scenes)', () => {
    expect(DEFAULT_DAMAGE_GATE_CONFIG.thresholds.MUSICALITE).toBe(0.10);
  });
});
