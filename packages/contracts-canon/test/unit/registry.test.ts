/**
 * @fileoverview Unit tests for contract registry.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryContractRegistry,
  validateContract,
  buildDependencyGraph,
  detectCircularDependencies,
  getTopologicalOrder,
  ALL_MODULES,
  ALL_INVARIANTS,
  type ContractEntry,
  type ModuleContract,
} from '../../src/index.js';

describe('registry', () => {
  describe('InMemoryContractRegistry', () => {
    let registry: InMemoryContractRegistry;

    beforeEach(() => {
      registry = new InMemoryContractRegistry();
    });

    describe('register', () => {
      it('should register invariant contract', () => {
        const entry: ContractEntry = {
          type: 'invariant',
          contract: {
            id: 'INV-TEST-01',
            name: 'Test Invariant',
            severity: 'HIGH',
            description: 'Test description',
            module: '@omega/test',
            condition: 'true === true',
          },
        };

        registry.register(entry);
        expect(registry.get('INV-TEST-01')).toEqual(entry);
      });

      it('should register module contract', () => {
        const entry: ContractEntry = {
          type: 'module',
          contract: {
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
            exports: ['test'],
            invariants: [],
          },
        };

        registry.register(entry);
        expect(registry.get('MOD-TEST')).toEqual(entry);
      });

      it('should throw for duplicate ID', () => {
        const entry: ContractEntry = {
          type: 'invariant',
          contract: {
            id: 'INV-DUP-01',
            name: 'Duplicate',
            severity: 'HIGH',
            description: 'Test',
            module: '@omega/test',
            condition: 'x',
          },
        };

        registry.register(entry);
        expect(() => registry.register(entry)).toThrow(/already registered/);
      });

      it('should throw for invalid contract', () => {
        const entry: ContractEntry = {
          type: 'invariant',
          contract: {
            id: '',  // Invalid: empty ID
            name: 'Test',
            severity: 'HIGH',
            description: 'Test',
            module: '@omega/test',
            condition: 'x',
          },
        };

        expect(() => registry.register(entry)).toThrow(/Invalid contract/);
      });
    });

    describe('get', () => {
      it('should return undefined for non-existent ID', () => {
        expect(registry.get('NON-EXISTENT')).toBeUndefined();
      });
    });

    describe('listByType', () => {
      it('should return empty array for no contracts', () => {
        expect(registry.listByType('invariant')).toEqual([]);
      });

      it('should filter by type', () => {
        const inv: ContractEntry = {
          type: 'invariant',
          contract: {
            id: 'INV-FILTER-01',
            name: 'Invariant',
            severity: 'HIGH',
            description: 'Test',
            module: '@omega/test',
            condition: 'x',
          },
        };

        const mod: ContractEntry = {
          type: 'module',
          contract: {
            metadata: {
              id: 'MOD-FILTER',
              name: 'Module',
              version: { major: 1, minor: 0, patch: 0 },
              stability: 'STABLE',
              since: '2026-01-01',
              description: 'Test',
            },
            type: 'CORE',
            package: '@omega/filter-test',
            dependencies: [],
            exports: ['x'],
            invariants: [],
          },
        };

        registry.register(inv);
        registry.register(mod);

        const invariants = registry.listByType('invariant');
        expect(invariants).toHaveLength(1);
        expect(invariants[0].type).toBe('invariant');

        const modules = registry.listByType('module');
        expect(modules).toHaveLength(1);
        expect(modules[0].type).toBe('module');
      });
    });

    describe('list', () => {
      it('should return empty array for no contracts', () => {
        expect(registry.list()).toEqual([]);
      });

      it('should return sorted IDs', () => {
        registry.register({
          type: 'invariant',
          contract: {
            id: 'INV-Z-01',
            name: 'Z',
            severity: 'HIGH',
            description: 'Test',
            module: '@omega/test',
            condition: 'x',
          },
        });

        registry.register({
          type: 'invariant',
          contract: {
            id: 'INV-A-01',
            name: 'A',
            severity: 'HIGH',
            description: 'Test',
            module: '@omega/test',
            condition: 'x',
          },
        });

        const ids = registry.list();
        expect(ids).toEqual(['INV-A-01', 'INV-Z-01']);
      });
    });

    describe('validate', () => {
      it('should return empty array for valid invariant', () => {
        const entry: ContractEntry = {
          type: 'invariant',
          contract: {
            id: 'INV-VALID-01',
            name: 'Valid',
            severity: 'HIGH',
            description: 'Test',
            module: '@omega/test',
            condition: 'x',
          },
        };

        expect(registry.validate(entry)).toEqual([]);
      });

      it('should return errors for invalid invariant', () => {
        const entry: ContractEntry = {
          type: 'invariant',
          contract: {
            id: '',
            name: '',
            severity: 'INVALID' as never,
            description: '',
            module: '',
            condition: '',
          },
        };

        const errors = registry.validate(entry);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('should return errors for invalid module', () => {
        const entry: ContractEntry = {
          type: 'module',
          contract: {
            metadata: {},
            type: 'INVALID' as never,
            package: '',
            dependencies: 'not-array' as never,
            exports: 'not-array' as never,
            invariants: 'not-array' as never,
          } as ModuleContract,
        };

        const errors = registry.validate(entry);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('validateContract', () => {
    it('should return valid result for valid invariant', () => {
      const entry: ContractEntry = {
        type: 'invariant',
        contract: {
          id: 'INV-VALIDATE-01',
          name: 'Valid',
          severity: 'HIGH',
          description: 'Test',
          module: '@omega/test',
          condition: 'x',
        },
      };

      const result = validateContract(entry);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid result for invalid contract', () => {
      const entry: ContractEntry = {
        type: 'invariant',
        contract: {
          id: '',
          name: 'Invalid',
          severity: 'HIGH',
          description: 'Test',
          module: '@omega/test',
          condition: 'x',
        },
      };

      const result = validateContract(entry);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should add warning for module with no exports', () => {
      const entry: ContractEntry = {
        type: 'module',
        contract: {
          metadata: {
            id: 'MOD-WARN',
            name: 'Warning',
            version: { major: 1, minor: 0, patch: 0 },
            stability: 'STABLE',
            since: '2026-01-01',
            description: 'Test',
          },
          type: 'CORE',
          package: '@omega/warning-test',
          dependencies: [],
          exports: [],  // Empty exports
          invariants: [],
        },
      };

      const result = validateContract(entry);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('EMPTY_EXPORTS');
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build graph from modules', () => {
      const graph = buildDependencyGraph(ALL_MODULES);

      expect(graph.size).toBe(ALL_MODULES.length);
      expect(graph.has('@omega/sentinel')).toBe(true);
      expect(graph.has('@omega/orchestrator-core')).toBe(true);
    });

    it('should correctly map dependencies', () => {
      const graph = buildDependencyGraph(ALL_MODULES);

      // Headless runner depends on orchestrator-core
      const headlessDeps = graph.get('@omega/headless-runner');
      expect(headlessDeps).toBeDefined();
      expect(headlessDeps?.has('@omega/orchestrator-core')).toBe(true);
    });

    it('should have empty deps for ROOT modules', () => {
      const graph = buildDependencyGraph(ALL_MODULES);

      const sentinelDeps = graph.get('@omega/sentinel');
      expect(sentinelDeps).toBeDefined();
      expect(sentinelDeps?.size).toBe(0);
    });
  });

  describe('detectCircularDependencies', () => {
    it('should return empty array for acyclic graph', () => {
      const cycles = detectCircularDependencies(ALL_MODULES);
      expect(cycles).toEqual([]);
    });

    it('should detect cycles in modules with circular deps', () => {
      const cyclicModules: ModuleContract[] = [
        {
          metadata: {
            id: 'MOD-A',
            name: 'A',
            version: { major: 1, minor: 0, patch: 0 },
            stability: 'STABLE',
            since: '2026-01-01',
            description: 'A',
          },
          type: 'CORE',
          package: '@omega/a',
          dependencies: [{ module: '@omega/b', version: '>=0.1.0', type: 'required' }],
          exports: ['a'],
          invariants: [],
        },
        {
          metadata: {
            id: 'MOD-B',
            name: 'B',
            version: { major: 1, minor: 0, patch: 0 },
            stability: 'STABLE',
            since: '2026-01-01',
            description: 'B',
          },
          type: 'CORE',
          package: '@omega/b',
          dependencies: [{ module: '@omega/a', version: '>=0.1.0', type: 'required' }],
          exports: ['b'],
          invariants: [],
        },
      ];

      const cycles = detectCircularDependencies(cyclicModules);
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('getTopologicalOrder', () => {
    it('should return valid topological order', () => {
      const order = getTopologicalOrder(ALL_MODULES);

      expect(order.length).toBe(ALL_MODULES.length);

      // ROOT modules should come before their dependents
      const sentinelIndex = order.indexOf('@omega/sentinel');
      const genomeIndex = order.indexOf('@omega/genome');

      // Genome depends on Sentinel, so Sentinel should come first
      if (sentinelIndex !== -1 && genomeIndex !== -1) {
        expect(sentinelIndex).toBeLessThan(genomeIndex);
      }
    });

    it('should include all modules', () => {
      const order = getTopologicalOrder(ALL_MODULES);
      const orderSet = new Set(order);

      for (const mod of ALL_MODULES) {
        expect(orderSet.has(mod.package)).toBe(true);
      }
    });
  });

  describe('integration with ALL_INVARIANTS', () => {
    it('should be able to register all invariants', () => {
      const registry = new InMemoryContractRegistry();

      for (const inv of ALL_INVARIANTS) {
        registry.register({ type: 'invariant', contract: inv });
      }

      expect(registry.list().length).toBe(ALL_INVARIANTS.length);
    });
  });

  describe('integration with ALL_MODULES', () => {
    it('should be able to register all modules', () => {
      const registry = new InMemoryContractRegistry();

      for (const mod of ALL_MODULES) {
        registry.register({ type: 'module', contract: mod });
      }

      expect(registry.list().length).toBe(ALL_MODULES.length);
    });
  });
});
