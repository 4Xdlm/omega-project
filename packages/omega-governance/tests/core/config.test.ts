import { describe, it, expect } from 'vitest';
import { DEFAULT_GOV_CONFIG, createConfig, validateConfig } from '../../src/core/config.js';

describe('GovConfig', () => {
  it('DEFAULT_GOV_CONFIG has all required fields', () => {
    expect(DEFAULT_GOV_CONFIG.DRIFT_SOFT_THRESHOLD).toBe(0.05);
    expect(DEFAULT_GOV_CONFIG.DRIFT_HARD_THRESHOLD).toBe(0.15);
    expect(DEFAULT_GOV_CONFIG.DRIFT_CRITICAL_THRESHOLD).toBe(0.30);
    expect(DEFAULT_GOV_CONFIG.CERT_MIN_SCORE).toBe(0.70);
    expect(DEFAULT_GOV_CONFIG.CERT_WARN_SCORE).toBe(0.50);
    expect(DEFAULT_GOV_CONFIG.BENCH_MAX_VARIANCE).toBe(0.02);
    expect(DEFAULT_GOV_CONFIG.BENCH_MAX_DURATION_MS).toBe(60000);
    expect(DEFAULT_GOV_CONFIG.HISTORY_MAX_RESULTS).toBe(1000);
  });

  it('validates default config as valid', () => {
    const result = validateConfig(DEFAULT_GOV_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid drift threshold order', () => {
    const result = validateConfig({ ...DEFAULT_GOV_CONFIG, DRIFT_HARD_THRESHOLD: 0.01 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('DRIFT_HARD_THRESHOLD'))).toBe(true);
  });

  it('rejects CERT_MIN_SCORE <= CERT_WARN_SCORE', () => {
    const result = validateConfig({ ...DEFAULT_GOV_CONFIG, CERT_MIN_SCORE: 0.40 });
    expect(result.valid).toBe(false);
  });

  it('createConfig returns default when no overrides', () => {
    const config = createConfig();
    expect(config).toEqual(DEFAULT_GOV_CONFIG);
  });

  it('createConfig accepts valid overrides', () => {
    const config = createConfig({ DRIFT_SOFT_THRESHOLD: 0.10 });
    expect(config.DRIFT_SOFT_THRESHOLD).toBe(0.10);
    expect(config.DRIFT_HARD_THRESHOLD).toBe(0.15);
  });
});
