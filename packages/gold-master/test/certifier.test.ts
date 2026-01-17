/**
 * @fileoverview OMEGA Gold Master - Certifier Tests
 * @module @omega/gold-master/test/certifier
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GoldMasterCertifier,
  createGoldMasterCertifier,
  runGoldMaster,
  createFreezeManifest,
  verifyFreezeManifest,
} from '../src/certifier.js';
import type { GoldMasterResult } from '../src/types.js';

// Mock external dependencies
vi.mock('@omega/orchestrator-core', () => ({
  sha256: (data: string) => `sha256-${data.slice(0, 16)}`,
}));

vi.mock('@omega/gold-internal', () => ({
  runIntegrationTests: vi.fn().mockResolvedValue([
    { name: 'int-1', packages: ['@omega/a', '@omega/b'], valid: true, errors: [] },
    { name: 'int-2', packages: ['@omega/c'], valid: true, errors: [] },
  ]),
  ALL_INTEGRATIONS: ['int-1', 'int-2'],
  OMEGA_PACKAGES: [
    { name: '@omega/a', shortName: 'a' },
    { name: '@omega/b', shortName: 'b' },
  ],
}));

vi.mock('@omega/gold-suite', () => {
  const MockSuiteRunner = class {
    run = vi.fn().mockResolvedValue({
      packages: [
        { name: '@omega/a', tests: 50, passed: 50, failed: 0, duration: 100 },
        { name: '@omega/b', tests: 50, passed: 50, failed: 0, duration: 100 },
      ],
    });
  };
  return {
    SuiteRunner: MockSuiteRunner,
    aggregateResults: vi.fn().mockReturnValue({
      packages: [
        { name: '@omega/a', tests: 50, passed: 50, failed: 0, duration: 100 },
        { name: '@omega/b', tests: 50, passed: 50, failed: 0, duration: 100 },
      ],
      total: { tests: 100, passed: 100, failed: 0, duration: 200 },
    }),
  };
});

vi.mock('@omega/proof-pack', () => ({
  ProofPackBuilder: vi.fn(),
}));

describe('GoldMasterCertifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create certifier with default config', () => {
      const certifier = new GoldMasterCertifier();
      expect(certifier).toBeInstanceOf(GoldMasterCertifier);
    });

    it('should create certifier with custom config', () => {
      const certifier = new GoldMasterCertifier({
        version: '1.0.0',
        phase: 1,
      });
      expect(certifier).toBeInstanceOf(GoldMasterCertifier);
    });
  });

  describe('certify', () => {
    it('should return GoldMasterResult', async () => {
      const certifier = new GoldMasterCertifier();
      const result = await certifier.certify();

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.version).toBe('3.83.0');
      expect(result.phase).toBe(80);
      expect(result.timestamp).toBeDefined();
    });

    it('should include summary in result', async () => {
      const certifier = new GoldMasterCertifier();
      const result = await certifier.certify();

      expect(result.summary).toBeDefined();
      expect(result.summary.totalPackages).toBe(2);
      expect(result.summary.totalTests).toBe(100);
      expect(result.summary.totalPassed).toBe(100);
      expect(result.summary.totalFailed).toBe(0);
    });

    it('should include package certifications', async () => {
      const certifier = new GoldMasterCertifier();
      const result = await certifier.certify();

      expect(result.packages).toHaveLength(2);
      expect(result.packages[0].name).toBe('@omega/a');
      expect(result.packages[0].certified).toBe(true);
    });

    it('should include integration certifications', async () => {
      const certifier = new GoldMasterCertifier();
      const result = await certifier.certify();

      expect(result.integrations).toHaveLength(2);
      expect(result.integrations[0].name).toBe('int-1');
      expect(result.integrations[0].passed).toBe(true);
    });

    it('should generate valid hash', async () => {
      const certifier = new GoldMasterCertifier();
      const result = await certifier.certify();

      expect(result.hash).toBeDefined();
      expect(result.hash.startsWith('sha256-')).toBe(true);
    });

    it('should generate unique ID', async () => {
      const certifier = new GoldMasterCertifier();
      const result1 = await certifier.certify();
      const result2 = await certifier.certify();

      expect(result1.id).not.toBe(result2.id);
      expect(result1.id.startsWith('GOLD-MASTER-')).toBe(true);
    });
  });

  describe('level determination', () => {
    it('should return PLATINUM for 100% pass rate with all integrations', async () => {
      const certifier = new GoldMasterCertifier();
      const result = await certifier.certify();

      // With 100 tests passed out of 100, pass rate is 100%
      expect(result.level).toBe('PLATINUM');
    });

    it('should pass status for PLATINUM level', async () => {
      const certifier = new GoldMasterCertifier();
      const result = await certifier.certify();

      expect(result.status).toBe('PASSED');
    });
  });
});

describe('createGoldMasterCertifier', () => {
  it('should create certifier instance', () => {
    const certifier = createGoldMasterCertifier();
    expect(certifier).toBeInstanceOf(GoldMasterCertifier);
  });

  it('should accept config', () => {
    const certifier = createGoldMasterCertifier({ version: '2.0.0' });
    expect(certifier).toBeInstanceOf(GoldMasterCertifier);
  });
});

describe('runGoldMaster', () => {
  it('should run certification and return result', async () => {
    const result = await runGoldMaster();

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.status).toBeDefined();
  });

  it('should accept config', async () => {
    const result = await runGoldMaster({ version: '2.0.0' });

    expect(result.version).toBe('2.0.0');
  });
});

describe('createFreezeManifest', () => {
  it('should create freeze manifest from result', async () => {
    const certifier = new GoldMasterCertifier();
    const result = await certifier.certify();
    const manifest = createFreezeManifest(result);

    expect(manifest).toBeDefined();
    expect(manifest.version).toBe(result.version);
    expect(manifest.frozenAt).toBeDefined();
    expect(manifest.packages).toHaveLength(result.packages.length);
  });

  it('should include package hashes', async () => {
    const certifier = new GoldMasterCertifier();
    const result = await certifier.certify();
    const manifest = createFreezeManifest(result);

    expect(manifest.packages[0].hash).toBeDefined();
    expect(manifest.packages[0].hash.startsWith('sha256-')).toBe(true);
  });

  it('should generate signature', async () => {
    const certifier = new GoldMasterCertifier();
    const result = await certifier.certify();
    const manifest = createFreezeManifest(result);

    expect(manifest.signature).toBeDefined();
    expect(manifest.signature.startsWith('FREEZE-')).toBe(true);
  });
});

describe('verifyFreezeManifest', () => {
  it('should verify valid manifest', async () => {
    const certifier = new GoldMasterCertifier();
    const result = await certifier.certify();
    const manifest = createFreezeManifest(result);

    expect(verifyFreezeManifest(manifest)).toBe(true);
  });

  it('should reject tampered manifest', async () => {
    const certifier = new GoldMasterCertifier();
    const result = await certifier.certify();
    const manifest = createFreezeManifest(result);

    const tampered = { ...manifest, signature: 'FREEZE-tampered' };
    expect(verifyFreezeManifest(tampered)).toBe(false);
  });

  it('should reject manifest with wrong hash prefix', () => {
    const manifest = {
      version: '1.0.0',
      frozenAt: '2026-01-11T00:00:00.000Z',
      packages: [],
      hash: 'abc123',
      signature: 'WRONG-abc123',
    };

    expect(verifyFreezeManifest(manifest)).toBe(false);
  });
});
