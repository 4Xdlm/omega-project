import { describe, it, expect } from 'vitest';
import { createDefaultSConfig, resolveSConfigRef, validateSConfig } from '../src/config.js';

describe('SConfig', () => {
  it('creates default config with all 12 keys', () => {
    const config = createDefaultSConfig();
    const keys = Object.keys(config);
    expect(keys).toHaveLength(12);
    expect(keys).toContain('REWRITE_MAX_PASSES');
    expect(keys).toContain('IA_SPEAK_PATTERNS');
    expect(keys).toContain('CLICHE_REGISTRY');
    expect(keys).toContain('MOTIF_RECURRENCE_MIN');
  });

  it('resolves CONFIG: prefix ref', () => {
    const config = createDefaultSConfig();
    const val = resolveSConfigRef(config, 'CONFIG:REWRITE_MAX_PASSES');
    expect(val).toBe(3);
  });

  it('resolves ref without prefix', () => {
    const config = createDefaultSConfig();
    const val = resolveSConfigRef(config, 'BANALITY_MAX_COUNT');
    expect(val).toBe(0);
  });

  it('throws on invalid ref', () => {
    const config = createDefaultSConfig();
    expect(() => resolveSConfigRef(config, 'NONEXISTENT')).toThrow('Unknown config key');
  });

  it('validates complete config with no errors', () => {
    const config = createDefaultSConfig();
    const errors = validateSConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('IA_SPEAK_PATTERNS is array type', () => {
    const config = createDefaultSConfig();
    expect(Array.isArray(config.IA_SPEAK_PATTERNS.value)).toBe(true);
    expect((config.IA_SPEAK_PATTERNS.value as readonly string[]).length).toBe(20);
  });
});
