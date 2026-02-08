/**
 * OMEGA Forge — Config Tests
 * Phase C.5 — 6 tests for createDefaultF5Config, resolveF5ConfigValue, validateF5Config, hashF5Config
 */

import { describe, it, expect } from 'vitest';
import { createDefaultF5Config, resolveF5ConfigValue, validateF5Config, hashF5Config } from '../src/config.js';

describe('config', () => {
  it('default config has 14 symbols', () => {
    const config = createDefaultF5Config();
    const keys = Object.keys(config);
    expect(keys).toHaveLength(14);
  });

  it('resolves numeric config value', () => {
    const config = createDefaultF5Config();
    const val = resolveF5ConfigValue(config.WEIGHT_EMOTION);
    expect(val).toBe(0.6);
    const val2 = resolveF5ConfigValue(config.WEIGHT_QUALITY);
    expect(val2).toBe(0.4);
    const threshold = resolveF5ConfigValue(config.COMPOSITE_PASS_THRESHOLD);
    expect(threshold).toBe(0.7);
  });

  it('validates a correct config', () => {
    const config = createDefaultF5Config();
    expect(validateF5Config(config)).toBe(true);
  });

  it('fails validation for missing key fields', () => {
    const config = createDefaultF5Config();
    const broken = {
      ...config,
      TAU_COSINE_DEVIATION: { value: 0.3, unit: '', rule: 'test', derivation: 'test' },
    };
    // unit is empty string which is falsy
    expect(validateF5Config(broken as any)).toBe(false);
  });

  it('produces stable hash', () => {
    const config = createDefaultF5Config();
    const hash1 = hashF5Config(config);
    const hash2 = hashF5Config(config);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('contains all 14 expected symbols', () => {
    const config = createDefaultF5Config();
    const expectedKeys = [
      'TAU_COSINE_DEVIATION', 'TAU_EUCLIDEAN_DEVIATION', 'TAU_VAD_DEVIATION',
      'TAU_DECAY_TOLERANCE', 'TAU_FLUX_BALANCE', 'TAU_NECESSITY',
      'TAU_DISCOMFORT_MIN', 'TAU_DISCOMFORT_MAX',
      'DEAD_ZONE_MIN_LENGTH', 'DEAD_ZONE_Z_THRESHOLD',
      'WEIGHT_EMOTION', 'WEIGHT_QUALITY',
      'SATURATION_CAPACITY_C', 'COMPOSITE_PASS_THRESHOLD',
    ];
    for (const key of expectedKeys) {
      expect(config).toHaveProperty(key);
      const sym = (config as any)[key];
      expect(sym).toHaveProperty('value');
      expect(sym).toHaveProperty('unit');
      expect(sym).toHaveProperty('rule');
      expect(sym).toHaveProperty('derivation');
    }
  });
});
