import { describe, it, expect } from 'vitest';
import { createDefaultC4Config, resolveC4ConfigRef, validateC4Config } from '../src/config.js';

describe('C4Config', () => {
  const config = createDefaultC4Config();

  it('has all 12 keys', () => {
    expect(Object.keys(config)).toHaveLength(12);
  });

  it('resolves valid ref', () => {
    const sym = resolveC4ConfigRef(config, 'PIPELINE_STRICT_MODE');
    expect(sym.value).toBe(true);
  });

  it('throws on invalid ref', () => {
    expect(() => resolveC4ConfigRef(config, 'INVALID' as any)).toThrow();
  });

  it('validates complete config', () => {
    expect(validateC4Config(config)).toBe(true);
  });

  it('gate order is string array', () => {
    expect(Array.isArray(config.UNIFIED_GATE_ORDER.value)).toBe(true);
    expect((config.UNIFIED_GATE_ORDER.value as string[]).length).toBe(8);
  });

  it('all symbols have required fields', () => {
    for (const [, sym] of Object.entries(config)) {
      expect(sym.unit).toBeTruthy();
      expect(sym.rule).toBeTruthy();
      expect(sym.derivation).toBeTruthy();
    }
  });
});
