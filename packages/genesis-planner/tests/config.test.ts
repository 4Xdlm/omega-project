import { describe, it, expect } from 'vitest';
import { createDefaultConfig, resolveConfigRef, validateConfig } from '../src/config.js';

describe('Config', () => {
  it('should create complete default config', () => {
    const config = createDefaultConfig();
    expect(config.MAX_TENSION_PLATEAU).toBeDefined();
    expect(config.MAX_TENSION_DROP).toBeDefined();
    expect(config.MIN_BEATS_PER_SCENE).toBeDefined();
    expect(config.MAX_BEATS_PER_SCENE).toBeDefined();
    expect(config.MIN_SEEDS).toBeDefined();
    expect(config.SEED_BLOOM_MAX_DISTANCE).toBeDefined();
    expect(config.MIN_CONFLICT_TYPES).toBeDefined();
    expect(config.EMOTION_COVERAGE_THRESHOLD).toBeDefined();
  });

  it('should resolve config reference with prefix', () => {
    const config = createDefaultConfig();
    expect(resolveConfigRef(config, 'CONFIG:MAX_TENSION_PLATEAU')).toBe(3);
  });

  it('should resolve config reference without prefix', () => {
    const config = createDefaultConfig();
    expect(resolveConfigRef(config, 'MIN_SEEDS')).toBe(3);
  });

  it('should throw on unknown key', () => {
    const config = createDefaultConfig();
    expect(() => resolveConfigRef(config, 'CONFIG:NONEXISTENT')).toThrow('Unknown config key');
  });

  it('should validate with 0 errors for default config', () => {
    const config = createDefaultConfig();
    const errors = validateConfig(config);
    expect(errors.length).toBe(0);
  });

  it('should report errors for missing config keys', () => {
    const config = { ...createDefaultConfig() };
    // @ts-expect-error testing invalid config
    delete config.MIN_SEEDS;
    // Since we spread, the key is undefined
    const broken = { ...config, MIN_SEEDS: undefined } as unknown as ReturnType<typeof createDefaultConfig>;
    const errors = validateConfig(broken);
    expect(errors.length).toBeGreaterThan(0);
  });
});
