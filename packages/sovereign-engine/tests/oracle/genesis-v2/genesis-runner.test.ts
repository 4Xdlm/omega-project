// tests/oracle/genesis-v2/genesis-runner.test.ts
// isGenesisV2Active — shape-aware exemption (exact match, Set-based) — 6 tests
// W3c — Phase T

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The module reads process.env at import time, so we set env BEFORE importing.

describe('isGenesisV2Active — shape-aware exemption (exact match)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Force GENESIS_V2=1 so the function doesn't short-circuit on the flag
    process.env.GENESIS_V2 = '1';
    // Use default exempt shapes (E1_continuity_impossible, absolute_necessity, E3_absolute_necessity)
    delete process.env.GENESIS_V2_EXEMPT_SHAPES;
    // Clear module cache to re-evaluate env
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('isGenesisV2Active("E1_continuity_impossible") === false (exempt by default)', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('E1_continuity_impossible')).toBe(false);
  });

  it('isGenesisV2Active("E3_absolute_necessity") === false', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('E3_absolute_necessity')).toBe(false);
  });

  it('isGenesisV2Active("absolute_necessity") === false', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('absolute_necessity')).toBe(false);
  });

  it('isGenesisV2Active("E2_non_classifiable") === true (GENESIS actif)', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('E2_non_classifiable')).toBe(true);
  });

  it('isGenesisV2Active("E1_continuity_impossible_v2") === true (exact match, no substring)', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('E1_continuity_impossible_v2')).toBe(true);
  });

  it('isGenesisV2Active("") === true (empty → active by default)', async () => {
    const { isGenesisV2Active } = await import('../../../src/oracle/genesis-v2/genesis-runner.js');
    expect(isGenesisV2Active('')).toBe(true);
  });
});
