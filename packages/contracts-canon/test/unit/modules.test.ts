/**
 * @fileoverview Unit tests for module contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_MODULES,
  MODULE_COUNT,
  getModulesByType,
  getModule,
  getModuleByPackage,
  MOD_SENTINEL,
  MOD_ORCHESTRATOR_CORE,
  MOD_HEADLESS_RUNNER,
  MOD_CONTRACTS_CANON,
  MOD_GENOME,
  MOD_NEXUS_DEP,
} from '../../src/index.js';

describe('modules', () => {
  describe('ALL_MODULES', () => {
    it('should contain all registered modules', () => {
      expect(ALL_MODULES.length).toBe(MODULE_COUNT);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(ALL_MODULES)).toBe(true);
    });

    it('should have unique IDs', () => {
      const ids = ALL_MODULES.map((mod) => mod.metadata.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique package names', () => {
      const packages = ALL_MODULES.map((mod) => mod.package);
      const uniquePackages = new Set(packages);
      expect(uniquePackages.size).toBe(packages.length);
    });

    it('should have valid types', () => {
      const validTypes = ['ROOT', 'CORE', 'CLIENT', 'INTEGRATION', 'UTILITY'];
      for (const mod of ALL_MODULES) {
        expect(validTypes).toContain(mod.type);
      }
    });
  });

  describe('MODULE_COUNT', () => {
    it('should match ALL_MODULES length', () => {
      expect(MODULE_COUNT).toBe(ALL_MODULES.length);
    });

    it('should be at least 10', () => {
      expect(MODULE_COUNT).toBeGreaterThanOrEqual(10);
    });
  });

  describe('getModulesByType', () => {
    it('should return ROOT modules', () => {
      const modules = getModulesByType('ROOT');
      expect(modules.length).toBeGreaterThan(0);
      for (const mod of modules) {
        expect(mod.type).toBe('ROOT');
      }
    });

    it('should return CORE modules', () => {
      const modules = getModulesByType('CORE');
      expect(modules.length).toBeGreaterThan(0);
      for (const mod of modules) {
        expect(mod.type).toBe('CORE');
      }
    });

    it('should return CLIENT modules', () => {
      const modules = getModulesByType('CLIENT');
      expect(modules.length).toBeGreaterThan(0);
      for (const mod of modules) {
        expect(mod.type).toBe('CLIENT');
      }
    });

    it('should return INTEGRATION modules', () => {
      const modules = getModulesByType('INTEGRATION');
      expect(modules.length).toBeGreaterThan(0);
      for (const mod of modules) {
        expect(mod.type).toBe('INTEGRATION');
      }
    });

    it('should return UTILITY modules', () => {
      const modules = getModulesByType('UTILITY');
      expect(modules.length).toBeGreaterThan(0);
      for (const mod of modules) {
        expect(mod.type).toBe('UTILITY');
      }
    });
  });

  describe('getModule', () => {
    it('should return MOD-SENTINEL', () => {
      const mod = getModule('MOD-SENTINEL');
      expect(mod).toBeDefined();
      expect(mod?.metadata.id).toBe('MOD-SENTINEL');
    });

    it('should return MOD-ORCHESTRATOR-CORE', () => {
      const mod = getModule('MOD-ORCHESTRATOR-CORE');
      expect(mod).toBeDefined();
      expect(mod?.metadata.id).toBe('MOD-ORCHESTRATOR-CORE');
    });

    it('should return MOD-HEADLESS-RUNNER', () => {
      const mod = getModule('MOD-HEADLESS-RUNNER');
      expect(mod).toBeDefined();
    });

    it('should return undefined for unknown ID', () => {
      expect(getModule('MOD-UNKNOWN')).toBeUndefined();
    });
  });

  describe('getModuleByPackage', () => {
    it('should return module by @omega/sentinel', () => {
      const mod = getModuleByPackage('@omega/sentinel');
      expect(mod).toBeDefined();
      expect(mod?.package).toBe('@omega/sentinel');
    });

    it('should return module by @omega/orchestrator-core', () => {
      const mod = getModuleByPackage('@omega/orchestrator-core');
      expect(mod).toBeDefined();
      expect(mod?.package).toBe('@omega/orchestrator-core');
    });

    it('should return module by @omega/headless-runner', () => {
      const mod = getModuleByPackage('@omega/headless-runner');
      expect(mod).toBeDefined();
    });

    it('should return undefined for unknown package', () => {
      expect(getModuleByPackage('@omega/unknown')).toBeUndefined();
    });
  });

  describe('specific modules', () => {
    it('MOD_SENTINEL should be ROOT and FROZEN', () => {
      expect(MOD_SENTINEL.type).toBe('ROOT');
      expect(MOD_SENTINEL.metadata.stability).toBe('FROZEN');
      expect(MOD_SENTINEL.package).toBe('@omega/sentinel');
    });

    it('MOD_ORCHESTRATOR_CORE should be CORE', () => {
      expect(MOD_ORCHESTRATOR_CORE.type).toBe('CORE');
      expect(MOD_ORCHESTRATOR_CORE.package).toBe('@omega/orchestrator-core');
      expect(MOD_ORCHESTRATOR_CORE.invariants.length).toBeGreaterThan(0);
    });

    it('MOD_HEADLESS_RUNNER should depend on orchestrator-core', () => {
      expect(MOD_HEADLESS_RUNNER.type).toBe('CORE');
      const hasDep = MOD_HEADLESS_RUNNER.dependencies.some(
        (d) => d.module === '@omega/orchestrator-core'
      );
      expect(hasDep).toBe(true);
    });

    it('MOD_CONTRACTS_CANON should be CORE', () => {
      expect(MOD_CONTRACTS_CANON.type).toBe('CORE');
      expect(MOD_CONTRACTS_CANON.package).toBe('@omega/contracts-canon');
    });

    it('MOD_GENOME should be CLIENT and FROZEN', () => {
      expect(MOD_GENOME.type).toBe('CLIENT');
      expect(MOD_GENOME.metadata.stability).toBe('FROZEN');
    });

    it('MOD_NEXUS_DEP should be INTEGRATION', () => {
      expect(MOD_NEXUS_DEP.type).toBe('INTEGRATION');
      expect(MOD_NEXUS_DEP.dependencies.length).toBeGreaterThan(0);
    });
  });

  describe('module structure', () => {
    it('all modules should be frozen', () => {
      for (const mod of ALL_MODULES) {
        expect(Object.isFrozen(mod)).toBe(true);
      }
    });

    it('all modules should have frozen metadata', () => {
      for (const mod of ALL_MODULES) {
        expect(Object.isFrozen(mod.metadata)).toBe(true);
      }
    });

    it('all modules should have valid ID format', () => {
      const idPattern = /^MOD-[A-Z0-9-]+$/;
      for (const mod of ALL_MODULES) {
        expect(mod.metadata.id).toMatch(idPattern);
      }
    });

    it('all modules should have package name starting with @omega/', () => {
      for (const mod of ALL_MODULES) {
        expect(mod.package).toMatch(/^@omega\//);
      }
    });

    it('all modules should have at least one export', () => {
      for (const mod of ALL_MODULES) {
        expect(mod.exports.length).toBeGreaterThan(0);
      }
    });
  });

  describe('module dependencies', () => {
    it('ROOT modules should have no dependencies', () => {
      const rootModules = getModulesByType('ROOT');
      for (const mod of rootModules) {
        expect(mod.dependencies.length).toBe(0);
      }
    });

    it('all dependencies should reference valid package names', () => {
      for (const mod of ALL_MODULES) {
        for (const dep of mod.dependencies) {
          expect(dep.module).toMatch(/^@omega\//);
          expect(dep.version).toMatch(/^[<>=]*\d/);
          expect(['required', 'optional', 'peer']).toContain(dep.type);
        }
      }
    });
  });
});
