/**
 * @fileoverview OMEGA Gold Master - Types Tests
 * @module @omega/gold-master/test/types
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_GOLD_MASTER_CONFIG } from '../src/types.js';
import type {
  GoldMasterStatus,
  GoldMasterLevel,
  GoldMasterConfig,
  GoldMasterResult,
  GoldMasterSummary,
  PackageCertification,
  IntegrationCertification,
  FreezeManifest,
  FrozenPackage,
} from '../src/types.js';

describe('GoldMaster Types', () => {
  describe('DEFAULT_GOLD_MASTER_CONFIG', () => {
    it('should have correct version', () => {
      expect(DEFAULT_GOLD_MASTER_CONFIG.version).toBe('3.83.0');
    });

    it('should have correct phase', () => {
      expect(DEFAULT_GOLD_MASTER_CONFIG.phase).toBe(80);
    });

    it('should have correct standard', () => {
      expect(DEFAULT_GOLD_MASTER_CONFIG.standard).toBe('NASA-Grade L4 / DO-178C Level A');
    });

    it('should target GOLD level', () => {
      expect(DEFAULT_GOLD_MASTER_CONFIG.targetLevel).toBe('GOLD');
    });

    it('should have strict mode enabled', () => {
      expect(DEFAULT_GOLD_MASTER_CONFIG.strictMode).toBe(true);
    });

    it('should have proof pack generation enabled', () => {
      expect(DEFAULT_GOLD_MASTER_CONFIG.generateProofPack).toBe(true);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(DEFAULT_GOLD_MASTER_CONFIG)).toBe(true);
    });
  });

  describe('GoldMasterStatus', () => {
    it('should support all valid statuses', () => {
      const statuses: GoldMasterStatus[] = [
        'PENDING',
        'VALIDATING',
        'PASSED',
        'FAILED',
        'FROZEN',
        'RELEASED',
      ];
      expect(statuses).toHaveLength(6);
    });
  });

  describe('GoldMasterLevel', () => {
    it('should support all valid levels', () => {
      const levels: GoldMasterLevel[] = [
        'BRONZE',
        'SILVER',
        'GOLD',
        'PLATINUM',
        'DIAMOND',
      ];
      expect(levels).toHaveLength(5);
    });
  });

  describe('Type Structures', () => {
    it('should create valid GoldMasterConfig', () => {
      const config: GoldMasterConfig = {
        version: '1.0.0',
        phase: 1,
        standard: 'NASA-Grade L4',
        targetLevel: 'GOLD',
        strictMode: true,
        generateProofPack: false,
      };
      expect(config.version).toBe('1.0.0');
      expect(config.phase).toBe(1);
      expect(config.strictMode).toBe(true);
    });

    it('should create valid GoldMasterSummary', () => {
      const summary: GoldMasterSummary = {
        totalPackages: 10,
        totalTests: 500,
        totalPassed: 500,
        totalFailed: 0,
        totalIntegrations: 5,
        integrationsPassed: 5,
        passRate: 1.0,
        duration: 5000,
      };
      expect(summary.passRate).toBe(1.0);
      expect(summary.totalFailed).toBe(0);
    });

    it('should create valid PackageCertification', () => {
      const pkg: PackageCertification = {
        name: '@omega/test',
        version: '1.0.0',
        tests: 100,
        passed: 100,
        failed: 0,
        duration: 1000,
        certified: true,
      };
      expect(pkg.certified).toBe(true);
      expect(pkg.passed).toBe(pkg.tests);
    });

    it('should create valid IntegrationCertification', () => {
      const integration: IntegrationCertification = {
        name: 'test-integration',
        packages: ['@omega/a', '@omega/b'],
        passed: true,
        errors: [],
      };
      expect(integration.passed).toBe(true);
      expect(integration.packages).toHaveLength(2);
    });

    it('should create valid FrozenPackage', () => {
      const frozen: FrozenPackage = {
        name: '@omega/test',
        version: '1.0.0',
        hash: 'abc123',
        frozen: true,
      };
      expect(frozen.frozen).toBe(true);
      expect(frozen.hash).toBe('abc123');
    });

    it('should create valid FreezeManifest', () => {
      const manifest: FreezeManifest = {
        version: '1.0.0',
        frozenAt: '2026-01-11T00:00:00.000Z',
        packages: [
          { name: '@omega/test', version: '1.0.0', hash: 'abc123', frozen: true },
        ],
        hash: 'manifest-hash',
        signature: 'FREEZE-manifest-hash',
      };
      expect(manifest.packages).toHaveLength(1);
      expect(manifest.signature.startsWith('FREEZE-')).toBe(true);
    });
  });
});
