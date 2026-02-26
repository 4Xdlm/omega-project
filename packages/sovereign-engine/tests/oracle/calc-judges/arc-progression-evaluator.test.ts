// tests/oracle/calc-judges/arc-progression-evaluator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateArcScore, requiresArcBeforePolish } from '../../../src/oracle/calc-judges/arc-progression-evaluator.js';

describe('INV-ARC-01 — calculateArcScore', () => {
  it('1. Scene plate [0.5,0.5,0.5,0.5] -> FLAT, score=0', () => {
    const r = calculateArcScore([0.5, 0.5, 0.5, 0.5], 'ThreatReveal');
    expect(r.verdict).toBe('FLAT');
    expect(r.score).toBe(0);
  });

  it('2. Scene quasi-plate [0.5,0.51,0.5,0.51] -> FLAT (variance < 0.02)', () => {
    const r = calculateArcScore([0.5, 0.51, 0.5, 0.51], 'SlowBurn');
    expect(r.verdict).toBe('FLAT');
  });

  it('3. Correlation negative -> INVERTED, score=0', () => {
    // ThreatReveal target_curve = [0.30, 0.55, 0.85, 0.65] -> inverse = [0.65, 0.85, 0.55, 0.30]
    const r = calculateArcScore([0.65, 0.85, 0.55, 0.30], 'ThreatReveal');
    expect(r.verdict).toBe('INVERTED');
    expect(r.score).toBe(0);
    expect(r.correlation).toBeLessThan(0);
  });

  it('4. Correlation faible < 0.3 -> WEAK', () => {
    // Scores orthogonaux a la courbe cible
    const r = calculateArcScore([0.80, 0.20, 0.80, 0.20], 'ThreatReveal');
    expect(['WEAK', 'INVERTED']).toContain(r.verdict);
  });

  it('5. Scores conformes a ThreatReveal -> CONFORM, score >= 30', () => {
    // Suit [0.30, 0.55, 0.85, 0.65] de pres
    const r = calculateArcScore([0.28, 0.57, 0.83, 0.67], 'ThreatReveal');
    expect(r.verdict).toBe('CONFORM');
    expect(r.score).toBeGreaterThan(30);
  });

  it('6. Scores conformes a SlowBurn -> CONFORM', () => {
    // SlowBurn target = [0.40, 0.55, 0.70, 0.80]
    const r = calculateArcScore([0.38, 0.56, 0.72, 0.82], 'SlowBurn');
    expect(r.verdict).toBe('CONFORM');
  });

  it('7. ArcScoreResult contient tous les champs', () => {
    const r = calculateArcScore([0.28, 0.57, 0.83, 0.67], 'ThreatReveal');
    expect(r).toHaveProperty('score');
    expect(r).toHaveProperty('verdict');
    expect(r).toHaveProperty('correlation');
    expect(r).toHaveProperty('variance');
    expect(typeof r.variance).toBe('number');
  });
});

describe('INV-ARC-02 — requiresArcBeforePolish', () => {
  it('8. Throw si arc_score undefined ou null — guard polonaise obligatoire', () => {
    expect(() => requiresArcBeforePolish(undefined)).toThrow('INV-ARC-02 VIOLATION');
    expect(() => requiresArcBeforePolish(null)).toThrow('INV-ARC-02 VIOLATION');
    expect(() => requiresArcBeforePolish(0)).not.toThrow();
    expect(() => requiresArcBeforePolish(85)).not.toThrow();
  });
});
