/**
 * Tests: Physics Activation Gate (Sprint 18.2)
 * Invariant: ART-CAL-02
 */

import { describe, it, expect } from 'vitest';
import { decidePhysicsActivation, getPhysicsWeight } from '../../src/calibration/physics-activation.js';

describe('PhysicsActivation (ART-CAL-02)', () => {
  it('PHACT-01: insufficient data → level 0', () => {
    const decision = decidePhysicsActivation(
      [80, 70, 90],  // only 3 runs
      [7, 6, 8],
    );

    expect(decision.recommended_level).toBe(0);
    expect(decision.recommended_weight).toBe(0);
    expect(decision.safe_to_activate).toBe(false);
    expect(decision.reason).toContain('Insufficient');
  });

  it('PHACT-02: strong positive correlation → level 3', () => {
    // 15 runs with strong positive correlation
    const physics = [30, 40, 50, 55, 60, 65, 70, 72, 75, 78, 80, 85, 88, 90, 95];
    const human =   [3,  4,  5,  5,  6,  6,  7,  7,  7,  8,  8,  8,  9,  9,  10];

    const decision = decidePhysicsActivation(physics, human);

    expect(decision.recommended_level).toBeGreaterThanOrEqual(2);
    expect(decision.safe_to_activate).toBe(true);
  });

  it('PHACT-03: negative correlation → level 0, unsafe', () => {
    // Physics and human scores inversely correlated
    const physics = [90, 85, 80, 75, 70, 65, 60, 55, 50, 45];
    const human =   [3,  4,  5,  5,  6,  6,  7,  7,  8,  9];

    const decision = decidePhysicsActivation(physics, human);

    expect(decision.recommended_level).toBe(0);
    expect(decision.safe_to_activate).toBe(false);
    expect(decision.reason).toContain('Negative');
  });

  it('PHACT-04: weak correlation → level 0 or 1', () => {
    // Random-ish data with low correlation
    const physics = [50, 80, 30, 70, 60, 40, 90, 20, 55, 75];
    const human =   [6,  5,  7,  6,  8,  4,  5,  7,  6,  5];

    const decision = decidePhysicsActivation(physics, human);

    expect(decision.recommended_level).toBeLessThanOrEqual(1);
  });

  it('PHACT-05: getPhysicsWeight returns correct values', () => {
    expect(getPhysicsWeight(0)).toBe(0);
    expect(getPhysicsWeight(1)).toBe(0.3);
    expect(getPhysicsWeight(2)).toBe(0.7);
    expect(getPhysicsWeight(3)).toBe(1.0);
  });

  it('PHACT-06: determinism', () => {
    const physics = [30, 40, 50, 60, 70, 75, 80, 85, 88, 92];
    const human =   [3,  4,  5,  6,  7,  7,  8,  8,  9,  9];

    const d1 = decidePhysicsActivation(physics, human);
    const d2 = decidePhysicsActivation(physics, human);

    expect(d1.recommended_level).toBe(d2.recommended_level);
    expect(d1.recommended_weight).toBe(d2.recommended_weight);
  });
});
