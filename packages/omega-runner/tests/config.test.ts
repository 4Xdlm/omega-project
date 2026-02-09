/**
 * OMEGA Runner — Config Tests
 * Phase D.1 — 6 tests for runner configuration
 */

import { describe, it, expect } from 'vitest';
import { createDefaultRunnerConfigs } from '../src/config.js';

describe('config', () => {
  it('creates all 6 configs', () => {
    const configs = createDefaultRunnerConfigs();
    expect(configs.gConfig).toBeDefined();
    expect(configs.sConfig).toBeDefined();
    expect(configs.eConfig).toBeDefined();
    expect(configs.c4Config).toBeDefined();
    expect(configs.f5Config).toBeDefined();
    expect(configs.canonicalTable).toBeDefined();
  });

  it('configs are deterministic', () => {
    const c1 = createDefaultRunnerConfigs();
    const c2 = createDefaultRunnerConfigs();
    expect(JSON.stringify(c1.gConfig)).toBe(JSON.stringify(c2.gConfig));
    expect(JSON.stringify(c1.sConfig)).toBe(JSON.stringify(c2.sConfig));
  });

  it('canonicalTable has 14 emotions', () => {
    const configs = createDefaultRunnerConfigs();
    expect(Object.keys(configs.canonicalTable)).toHaveLength(14);
  });

  it('f5Config has expected symbols', () => {
    const configs = createDefaultRunnerConfigs();
    const keys = Object.keys(configs.f5Config);
    expect(keys.length).toBeGreaterThanOrEqual(10);
  });

  it('c4Config has PIPELINE_STRICT_MODE', () => {
    const configs = createDefaultRunnerConfigs();
    expect((configs.c4Config as Record<string, unknown>)['PIPELINE_STRICT_MODE']).toBeDefined();
  });

  it('all configs are non-null objects', () => {
    const configs = createDefaultRunnerConfigs();
    for (const value of Object.values(configs)) {
      expect(value).not.toBeNull();
      expect(typeof value).toBe('object');
    }
  });
});
