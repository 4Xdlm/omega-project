/**
 * damage-gate.test.ts — Tests P3 : Cross-Axis Damage Gate
 * Sprint P3 — V-PARTITION v3.0.0
 *
 * INV-DG-01 : evaluateDamage() detects drop > threshold
 * INV-DG-02 : REJECT mode throws, WARN mode flags
 * 10 tests — 100% CALC — 0 appel LLM.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  evaluateDamage,
  enforceDamageGate,
  DamageGateError,
  DEFAULT_DAMAGE_THRESHOLDS,
  getDefaultDamageGateConfig,
} from '../../src/validation/damage-gate.js';
import type { MacroAxesScores } from '../../src/oracle/macro-axes.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMacroAxes(overrides: Partial<Record<'ecc' | 'rci' | 'sii' | 'ifi' | 'aai', number>>): MacroAxesScores {
  const base = { ecc: 90, rci: 88, sii: 87, ifi: 86, aai: 85 };
  const merged = { ...base, ...overrides };

  function axis(name: string, score: number) {
    return {
      name,
      score,
      weight: 0.2,
      method: 'CALC' as const,
      sub_scores: [],
      floor: { value: 85, triggered: false, detail: '' },
      cap: { value: 100, triggered: false, detail: '' },
      reasons: { top_contributors: [], top_penalties: [] },
    };
  }

  return {
    ecc: axis('ECC', merged.ecc),
    rci: axis('RCI', merged.rci),
    sii: axis('SII', merged.sii),
    ifi: axis('IFI', merged.ifi),
    aai: axis('AAI', merged.aai),
  };
}

afterEach(() => {
  delete process.env.OMEGA_DAMAGE_GATE_MODE;
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('P3 — Damage Gate', () => {

  // ── INV-DG-01 : detection ──────────────────────────────────────────────

  it('INV-DG-01: no damage → PASS', () => {
    const before = makeMacroAxes({});
    const after = makeMacroAxes({});
    const result = evaluateDamage(before, after);
    expect(result.verdict).toBe('PASS');
    expect(result.any_exceeded).toBe(false);
    expect(result.max_drop).toBe(0);
  });

  it('INV-DG-01: small drop within threshold → PASS', () => {
    const before = makeMacroAxes({ ecc: 90 });
    const after = makeMacroAxes({ ecc: 88.5 });
    const result = evaluateDamage(before, after);
    expect(result.verdict).toBe('PASS');
    expect(result.any_exceeded).toBe(false);
  });

  it('INV-DG-01: ECC drop > 2 → detected', () => {
    const before = makeMacroAxes({ ecc: 92 });
    const after = makeMacroAxes({ ecc: 89 });
    const result = evaluateDamage(before, after);
    expect(result.any_exceeded).toBe(true);
    const eccDamage = result.damages.find(d => d.axis === 'ECC');
    expect(eccDamage?.exceeded).toBe(true);
    expect(eccDamage?.drop).toBe(3);
  });

  it('INV-DG-01: AAI drop > 1.5 → detected (lower threshold)', () => {
    const before = makeMacroAxes({ aai: 88 });
    const after = makeMacroAxes({ aai: 86 });
    const result = evaluateDamage(before, after);
    expect(result.any_exceeded).toBe(true);
    const aaiDamage = result.damages.find(d => d.axis === 'AAI');
    expect(aaiDamage?.exceeded).toBe(true);
    expect(aaiDamage?.drop).toBe(2);
  });

  it('INV-DG-01: multiple axes damaged → all flagged', () => {
    const before = makeMacroAxes({ ecc: 92, rci: 90, sii: 89 });
    const after = makeMacroAxes({ ecc: 88, rci: 87, sii: 86 });
    const result = evaluateDamage(before, after);
    expect(result.any_exceeded).toBe(true);
    const exceeded = result.damages.filter(d => d.exceeded);
    expect(exceeded.length).toBe(3);
    expect(result.warnings.length).toBe(3);
  });

  // ── INV-DG-02 : modes ────────────────────────────────────────────────

  it('INV-DG-02: WARN mode → verdict WARN (no throw)', () => {
    const before = makeMacroAxes({ ecc: 92 });
    const after = makeMacroAxes({ ecc: 88 });
    const result = evaluateDamage(before, after, { mode: 'WARN' });
    expect(result.verdict).toBe('WARN');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('INV-DG-02: REJECT mode → verdict REJECT', () => {
    const before = makeMacroAxes({ ecc: 92 });
    const after = makeMacroAxes({ ecc: 88 });
    const result = evaluateDamage(before, after, { mode: 'REJECT' });
    expect(result.verdict).toBe('REJECT');
  });

  it('INV-DG-02: enforceDamageGate in REJECT mode → throws DamageGateError', () => {
    const before = makeMacroAxes({ ecc: 92 });
    const after = makeMacroAxes({ ecc: 88 });
    expect(() => enforceDamageGate(before, after, { mode: 'REJECT' }))
      .toThrow(DamageGateError);
  });

  it('INV-DG-02: enforceDamageGate in WARN mode → no throw', () => {
    const before = makeMacroAxes({ ecc: 92 });
    const after = makeMacroAxes({ ecc: 88 });
    const result = enforceDamageGate(before, after, { mode: 'WARN' });
    expect(result.verdict).toBe('WARN');
  });

  // ── Config ────────────────────────────────────────────────────────────

  it('default thresholds: ECC=2, RCI=2, SII=2, IFI=2, AAI=1.5', () => {
    expect(DEFAULT_DAMAGE_THRESHOLDS.ecc).toBe(2);
    expect(DEFAULT_DAMAGE_THRESHOLDS.rci).toBe(2);
    expect(DEFAULT_DAMAGE_THRESHOLDS.sii).toBe(2);
    expect(DEFAULT_DAMAGE_THRESHOLDS.ifi).toBe(2);
    expect(DEFAULT_DAMAGE_THRESHOLDS.aai).toBe(1.5);
  });

  it('env OMEGA_DAMAGE_GATE_MODE=REJECT → config mode REJECT', () => {
    process.env.OMEGA_DAMAGE_GATE_MODE = 'REJECT';
    const config = getDefaultDamageGateConfig();
    expect(config.mode).toBe('REJECT');
  });
});
