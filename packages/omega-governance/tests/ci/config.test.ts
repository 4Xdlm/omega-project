/**
 * OMEGA Governance — CI Config Tests
 * Phase F — INV-F-05: Thresholds come from config
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_CI_CONFIG, createCIConfig } from '../../src/ci/config.js';

describe('CI Config', () => {
  it('DEFAULT_CI_CONFIG has all required fields', () => {
    expect(DEFAULT_CI_CONFIG.DEFAULT_SEED).toBe('omega-ci');
    expect(DEFAULT_CI_CONFIG.REPLAY_TIMEOUT_MS).toBe(120000);
    expect(DEFAULT_CI_CONFIG.FAIL_FAST).toBe(true);
    expect(DEFAULT_CI_CONFIG.ACCEPTABLE_DRIFT_LEVELS).toContain('NO_DRIFT');
    expect(DEFAULT_CI_CONFIG.ACCEPTABLE_DRIFT_LEVELS).toContain('SOFT_DRIFT');
    expect(DEFAULT_CI_CONFIG.MAX_VARIANCE_PERCENT).toBe(5);
    expect(DEFAULT_CI_CONFIG.MAX_DURATION_MS).toBe(60000);
    expect(DEFAULT_CI_CONFIG.ACCEPTABLE_CERT_VERDICTS).toContain('PASS');
    expect(DEFAULT_CI_CONFIG.ACCEPTABLE_CERT_VERDICTS).toContain('PASS_WITH_WARNINGS');
  });

  it('createCIConfig returns defaults when no overrides', () => {
    const config = createCIConfig();
    expect(config).toEqual(DEFAULT_CI_CONFIG);
  });

  it('createCIConfig applies overrides', () => {
    const config = createCIConfig({ FAIL_FAST: false, MAX_VARIANCE_PERCENT: 10 });
    expect(config.FAIL_FAST).toBe(false);
    expect(config.MAX_VARIANCE_PERCENT).toBe(10);
    expect(config.DEFAULT_SEED).toBe('omega-ci'); // unchanged
  });

  it('INV-F-05: thresholds are from config, not hardcoded', () => {
    const custom = createCIConfig({
      ACCEPTABLE_DRIFT_LEVELS: ['NO_DRIFT'],
      MAX_VARIANCE_PERCENT: 1,
      ACCEPTABLE_CERT_VERDICTS: ['PASS'],
    });
    expect(custom.ACCEPTABLE_DRIFT_LEVELS).toEqual(['NO_DRIFT']);
    expect(custom.MAX_VARIANCE_PERCENT).toBe(1);
    expect(custom.ACCEPTABLE_CERT_VERDICTS).toEqual(['PASS']);
  });

  it('overrides seed', () => {
    const config = createCIConfig({ DEFAULT_SEED: 'custom-seed' });
    expect(config.DEFAULT_SEED).toBe('custom-seed');
  });
});
