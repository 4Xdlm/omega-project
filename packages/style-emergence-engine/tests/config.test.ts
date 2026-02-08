import { describe, it, expect } from 'vitest';
import { createDefaultEConfig, resolveEConfigRef, validateEConfig } from '../src/config.js';

describe('Config', () => {
  it('default config is complete', () => {
    const config = createDefaultEConfig();
    const errors = validateEConfig(config);
    expect(errors.length).toBe(0);
  });

  it('resolves config ref', () => {
    const config = createDefaultEConfig();
    const value = resolveEConfigRef(config, 'STYLE_MAX_DEVIATION');
    expect(value).toBe(0.25);
  });

  it('resolves with CONFIG: prefix', () => {
    const config = createDefaultEConfig();
    const value = resolveEConfigRef(config, 'CONFIG:CADENCE_TOLERANCE');
    expect(value).toBe(0.15);
  });

  it('throws on invalid ref', () => {
    const config = createDefaultEConfig();
    expect(() => resolveEConfigRef(config, 'INVALID_KEY')).toThrow();
  });

  it('validates missing key', () => {
    const config = createDefaultEConfig();
    const partial = { ...config } as Record<string, unknown>;
    delete partial['VOICE_MAX_DRIFT'];
    const errors = validateEConfig(partial as ReturnType<typeof createDefaultEConfig>);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('GENRE_MARKERS is object type', () => {
    const config = createDefaultEConfig();
    const markers = config.GENRE_MARKERS.value;
    expect(typeof markers).toBe('object');
    expect(markers).not.toBeNull();
    expect(Array.isArray(markers)).toBe(false);
  });
});
