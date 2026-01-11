/**
 * @fileoverview Unit tests for contract types.
 */

import { describe, it, expect } from 'vitest';
import {
  isContractVersion,
  isContractMetadata,
  isInvariantContract,
  isModuleContract,
} from '../../src/index.js';

describe('types', () => {
  describe('isContractVersion', () => {
    it('should return true for valid version', () => {
      expect(isContractVersion({ major: 1, minor: 0, patch: 0 })).toBe(true);
    });

    it('should return true for version with large numbers', () => {
      expect(isContractVersion({ major: 10, minor: 20, patch: 30 })).toBe(true);
    });

    it('should return false for missing major', () => {
      expect(isContractVersion({ minor: 0, patch: 0 })).toBe(false);
    });

    it('should return false for missing minor', () => {
      expect(isContractVersion({ major: 1, patch: 0 })).toBe(false);
    });

    it('should return false for missing patch', () => {
      expect(isContractVersion({ major: 1, minor: 0 })).toBe(false);
    });

    it('should return false for string version numbers', () => {
      expect(isContractVersion({ major: '1', minor: '0', patch: '0' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isContractVersion(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isContractVersion(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isContractVersion({})).toBe(false);
    });
  });

  describe('isContractMetadata', () => {
    const validMetadata = {
      id: 'TEST-001',
      name: 'Test Contract',
      version: { major: 1, minor: 0, patch: 0 },
      stability: 'STABLE',
      since: '2026-01-01',
      description: 'Test description',
    };

    it('should return true for valid metadata', () => {
      expect(isContractMetadata(validMetadata)).toBe(true);
    });

    it('should return true for metadata with optional deprecated', () => {
      expect(isContractMetadata({ ...validMetadata, deprecated: '2027-01-01' })).toBe(true);
    });

    it('should return false for missing id', () => {
      const { id: _, ...rest } = validMetadata;
      expect(isContractMetadata(rest)).toBe(false);
    });

    it('should return false for missing name', () => {
      const { name: _, ...rest } = validMetadata;
      expect(isContractMetadata(rest)).toBe(false);
    });

    it('should return false for missing version', () => {
      const { version: _, ...rest } = validMetadata;
      expect(isContractMetadata(rest)).toBe(false);
    });

    it('should return false for invalid version', () => {
      expect(isContractMetadata({ ...validMetadata, version: '1.0.0' })).toBe(false);
    });

    it('should return false for missing stability', () => {
      const { stability: _, ...rest } = validMetadata;
      expect(isContractMetadata(rest)).toBe(false);
    });

    it('should return false for missing since', () => {
      const { since: _, ...rest } = validMetadata;
      expect(isContractMetadata(rest)).toBe(false);
    });

    it('should return false for missing description', () => {
      const { description: _, ...rest } = validMetadata;
      expect(isContractMetadata(rest)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isContractMetadata(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isContractMetadata(undefined)).toBe(false);
    });
  });

  describe('isInvariantContract', () => {
    const validInvariant = {
      id: 'INV-TEST-01',
      name: 'Test Invariant',
      severity: 'CRITICAL',
      description: 'Test description',
      module: '@omega/test',
      condition: 'x === x',
    };

    it('should return true for valid invariant', () => {
      expect(isInvariantContract(validInvariant)).toBe(true);
    });

    it('should return true for invariant with testRef', () => {
      expect(isInvariantContract({ ...validInvariant, testRef: 'test.ts' })).toBe(true);
    });

    it('should return false for missing id', () => {
      const { id: _, ...rest } = validInvariant;
      expect(isInvariantContract(rest)).toBe(false);
    });

    it('should return false for missing name', () => {
      const { name: _, ...rest } = validInvariant;
      expect(isInvariantContract(rest)).toBe(false);
    });

    it('should return false for missing severity', () => {
      const { severity: _, ...rest } = validInvariant;
      expect(isInvariantContract(rest)).toBe(false);
    });

    it('should return false for missing module', () => {
      const { module: _, ...rest } = validInvariant;
      expect(isInvariantContract(rest)).toBe(false);
    });

    it('should return false for missing condition', () => {
      const { condition: _, ...rest } = validInvariant;
      expect(isInvariantContract(rest)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isInvariantContract(null)).toBe(false);
    });
  });

  describe('isModuleContract', () => {
    const validModule = {
      metadata: {
        id: 'MOD-TEST',
        name: 'Test Module',
        version: { major: 1, minor: 0, patch: 0 },
        stability: 'STABLE',
        since: '2026-01-01',
        description: 'Test module',
      },
      type: 'CORE',
      package: '@omega/test',
      dependencies: [],
      exports: ['export1'],
      invariants: ['INV-01'],
    };

    it('should return true for valid module', () => {
      expect(isModuleContract(validModule)).toBe(true);
    });

    it('should return false for invalid metadata', () => {
      expect(isModuleContract({ ...validModule, metadata: {} })).toBe(false);
    });

    it('should return false for missing type', () => {
      const { type: _, ...rest } = validModule;
      expect(isModuleContract(rest)).toBe(false);
    });

    it('should return false for missing package', () => {
      const { package: _, ...rest } = validModule;
      expect(isModuleContract(rest)).toBe(false);
    });

    it('should return false for missing dependencies', () => {
      const { dependencies: _, ...rest } = validModule;
      expect(isModuleContract(rest)).toBe(false);
    });

    it('should return false for missing exports', () => {
      const { exports: _, ...rest } = validModule;
      expect(isModuleContract(rest)).toBe(false);
    });

    it('should return false for missing invariants', () => {
      const { invariants: _, ...rest } = validModule;
      expect(isModuleContract(rest)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isModuleContract(null)).toBe(false);
    });
  });
});
