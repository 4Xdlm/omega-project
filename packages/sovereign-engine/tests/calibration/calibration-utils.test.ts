/**
 * OMNIPOTENT — Calibration Utility Tests
 *
 * CALIB-01: Spearman deterministic (known data with ties)
 * CALIB-02: Pearson deterministic (known data)
 * CALIB-03: Run JSON missing physics_score → FAIL
 * CALIB-04: Run JSON missing S_score → FAIL
 * CALIB-05: Run JSON missing Q_text → FAIL
 * CALIB-06: Decision A (strong positive)
 * CALIB-07: Decision B (weak)
 * CALIB-08: Decision C (strong negative)
 * CALIB-09: Decision GREY_ZONE
 * CALIB-10: FAIL-CLOSED (no thresholds)
 * CALIB-11: 20 runs minimum enforcement
 */
import { describe, it, expect } from 'vitest';
import {
  spearmanCorrelation,
  pearsonCorrelation,
  assignRanks,
  decideScenario,
  validateRunJSON,
  validateRunCount,
  loadOmnipotentThresholds,
} from '../../src/calibration/omnipotent-calibration-utils.js';

const THRESHOLDS = { strong_min: 0.50, weak_max: 0.30 };

// ═══════════════════════════════════════════════════════════════════════════════
// SPEARMAN + PEARSON
// ═══════════════════════════════════════════════════════════════════════════════

describe('OMNIPOTENT Calibration — Correlation Functions', () => {
  it('CALIB-01: Spearman deterministic — known data with ties', () => {
    // Perfect monotonic: [1,2,3,4,5] vs [2,4,6,8,10] → ρ = 1.0
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const rho = spearmanCorrelation(x, y);
    expect(Math.abs(rho - 1.0)).toBeLessThan(1e-10);

    // Perfect inverse monotonic → ρ = -1.0
    const yInv = [10, 8, 6, 4, 2];
    const rhoInv = spearmanCorrelation(x, yInv);
    expect(Math.abs(rhoInv - (-1.0))).toBeLessThan(1e-10);

    // With ties: [1,2,2,3] → ranks should be [1, 2.5, 2.5, 4]
    const xTies = [10, 20, 20, 30];
    const ranks = assignRanks(xTies);
    expect(ranks).toEqual([1, 2.5, 2.5, 4]);

    // Known Spearman with ties: [10,20,20,30] vs [1,2,3,4]
    const yNoTies = [1, 2, 3, 4];
    const rhoTies = spearmanCorrelation(xTies, yNoTies);
    // Should be close to 1.0 (monotonically increasing despite tie)
    expect(rhoTies).toBeGreaterThan(0.9);
    expect(rhoTies).toBeLessThanOrEqual(1.0);
  });

  it('CALIB-02: Pearson deterministic — known data', () => {
    // Perfect linear: [1,2,3,4,5] vs [2,4,6,8,10] → r = 1.0
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];
    const r = pearsonCorrelation(x, y);
    expect(Math.abs(r - 1.0)).toBeLessThan(1e-10);

    // Perfect inverse linear → r = -1.0
    const yInv = [10, 8, 6, 4, 2];
    const rInv = pearsonCorrelation(x, yInv);
    expect(Math.abs(rInv - (-1.0))).toBeLessThan(1e-10);

    // No correlation: constant y → r = 0
    const yConst = [5, 5, 5, 5, 5];
    const rConst = pearsonCorrelation(x, yConst);
    expect(rConst).toBe(0);

    // Known moderate correlation: [1,2,3,4,5] vs [1,3,2,5,4]
    const yMod = [1, 3, 2, 5, 4];
    const rMod = pearsonCorrelation(x, yMod);
    expect(rMod).toBeGreaterThan(0.5);
    expect(rMod).toBeLessThan(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RUN JSON VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('OMNIPOTENT Calibration — Run JSON Validation', () => {
  const VALID_SCORES = {
    physics_score: 72.5,
    S_score: 88.3,
    Q_text: 91.2,
    M: 89.1,
    G: 93.4,
    delta_as: 1,
    AS: 92.0,
    ECC: 87.5,
    RCI: 86.2,
    SII: 88.0,
    IFI: 85.3,
    AAI: 86.1,
  };

  it('CALIB-03: Run JSON missing physics_score → FAIL', () => {
    const { physics_score, ...rest } = VALID_SCORES;
    const errors = validateRunJSON({ scores: rest });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('physics_score'))).toBe(true);
  });

  it('CALIB-04: Run JSON missing S_score → FAIL', () => {
    const { S_score, ...rest } = VALID_SCORES;
    const errors = validateRunJSON({ scores: rest });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('S_score'))).toBe(true);
  });

  it('CALIB-05: Run JSON missing Q_text → FAIL', () => {
    const { Q_text, ...rest } = VALID_SCORES;
    const errors = validateRunJSON({ scores: rest });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Q_text'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

describe('OMNIPOTENT Calibration — Decision Logic', () => {
  it('CALIB-06: Decision A — strong positive correlation', () => {
    const result = decideScenario(0.7, 0.6, THRESHOLDS);
    expect(result).toBe('A');
  });

  it('CALIB-07: Decision B — weak correlation', () => {
    const result = decideScenario(0.1, 0.2, THRESHOLDS);
    expect(result).toBe('B');
  });

  it('CALIB-08: Decision C — strong negative correlation', () => {
    const result = decideScenario(-0.6, 0.3, THRESHOLDS);
    expect(result).toBe('C');
  });

  it('CALIB-09: Decision GREY_ZONE — intermediate', () => {
    const result = decideScenario(0.4, 0.4, THRESHOLDS);
    expect(result).toBe('B_GREY_ZONE');
  });

  it('CALIB-10: FAIL-CLOSED — no thresholds', () => {
    const result = decideScenario(0.7, 0.6, undefined);
    expect(result).toBe('FAIL-CLOSED');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RUNS MINIMUM
// ═══════════════════════════════════════════════════════════════════════════════

describe('OMNIPOTENT Calibration — Run Count Validation', () => {
  it('CALIB-11: < 20 runs → FAIL (no decision)', () => {
    const error = validateRunCount(15, 20);
    expect(error).not.toBeNull();
    expect(error).toContain('Insufficient');
    expect(error).toContain('15');
    expect(error).toContain('20');

    // 20 runs → OK
    const okError = validateRunCount(20, 20);
    expect(okError).toBeNull();

    // 25 runs → OK
    const overError = validateRunCount(25, 20);
    expect(overError).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SSOT LOADER
// ═══════════════════════════════════════════════════════════════════════════════

describe('OMNIPOTENT Calibration — SSOT Loader', () => {
  it('CALIB-SSOT-01: loadOmnipotentThresholds returns thresholds from GENIUS_SSOT.json', () => {
    const thresholds = loadOmnipotentThresholds();
    expect(thresholds).toBeDefined();
    expect(thresholds!.physics_corr_strong_min).toBe(0.50);
    expect(thresholds!.physics_corr_weak_max).toBe(0.30);
    expect(thresholds!.calibration_runs_required).toBe(20);
    expect(thresholds!.correlation_method_primary).toBe('spearman');
    expect(thresholds!.correlation_method_secondary).toBe('pearson');
  });
});
