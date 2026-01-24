/**
 * OMEGA V4.4 — Phase 1 Contract Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import {
  EMOTION_IDS,
  EMOTIONS_V44,
  INVARIANTS,
  INVARIANT_IDS,
  SYMBOLS,
  SYMBOL_DOCS,
  verifyEmotionsComplete,
  verifyCategoryDistribution,
  verifyInvariantsComplete,
  verifySymbolsComplete,
  getEmotionDefinition,
  getEmotionsByCategory,
  getCanonParams,
  getInvariant,
  getInvariantCount,
} from '../../src/phase1_contract/index.js';

describe('V4.4 Contract — Types & Constants', () => {
  describe('Emotion Count', () => {
    it('should have exactly 16 emotion IDs', () => {
      expect(EMOTION_IDS.length).toBe(16);
    });

    it('should have exactly 16 emotion definitions', () => {
      expect(Object.keys(EMOTIONS_V44).length).toBe(16);
    });

    it('verifyEmotionsComplete() should return true', () => {
      expect(verifyEmotionsComplete()).toBe(true);
    });
  });

  describe('Emotion Categories', () => {
    it('should have 4 MAJEURE emotions', () => {
      const majeures = getEmotionsByCategory('MAJEURE');
      expect(majeures).toHaveLength(4);
    });

    it('should have 4 INTERMEDIAIRE emotions', () => {
      const intermediaires = getEmotionsByCategory('INTERMEDIAIRE');
      expect(intermediaires).toHaveLength(4);
    });

    it('should have 4 MINEURE emotions', () => {
      const mineures = getEmotionsByCategory('MINEURE');
      expect(mineures).toHaveLength(4);
    });

    it('should have 4 BENIGNE emotions', () => {
      const benignes = getEmotionsByCategory('BENIGNE');
      expect(benignes).toHaveLength(4);
    });

    it('verifyCategoryDistribution() should return true', () => {
      expect(verifyCategoryDistribution()).toBe(true);
    });
  });

  describe('Canon Parameters Only', () => {
    it('should NOT have C, omega, phi in canon params', () => {
      for (const id of EMOTION_IDS) {
        const params = getCanonParams(id);
        expect(params).not.toHaveProperty('C');
        expect(params).not.toHaveProperty('omega');
        expect(params).not.toHaveProperty('phi');
      }
    });

    it('should have M, lambda, kappa, E0, zeta, mu in canon params', () => {
      for (const id of EMOTION_IDS) {
        const params = getCanonParams(id);
        expect(params).toHaveProperty('M');
        expect(params).toHaveProperty('lambda');
        expect(params).toHaveProperty('kappa');
        expect(params).toHaveProperty('E0');
        expect(params).toHaveProperty('zeta');
        expect(params).toHaveProperty('mu');
      }
    });
  });

  describe('Vision Scellée Compliance', () => {
    it('DEUIL should have highest mass (8.5)', () => {
      expect(EMOTIONS_V44.DEUIL.params.M).toBe(8.5);
    });

    it('DEUIL should have lowest lambda (0.03)', () => {
      expect(EMOTIONS_V44.DEUIL.params.lambda).toBe(0.03);
    });

    it('SURPRISE should have highest lambda (0.80)', () => {
      expect(EMOTIONS_V44.SURPRISE.params.lambda).toBe(0.80);
    });

    it('ENNUI should have lowest mass (1.0)', () => {
      expect(EMOTIONS_V44.ENNUI.params.M).toBe(1.0);
    });

    it('all M values should be > 0 and <= 10', () => {
      for (const id of EMOTION_IDS) {
        const M = getCanonParams(id).M;
        expect(M).toBeGreaterThan(0);
        expect(M).toBeLessThanOrEqual(10);
      }
    });

    it('all kappa values should be in [0.6, 1.8]', () => {
      for (const id of EMOTION_IDS) {
        const kappa = getCanonParams(id).kappa;
        expect(kappa).toBeGreaterThanOrEqual(0.6);
        expect(kappa).toBeLessThanOrEqual(1.8);
      }
    });

    it('all mu values should be in [0, 1]', () => {
      for (const id of EMOTION_IDS) {
        const mu = getCanonParams(id).mu;
        expect(mu).toBeGreaterThanOrEqual(0);
        expect(mu).toBeLessThanOrEqual(1);
      }
    });

    it('all lambda values should be positive', () => {
      for (const id of EMOTION_IDS) {
        const lambda = getCanonParams(id).lambda;
        expect(lambda).toBeGreaterThan(0);
      }
    });

    it('all zeta values should be non-negative', () => {
      for (const id of EMOTION_IDS) {
        const zeta = getCanonParams(id).zeta;
        expect(zeta).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Helper Functions', () => {
    it('getEmotionDefinition() returns correct definition', () => {
      const amour = getEmotionDefinition('AMOUR');
      expect(amour.id).toBe('AMOUR');
      expect(amour.category).toBe('MAJEURE');
      expect(amour.params.M).toBe(6.0);
    });

    it('getCanonParams() returns params object', () => {
      const params = getCanonParams('JOIE');
      expect(params.M).toBe(3.0);
      expect(params.lambda).toBe(0.35);
    });
  });
});

describe('V4.4 Contract — Invariants (L1-L6)', () => {
  it('should have exactly 6 invariants', () => {
    expect(INVARIANT_IDS.length).toBe(6);
    expect(Object.keys(INVARIANTS).length).toBe(6);
    expect(getInvariantCount()).toBe(6);
  });

  it('verifyInvariantsComplete() should return true', () => {
    expect(verifyInvariantsComplete()).toBe(true);
  });

  it('L1_CYCLIC_PHASE should be defined', () => {
    const L1 = getInvariant('L1_CYCLIC_PHASE');
    expect(L1.name).toBe('Cyclic Phase Law');
    expect(L1.formula).toContain('phi');
  });

  it('L2_BOUNDED_INTENSITY should be defined', () => {
    const L2 = getInvariant('L2_BOUNDED_INTENSITY');
    expect(L2.name).toBe('Bounded Intensity Law');
    expect(L2.formula).toContain('mu');
  });

  it('L3_BOUNDED_PERSISTENCE should be defined', () => {
    const L3 = getInvariant('L3_BOUNDED_PERSISTENCE');
    expect(L3.name).toBe('Bounded Persistence Law');
    expect(L3.formula).toContain('Z');
  });

  it('L4_DECAY_LAW should be defined', () => {
    const L4 = getInvariant('L4_DECAY_LAW');
    expect(L4.name).toBe('Exponential Decay Law');
    expect(L4.formula).toContain('exp');
  });

  it('L5_HYSTERIC_DAMPING should be defined', () => {
    const L5 = getInvariant('L5_HYSTERIC_DAMPING');
    expect(L5.name).toBe('Hysteretic Damping Law');
    expect(L5.formula).toContain('lambda_eff');
  });

  it('L6_CONSERVATION should be defined', () => {
    const L6 = getInvariant('L6_CONSERVATION');
    expect(L6.name).toBe('Total Intensity Conservation');
    expect(L6.formula).toContain('sum');
  });

  it('all invariants should have formula and constraint', () => {
    for (const id of INVARIANT_IDS) {
      const inv = getInvariant(id);
      expect(inv.formula.length).toBeGreaterThan(0);
      expect(inv.constraint.length).toBeGreaterThan(0);
    }
  });
});

describe('V4.4 Contract — Symbols', () => {
  it('should have all required symbols', () => {
    expect(SYMBOLS.PHASE_CYCLE).toBeDefined();
    expect(SYMBOLS.MU_MIN).toBeDefined();
    expect(SYMBOLS.MU_MAX).toBeDefined();
    expect(SYMBOLS.X_MIN).toBeDefined();
    expect(SYMBOLS.X_MAX).toBeDefined();
    expect(SYMBOLS.Y_MIN).toBeDefined();
    expect(SYMBOLS.Y_MAX).toBeDefined();
    expect(SYMBOLS.Z_MIN).toBeDefined();
    expect(SYMBOLS.Z_MAX).toBeDefined();
  });

  it('verifySymbolsComplete() should return true', () => {
    expect(verifySymbolsComplete()).toBe(true);
  });

  it('all symbols should be unique', () => {
    const symbolValues = Object.values(SYMBOLS);
    const uniqueSymbols = new Set(symbolValues);
    expect(uniqueSymbols.size).toBe(symbolValues.length);
  });

  it('all symbols should have documentation', () => {
    const symbolKeys = Object.keys(SYMBOLS) as Array<keyof typeof SYMBOLS>;
    for (const key of symbolKeys) {
      expect(SYMBOL_DOCS[key]).toBeDefined();
      expect(SYMBOL_DOCS[key].length).toBeGreaterThan(0);
    }
  });
});
