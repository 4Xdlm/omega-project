/**
 * OMEGA Forge — Law 6: Affective Synthesis Tests
 * Phase C.5 — A + B -> C if Phi_A + Phi_B > Threshold_Sigma
 * 8 tests
 */

import { describe, it, expect } from 'vitest';
import {
  computeSynthesisMass,
  checkSynthesis,
  detectSynthesis,
  verifyLaw6,
} from '../../src/physics/law-6-synthesis.js';

describe('law-6-synthesis', () => {
  it('valid synthesis: combined flux exceeds threshold', () => {
    const result = checkSynthesis(5, 6, 8);
    // 5 + 6 = 11 > 8
    expect(result.compliant).toBe(true);
    expect(result.total_flux).toBe(11);
  });

  it('below threshold: combined flux insufficient', () => {
    const result = checkSynthesis(2, 3, 8);
    // 2 + 3 = 5 <= 8
    expect(result.compliant).toBe(false);
    expect(result.total_flux).toBe(5);
  });

  it('mass formula: sqrt(M1^2 + M2^2) + beta', () => {
    const mass = computeSynthesisMass(3, 4, 1);
    // sqrt(9 + 16) + 1 = 5 + 1 = 6
    expect(mass).toBeCloseTo(6, 10);
  });

  it('mass formula: zero beta', () => {
    const mass = computeSynthesisMass(3, 4, 0);
    // sqrt(9 + 16) + 0 = 5
    expect(mass).toBeCloseTo(5, 10);
  });

  it('detectSynthesis: finds pairs above threshold', () => {
    const emotions = [
      { emotion: 'fear', intensity: 0.8 },
      { emotion: 'anger', intensity: 0.7 },
      { emotion: 'joy', intensity: 0.2 },
    ];
    const results = detectSynthesis(emotions, 1.0);
    // fear + anger = 1.5 > 1.0 -> should be detected
    expect(results.length).toBeGreaterThanOrEqual(1);
    const fearAnger = results.find((r) => r.a === 'fear' && r.b === 'anger');
    expect(fearAnger).toBeDefined();
    expect(fearAnger!.combined_intensity).toBeCloseTo(1.5, 10);
  });

  it('detectSynthesis: no synthesis when all below threshold', () => {
    const emotions = [
      { emotion: 'joy', intensity: 0.2 },
      { emotion: 'trust', intensity: 0.3 },
    ];
    const results = detectSynthesis(emotions, 1.0);
    // 0.2 + 0.3 = 0.5 <= 1.0
    expect(results.length).toBe(0);
  });

  it('detectSynthesis: multiple pairs detected', () => {
    const emotions = [
      { emotion: 'fear', intensity: 0.8 },
      { emotion: 'anger', intensity: 0.9 },
      { emotion: 'sadness', intensity: 0.7 },
    ];
    const results = detectSynthesis(emotions, 1.0);
    // fear+anger=1.7, fear+sadness=1.5, anger+sadness=1.6 -> all 3 pairs
    expect(results.length).toBe(3);
  });

  it('determinism: same inputs produce identical outputs', () => {
    const m1 = computeSynthesisMass(3, 4, 1);
    const m2 = computeSynthesisMass(3, 4, 1);
    expect(m1).toBe(m2);

    const c1 = checkSynthesis(5, 6, 8);
    const c2 = checkSynthesis(5, 6, 8);
    expect(c1.compliant).toBe(c2.compliant);
    expect(c1.total_flux).toBe(c2.total_flux);

    const v1 = verifyLaw6(5, 6, 3, 4, 1, 8, 0, 1);
    const v2 = verifyLaw6(5, 6, 3, 4, 1, 8, 0, 1);
    expect(v1.compliant).toBe(v2.compliant);
    expect(v1.measured_value).toBe(v2.measured_value);
    expect(v1.threshold).toBe(v2.threshold);
  });
});
