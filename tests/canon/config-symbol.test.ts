/**
 * OMEGA Canon Config Symbol Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-CONFIG-01, INV-E-CONFIG-02
 */

import { describe, it, expect } from 'vitest';
import {
  configSymbol,
  ConfigSymbol,
  ConfigResolver,
  ConfigResolutionError,
  JsonConfigResolver,
  createTestConfigResolver,
  ID_RNG_HEX_LEN,
  SEGMENT_MAX_BYTES,
} from '../../src/canon/config-symbol.js';

describe('CANON Config Symbol — Phase E', () => {
  describe('configSymbol', () => {
    it('creates a typed config symbol', () => {
      const sym = configSymbol('MY_KEY');
      expect(sym).toBe('MY_KEY');
      // TypeScript will enforce the branded type at compile time
    });

    it('exported symbols are correctly typed', () => {
      expect(ID_RNG_HEX_LEN).toBe('ID_RNG_HEX_LEN');
      expect(SEGMENT_MAX_BYTES).toBe('SEGMENT_MAX_BYTES');
    });
  });

  describe('JsonConfigResolver', () => {
    const testConfig = {
      NUMBER_VAL: 42,
      STRING_VAL: 'hello',
      BOOLEAN_VAL: true,
      NULL_VAL: null,
    };

    it('resolves existing number value (INV-E-CONFIG-02)', () => {
      const resolver = new JsonConfigResolver(testConfig);
      const val = resolver.resolveNumber(configSymbol('NUMBER_VAL'));
      expect(val).toBe(42);
    });

    it('resolves existing string value (INV-E-CONFIG-02)', () => {
      const resolver = new JsonConfigResolver(testConfig);
      const val = resolver.resolveString(configSymbol('STRING_VAL'));
      expect(val).toBe('hello');
    });

    it('throws NOT_FOUND for missing key', () => {
      const resolver = new JsonConfigResolver(testConfig);
      expect(() => resolver.resolve(configSymbol('MISSING'))).toThrow(ConfigResolutionError);
      expect(() => resolver.resolve(configSymbol('MISSING'))).toThrow('Config key not found');
    });

    it('throws TYPE_MISMATCH for wrong type (number)', () => {
      const resolver = new JsonConfigResolver(testConfig);
      expect(() => resolver.resolveNumber(configSymbol('STRING_VAL'))).toThrow(ConfigResolutionError);
      expect(() => resolver.resolveNumber(configSymbol('STRING_VAL'))).toThrow('expected number');
    });

    it('throws TYPE_MISMATCH for wrong type (string)', () => {
      const resolver = new JsonConfigResolver(testConfig);
      expect(() => resolver.resolveString(configSymbol('NUMBER_VAL'))).toThrow(ConfigResolutionError);
      expect(() => resolver.resolveString(configSymbol('NUMBER_VAL'))).toThrow('expected string');
    });

    it('has() returns true for existing keys', () => {
      const resolver = new JsonConfigResolver(testConfig);
      expect(resolver.has(configSymbol('NUMBER_VAL'))).toBe(true);
      expect(resolver.has(configSymbol('STRING_VAL'))).toBe(true);
    });

    it('has() returns false for missing keys', () => {
      const resolver = new JsonConfigResolver(testConfig);
      expect(resolver.has(configSymbol('MISSING'))).toBe(false);
    });
  });

  describe('createTestConfigResolver', () => {
    it('creates resolver with inline values', () => {
      const resolver = createTestConfigResolver({
        TEST_NUM: 123,
        TEST_STR: 'test',
      });

      expect(resolver.resolveNumber(configSymbol('TEST_NUM'))).toBe(123);
      expect(resolver.resolveString(configSymbol('TEST_STR'))).toBe('test');
    });
  });

  describe('Determinism (INV-E-CONFIG-02)', () => {
    it('same config produces same values on multiple reads', () => {
      const config = { VAL: 42 };
      const resolver1 = new JsonConfigResolver(config);
      const resolver2 = new JsonConfigResolver(config);

      const v1 = resolver1.resolveNumber(configSymbol('VAL'));
      const v2 = resolver2.resolveNumber(configSymbol('VAL'));

      expect(v1).toBe(v2);
      expect(v1).toBe(42);
    });
  });
});
