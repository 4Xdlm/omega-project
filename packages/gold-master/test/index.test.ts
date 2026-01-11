/**
 * @fileoverview OMEGA Gold Master - Index Tests
 * @module @omega/gold-master/test/index
 */

import { describe, it, expect, vi } from 'vitest';

// Mock external dependencies before import
vi.mock('@omega/orchestrator-core', () => ({
  sha256: (data: string) => `sha256-${data.slice(0, 16)}`,
}));

vi.mock('@omega/gold-internal', () => ({
  runIntegrationTests: vi.fn().mockResolvedValue([]),
  ALL_INTEGRATIONS: [],
  OMEGA_PACKAGES: [],
}));

vi.mock('@omega/gold-suite', () => ({
  SuiteRunner: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue({ packages: [] }),
  })),
  aggregateResults: vi.fn().mockReturnValue({
    packages: [],
    total: { tests: 0, passed: 0, failed: 0, duration: 0 },
  }),
}));

vi.mock('@omega/proof-pack', () => ({
  ProofPackBuilder: vi.fn(),
}));

describe('Gold Master Exports', () => {
  it('should export DEFAULT_GOLD_MASTER_CONFIG', async () => {
    const module = await import('../src/index.js');
    expect(module.DEFAULT_GOLD_MASTER_CONFIG).toBeDefined();
    expect(module.DEFAULT_GOLD_MASTER_CONFIG.version).toBe('3.83.0');
  });

  it('should export GoldMasterCertifier', async () => {
    const module = await import('../src/index.js');
    expect(module.GoldMasterCertifier).toBeDefined();
    expect(typeof module.GoldMasterCertifier).toBe('function');
  });

  it('should export createGoldMasterCertifier', async () => {
    const module = await import('../src/index.js');
    expect(module.createGoldMasterCertifier).toBeDefined();
    expect(typeof module.createGoldMasterCertifier).toBe('function');
  });

  it('should export runGoldMaster', async () => {
    const module = await import('../src/index.js');
    expect(module.runGoldMaster).toBeDefined();
    expect(typeof module.runGoldMaster).toBe('function');
  });

  it('should export createFreezeManifest', async () => {
    const module = await import('../src/index.js');
    expect(module.createFreezeManifest).toBeDefined();
    expect(typeof module.createFreezeManifest).toBe('function');
  });

  it('should export verifyFreezeManifest', async () => {
    const module = await import('../src/index.js');
    expect(module.verifyFreezeManifest).toBeDefined();
    expect(typeof module.verifyFreezeManifest).toBe('function');
  });
});
