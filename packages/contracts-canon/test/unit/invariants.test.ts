/**
 * @fileoverview Unit tests for invariants.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_INVARIANTS,
  INVARIANT_COUNT,
  getInvariantsByModule,
  getInvariantsBySeverity,
  getInvariant,
  INV_DET_01,
  INV_DET_02,
  INV_EXE_01,
  INV_REP_01,
  INV_ART_01,
  INV_NEX_01,
  INV_SAN_01,
} from '../../src/index.js';

describe('invariants', () => {
  describe('ALL_INVARIANTS', () => {
    it('should contain all registered invariants', () => {
      expect(ALL_INVARIANTS.length).toBe(INVARIANT_COUNT);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(ALL_INVARIANTS)).toBe(true);
    });

    it('should have unique IDs', () => {
      const ids = ALL_INVARIANTS.map((inv) => inv.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid severity for all invariants', () => {
      const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      for (const inv of ALL_INVARIANTS) {
        expect(validSeverities).toContain(inv.severity);
      }
    });

    it('should have non-empty conditions for all invariants', () => {
      for (const inv of ALL_INVARIANTS) {
        expect(inv.condition.length).toBeGreaterThan(0);
      }
    });
  });

  describe('INVARIANT_COUNT', () => {
    it('should match ALL_INVARIANTS length', () => {
      expect(INVARIANT_COUNT).toBe(ALL_INVARIANTS.length);
    });

    it('should be at least 20', () => {
      expect(INVARIANT_COUNT).toBeGreaterThanOrEqual(20);
    });
  });

  describe('getInvariantsByModule', () => {
    it('should return invariants for orchestrator-core', () => {
      const invariants = getInvariantsByModule('@omega/orchestrator-core');
      expect(invariants.length).toBeGreaterThan(0);
      for (const inv of invariants) {
        expect(inv.module).toBe('@omega/orchestrator-core');
      }
    });

    it('should return invariants for headless-runner', () => {
      const invariants = getInvariantsByModule('@omega/headless-runner');
      expect(invariants.length).toBeGreaterThan(0);
      for (const inv of invariants) {
        expect(inv.module).toBe('@omega/headless-runner');
      }
    });

    it('should return invariants for nexus-dep', () => {
      const invariants = getInvariantsByModule('@omega/integration-nexus-dep');
      expect(invariants.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown module', () => {
      const invariants = getInvariantsByModule('@omega/unknown');
      expect(invariants).toEqual([]);
    });
  });

  describe('getInvariantsBySeverity', () => {
    it('should return CRITICAL invariants', () => {
      const invariants = getInvariantsBySeverity('CRITICAL');
      expect(invariants.length).toBeGreaterThan(0);
      for (const inv of invariants) {
        expect(inv.severity).toBe('CRITICAL');
      }
    });

    it('should return HIGH invariants', () => {
      const invariants = getInvariantsBySeverity('HIGH');
      expect(invariants.length).toBeGreaterThan(0);
      for (const inv of invariants) {
        expect(inv.severity).toBe('HIGH');
      }
    });

    it('should return MEDIUM invariants', () => {
      const invariants = getInvariantsBySeverity('MEDIUM');
      expect(invariants.length).toBeGreaterThan(0);
    });

    it('should return empty for LOW if none exist', () => {
      const invariants = getInvariantsBySeverity('LOW');
      // May or may not have LOW invariants
      for (const inv of invariants) {
        expect(inv.severity).toBe('LOW');
      }
    });
  });

  describe('getInvariant', () => {
    it('should return INV-DET-01', () => {
      const inv = getInvariant('INV-DET-01');
      expect(inv).toBeDefined();
      expect(inv?.id).toBe('INV-DET-01');
    });

    it('should return INV-EXE-01', () => {
      const inv = getInvariant('INV-EXE-01');
      expect(inv).toBeDefined();
      expect(inv?.id).toBe('INV-EXE-01');
    });

    it('should return INV-REP-01', () => {
      const inv = getInvariant('INV-REP-01');
      expect(inv).toBeDefined();
      expect(inv?.id).toBe('INV-REP-01');
    });

    it('should return undefined for unknown ID', () => {
      expect(getInvariant('INV-UNKNOWN-01')).toBeUndefined();
    });
  });

  describe('specific invariants', () => {
    it('INV-DET-01 should be CRITICAL determinism invariant', () => {
      expect(INV_DET_01.id).toBe('INV-DET-01');
      expect(INV_DET_01.severity).toBe('CRITICAL');
      expect(INV_DET_01.module).toBe('@omega/orchestrator-core');
    });

    it('INV-DET-02 should require injectable clock', () => {
      expect(INV_DET_02.id).toBe('INV-DET-02');
      expect(INV_DET_02.condition).toContain('clock');
    });

    it('INV-EXE-01 should require dependency order', () => {
      expect(INV_EXE_01.id).toBe('INV-EXE-01');
      expect(INV_EXE_01.condition).toContain('depends_on');
    });

    it('INV-REP-01 should require recording integrity', () => {
      expect(INV_REP_01.id).toBe('INV-REP-01');
      expect(INV_REP_01.condition).toContain('hash');
    });

    it('INV-ART-01 should require artifact immutability', () => {
      expect(INV_ART_01.id).toBe('INV-ART-01');
      expect(INV_ART_01.severity).toBe('CRITICAL');
    });

    it('INV-NEX-01 should require read-only adapters', () => {
      expect(INV_NEX_01.id).toBe('INV-NEX-01');
      expect(INV_NEX_01.condition).toContain('isReadOnly');
    });

    it('INV-SAN-01 should protect frozen modules', () => {
      expect(INV_SAN_01.id).toBe('INV-SAN-01');
      expect(INV_SAN_01.condition).toContain('FROZEN');
    });
  });

  describe('invariant structure', () => {
    it('all invariants should be frozen', () => {
      for (const inv of ALL_INVARIANTS) {
        expect(Object.isFrozen(inv)).toBe(true);
      }
    });

    it('all invariants should have valid ID format', () => {
      const idPattern = /^INV-[A-Z]{3}-\d{2}$/;
      for (const inv of ALL_INVARIANTS) {
        expect(inv.id).toMatch(idPattern);
      }
    });

    it('all invariants should have description', () => {
      for (const inv of ALL_INVARIANTS) {
        expect(inv.description.length).toBeGreaterThan(10);
      }
    });
  });
});
