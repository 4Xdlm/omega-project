/**
 * OMEGA V4.4 — Phase 1 Schema Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createSchemas, type ValidationBounds, type SchemaCollection } from '../../src/phase1_contract/schema.js';
import { EMOTION_IDS, EMOTIONS_V44 } from '../../src/phase1_contract/index.js';

/**
 * Standard V4.4 bounds for testing
 */
const TEST_BOUNDS: ValidationBounds = {
  X: { min: -10, max: 10 },
  Y: { min: 0, max: 100 },
  Z: { min: 0, max: 1 },
  M: { min: 0, max: 10, exclusiveMin: true },
  kappa: { min: 0.6, max: 1.8 },
  mu: { min: 0, max: 1 },
};

describe('V4.4 Schema Validation', () => {
  let schemas: SchemaCollection;

  beforeAll(() => {
    schemas = createSchemas(TEST_BOUNDS);
  });

  describe('AxisXSchema', () => {
    it('accepts valid X values', () => {
      expect(schemas.AxisXSchema.parse(-10)).toBe(-10);
      expect(schemas.AxisXSchema.parse(0)).toBe(0);
      expect(schemas.AxisXSchema.parse(10)).toBe(10);
      expect(schemas.AxisXSchema.parse(5.5)).toBe(5.5);
    });

    it('rejects out-of-bounds X values', () => {
      expect(() => schemas.AxisXSchema.parse(-11)).toThrow();
      expect(() => schemas.AxisXSchema.parse(11)).toThrow();
      expect(() => schemas.AxisXSchema.parse(-100)).toThrow();
    });
  });

  describe('AxisYSchema', () => {
    it('accepts valid Y values', () => {
      expect(schemas.AxisYSchema.parse(0)).toBe(0);
      expect(schemas.AxisYSchema.parse(50)).toBe(50);
      expect(schemas.AxisYSchema.parse(100)).toBe(100);
    });

    it('rejects out-of-bounds Y values', () => {
      expect(() => schemas.AxisYSchema.parse(-1)).toThrow();
      expect(() => schemas.AxisYSchema.parse(101)).toThrow();
    });
  });

  describe('AxisZSchema', () => {
    it('accepts valid Z values', () => {
      expect(schemas.AxisZSchema.parse(0)).toBe(0);
      expect(schemas.AxisZSchema.parse(0.5)).toBe(0.5);
      expect(schemas.AxisZSchema.parse(1)).toBe(1);
    });

    it('rejects out-of-bounds Z values', () => {
      expect(() => schemas.AxisZSchema.parse(-0.1)).toThrow();
      expect(() => schemas.AxisZSchema.parse(1.1)).toThrow();
    });
  });

  describe('EmotionIdSchema', () => {
    it('accepts all 16 emotion IDs', () => {
      for (const id of EMOTION_IDS) {
        expect(schemas.EmotionIdSchema.parse(id)).toBe(id);
      }
    });

    it('rejects invalid emotion IDs', () => {
      expect(() => schemas.EmotionIdSchema.parse('INVALID')).toThrow();
      expect(() => schemas.EmotionIdSchema.parse('')).toThrow();
      expect(() => schemas.EmotionIdSchema.parse('amour')).toThrow(); // lowercase
    });
  });

  describe('EmotionParamsCanonSchema', () => {
    it('accepts valid canon params', () => {
      const params = EMOTIONS_V44.AMOUR.params;
      expect(() => schemas.EmotionParamsCanonSchema.parse(params)).not.toThrow();
    });

    it('accepts all 16 emotion canon params', () => {
      for (const id of EMOTION_IDS) {
        const params = EMOTIONS_V44[id].params;
        expect(() => schemas.EmotionParamsCanonSchema.parse(params)).not.toThrow();
      }
    });

    it('rejects M = 0 (exclusive min)', () => {
      const params = { ...EMOTIONS_V44.AMOUR.params, M: 0 };
      expect(() => schemas.EmotionParamsCanonSchema.parse(params)).toThrow();
    });

    it('rejects M > 10', () => {
      const params = { ...EMOTIONS_V44.AMOUR.params, M: 11 };
      expect(() => schemas.EmotionParamsCanonSchema.parse(params)).toThrow();
    });

    it('rejects kappa < 0.6', () => {
      const params = { ...EMOTIONS_V44.AMOUR.params, kappa: 0.5 };
      expect(() => schemas.EmotionParamsCanonSchema.parse(params)).toThrow();
    });

    it('rejects kappa > 1.8', () => {
      const params = { ...EMOTIONS_V44.AMOUR.params, kappa: 1.9 };
      expect(() => schemas.EmotionParamsCanonSchema.parse(params)).toThrow();
    });

    it('rejects negative lambda', () => {
      const params = { ...EMOTIONS_V44.AMOUR.params, lambda: -0.1 };
      expect(() => schemas.EmotionParamsCanonSchema.parse(params)).toThrow();
    });

    it('rejects mu > 1', () => {
      const params = { ...EMOTIONS_V44.AMOUR.params, mu: 1.1 };
      expect(() => schemas.EmotionParamsCanonSchema.parse(params)).toThrow();
    });
  });

  describe('EmotionParamsRuntimeSchema', () => {
    it('accepts valid runtime params', () => {
      const params = { C: 100, omega: 0.5, phi: 0 };
      expect(() => schemas.EmotionParamsRuntimeSchema.parse(params)).not.toThrow();
    });

    it('rejects non-positive C', () => {
      const params = { C: 0, omega: 0.5, phi: 0 };
      expect(() => schemas.EmotionParamsRuntimeSchema.parse(params)).toThrow();
    });

    it('rejects negative omega', () => {
      const params = { C: 100, omega: -1, phi: 0 };
      expect(() => schemas.EmotionParamsRuntimeSchema.parse(params)).toThrow();
    });

    it('accepts negative phi (phase can be negative)', () => {
      const params = { C: 100, omega: 0.5, phi: -3.14 };
      expect(() => schemas.EmotionParamsRuntimeSchema.parse(params)).not.toThrow();
    });
  });

  describe('EmotionPositionSchema', () => {
    it('accepts valid position', () => {
      const position = { x: 0, y: 50, z: 0.5 };
      expect(() => schemas.EmotionPositionSchema.parse(position)).not.toThrow();
    });

    it('accepts boundary positions', () => {
      const min = { x: -10, y: 0, z: 0 };
      const max = { x: 10, y: 100, z: 1 };
      expect(() => schemas.EmotionPositionSchema.parse(min)).not.toThrow();
      expect(() => schemas.EmotionPositionSchema.parse(max)).not.toThrow();
    });

    it('rejects invalid position', () => {
      const invalid = { x: 15, y: 50, z: 0.5 };
      expect(() => schemas.EmotionPositionSchema.parse(invalid)).toThrow();
    });

    it('rejects extra properties', () => {
      const extra = { x: 0, y: 50, z: 0.5, extra: 'field' };
      expect(() => schemas.EmotionPositionSchema.parse(extra)).toThrow();
    });
  });

  describe('RuntimeConfigSchema', () => {
    it('accepts valid runtime config', () => {
      const config = { defaultC: 100, defaultOmega: 0, defaultPhi: 0 };
      expect(() => schemas.RuntimeConfigSchema.parse(config)).not.toThrow();
    });

    it('rejects non-positive defaultC', () => {
      const config = { defaultC: 0, defaultOmega: 0, defaultPhi: 0 };
      expect(() => schemas.RuntimeConfigSchema.parse(config)).toThrow();
    });
  });

  describe('InjectedConfigSchema', () => {
    it('accepts valid injected config', () => {
      const config = {
        configHash: 'abc123',
        bounds: {
          X: { min: -10, max: 10 },
          Y: { min: 0, max: 100 },
          Z: { min: 0, max: 1 },
        },
        runtimeDefaults: { defaultC: 100, defaultOmega: 0, defaultPhi: 0 },
        timestamp: 1234567890,
      };
      expect(() => schemas.InjectedConfigSchema.parse(config)).not.toThrow();
    });

    it('rejects empty configHash', () => {
      const config = {
        configHash: '',
        bounds: {
          X: { min: -10, max: 10 },
          Y: { min: 0, max: 100 },
          Z: { min: 0, max: 1 },
        },
        runtimeDefaults: { defaultC: 100, defaultOmega: 0, defaultPhi: 0 },
        timestamp: 1234567890,
      };
      expect(() => schemas.InjectedConfigSchema.parse(config)).toThrow();
    });

    it('rejects negative timestamp', () => {
      const config = {
        configHash: 'abc123',
        bounds: {
          X: { min: -10, max: 10 },
          Y: { min: 0, max: 100 },
          Z: { min: 0, max: 1 },
        },
        runtimeDefaults: { defaultC: 100, defaultOmega: 0, defaultPhi: 0 },
        timestamp: -1,
      };
      expect(() => schemas.InjectedConfigSchema.parse(config)).toThrow();
    });
  });
});
