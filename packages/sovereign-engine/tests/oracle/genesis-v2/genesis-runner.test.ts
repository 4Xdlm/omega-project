// tests/oracle/genesis-v2/genesis-runner.test.ts
// isGenesisV2Active — shape-aware exemption — 4 tests
// W3b-fix — Phase T

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test isGenesisV2Active with GENESIS_V2=1
// The module reads process.env at import time, so we set env BEFORE importing.

describe('isGenesisV2Active — shape-aware exemption', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Force GENESIS_V2=1 so the function doesn't short-circuit on the flag
    process.env.GENESIS_V2 = '1';
    // Use default exempt shapes (absolute_necessity, E3_absolute_necessity)
    delete process.env.GENESIS_V2_EXEMPT_SHAPES;
    // Clear module cache to re-evaluate env
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('isGenesisV2Active("E3_absolute_necessity") === false', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('E3_absolute_necessity')).toBe(false);
  });

  it('isGenesisV2Active("absolute_necessity") === false', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('absolute_necessity')).toBe(false);
  });

  it('isGenesisV2Active("E1_continuity_impossible") === true', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('E1_continuity_impossible')).toBe(true);
  });

  it('isGenesisV2Active("E2_non_classifiable") === true', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('E2_non_classifiable')).toBe(true);
  });
});
