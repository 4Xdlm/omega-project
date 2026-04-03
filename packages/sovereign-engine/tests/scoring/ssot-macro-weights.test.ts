/**
 * R4-a — Test invariant SSOT poids macro-axes
 *
 * Vérifie que les deux sources de poids (config.ts MACRO_WEIGHTS et
 * weight-calibrator.ts DEFAULT_MACRO_WEIGHTS) restent synchronisées.
 * Si ce test FAIL → duplication SSOT détectée → corriger immédiatement.
 *
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import { DEFAULT_MACRO_WEIGHTS } from '../../src/calibration/weight-calibrator.js';

describe('R4-a — SSOT Macro-Axes Weights Invariant', () => {

  const AXES = ['ecc', 'rci', 'sii', 'ifi', 'aai'] as const;

  it('INV-SSOT-01: config.ts et weight-calibrator.ts ont les mêmes poids', () => {
    for (const axis of AXES) {
      const configWeight = SOVEREIGN_CONFIG.MACRO_WEIGHTS[axis];
      const calibratorEntry = DEFAULT_MACRO_WEIGHTS.find(w => w.axis === axis);

      expect(calibratorEntry, `axis ${axis} manquant dans DEFAULT_MACRO_WEIGHTS`).toBeDefined();
      expect(calibratorEntry!.weight).toBe(configWeight);
    }
  });

  it('INV-SSOT-02: weight-calibrator n\'a pas d\'axes supplémentaires', () => {
    for (const entry of DEFAULT_MACRO_WEIGHTS) {
      expect(
        AXES.includes(entry.axis as typeof AXES[number]),
        `axis ${entry.axis} dans calibrator mais pas dans config MACRO_WEIGHTS`,
      ).toBe(true);
    }
  });

  it('INV-SSOT-03: les poids somment à 1.0', () => {
    const configSum = AXES.reduce((sum, axis) => sum + SOVEREIGN_CONFIG.MACRO_WEIGHTS[axis], 0);
    expect(configSum).toBeCloseTo(1.0, 10);

    const calibratorSum = DEFAULT_MACRO_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
    expect(calibratorSum).toBeCloseTo(1.0, 10);
  });

  it('INV-SSOT-04: chaque poids est > 0', () => {
    for (const axis of AXES) {
      expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS[axis]).toBeGreaterThan(0);
    }
    for (const entry of DEFAULT_MACRO_WEIGHTS) {
      expect(entry.weight).toBeGreaterThan(0);
    }
  });

  it('INV-SSOT-05: les floors existent pour chaque axe', () => {
    for (const axis of AXES) {
      expect(
        SOVEREIGN_CONFIG.MACRO_FLOORS[axis],
        `floor manquant pour ${axis}`,
      ).toBeGreaterThan(0);
    }
  });

  it('INV-SSOT-06: valeurs attendues figées (snapshot)', () => {
    // Ce test casse si quelqu'un change les poids sans mettre à jour les deux sources.
    // Si les poids changent légitimement, mettre à jour CE test ET les deux fichiers.
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.ecc).toBe(0.33);
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.rci).toBe(0.17);
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.sii).toBe(0.15);
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.ifi).toBe(0.10);
    expect(SOVEREIGN_CONFIG.MACRO_WEIGHTS.aai).toBe(0.25);
  });
});
