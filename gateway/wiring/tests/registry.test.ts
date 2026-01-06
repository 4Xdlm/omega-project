// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS REGISTRY
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-ORCH-05: Version Pinned Registry
// @invariant INV-REG-01: No Handler Without Version
// @invariant INV-REG-02: Capability Match Required
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HandlerRegistry,
  createHandlerRegistry,
  RegistryErrorCodes,
} from '../src/orchestrator/registry.js';
import type { NexusEnvelope, NexusHandler, NexusResult } from '../src/types.js';
import { isOk, isErr } from '../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createMockHandler(canHandleResult: boolean = true): NexusHandler {
  return {
    canHandle: () => canHandleResult,
    handle: async () => ({ ok: true, value: { mock: true } } as NexusResult<unknown>),
  };
}

function createEnvelope(overrides: Partial<NexusEnvelope> = {}): NexusEnvelope {
  return {
    message_id: 'msg-001',
    trace_id: 'trace-001',
    timestamp: 1704499200000,
    source_module: 'gateway',
    target_module: 'memory',
    kind: 'command',
    payload_schema: 'memory.write',
    payload_version: 'v1.0.0',
    module_version: 'memory@3.21.0',
    replay_protection_key: 'rpk-001',
    payload: { key: 'test', value: 42 },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('HandlerRegistry', () => {
  let registry: HandlerRegistry;

  beforeEach(() => {
    registry = createHandlerRegistry();
  });

  describe('Registration', () => {
    it('registers handler successfully', () => {
      const handler = createMockHandler();

      expect(() => {
        registry.register('memory', 'memory@3.21.0', handler, {
          schemas: ['memory.write', 'memory.readLatest'],
          kinds: ['command', 'query'],
        });
      }).not.toThrow();

      expect(registry.size).toBe(1);
      expect(registry.has('memory', 'memory@3.21.0')).toBe(true);
    });

    it('rejects duplicate registration', () => {
      const handler = createMockHandler();

      registry.register('memory', 'memory@3.21.0', handler, {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      expect(() => {
        registry.register('memory', 'memory@3.21.0', handler, {
          schemas: ['memory.write'],
          kinds: ['command'],
        });
      }).toThrow(/Duplicate/);
    });

    it('allows different versions of same module', () => {
      const handler1 = createMockHandler();
      const handler2 = createMockHandler();

      registry.register('memory', 'memory@3.20.0', handler1, {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      registry.register('memory', 'memory@3.21.0', handler2, {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      expect(registry.size).toBe(2);
    });

    it('INV-REG-01: rejects invalid version format', () => {
      const handler = createMockHandler();

      expect(() => {
        registry.register('memory', 'invalid-version', handler, {
          schemas: ['memory.write'],
          kinds: ['command'],
        });
      }).toThrow(/module@version/);
    });

    it('rejects empty module name', () => {
      const handler = createMockHandler();

      expect(() => {
        registry.register('', 'test@1.0.0', handler, {
          schemas: ['test'],
          kinds: ['command'],
        });
      }).toThrow();
    });

    it('rejects handler with no schemas', () => {
      const handler = createMockHandler();

      expect(() => {
        registry.register('memory', 'memory@1.0.0', handler, {
          schemas: [],
          kinds: ['command'],
        });
      }).toThrow(/at least one/);
    });
  });

  describe('Resolution', () => {
    beforeEach(() => {
      registry.register('memory', 'memory@3.21.0', createMockHandler(), {
        schemas: ['memory.write', 'memory.readLatest'],
        kinds: ['command', 'query'],
      });

      registry.register('query', 'query@3.21.0', createMockHandler(), {
        schemas: ['query.search'],
        kinds: ['query'],
      });
    });

    it('INV-ORCH-05: resolves by exact version match', () => {
      const env = createEnvelope({
        target_module: 'memory',
        module_version: 'memory@3.21.0',
        payload_schema: 'memory.write',
        kind: 'command',
      });

      const result = registry.resolve(env);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.registration.moduleVersion).toBe('memory@3.21.0');
      }
    });

    it('INV-ORCH-05: rejects version mismatch', () => {
      const env = createEnvelope({
        target_module: 'memory',
        module_version: 'memory@3.20.0', // Different version
        payload_schema: 'memory.write',
      });

      const result = registry.resolve(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe(RegistryErrorCodes.NO_HANDLER);
      }
    });

    it('INV-REG-02: rejects unsupported schema', () => {
      const env = createEnvelope({
        target_module: 'memory',
        module_version: 'memory@3.21.0',
        payload_schema: 'memory.delete', // Not in capabilities
        kind: 'command',
      });

      const result = registry.resolve(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe(RegistryErrorCodes.CAPABILITY_MISMATCH);
      }
    });

    it('INV-REG-02: rejects unsupported kind', () => {
      const env = createEnvelope({
        target_module: 'memory',
        module_version: 'memory@3.21.0',
        payload_schema: 'memory.write',
        kind: 'event', // Not in capabilities
      });

      const result = registry.resolve(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe(RegistryErrorCodes.CAPABILITY_MISMATCH);
      }
    });

    it('respects handler canHandle rejection', () => {
      registry.register('oracle', 'oracle@1.0.0', createMockHandler(false), {
        schemas: ['oracle.predict'],
        kinds: ['query'],
      });

      const env = createEnvelope({
        target_module: 'oracle',
        module_version: 'oracle@1.0.0',
        payload_schema: 'oracle.predict',
        kind: 'query',
      });

      const result = registry.resolve(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe(RegistryErrorCodes.HANDLER_REJECT);
      }
    });
  });

  describe('Unregistration', () => {
    it('unregisters handler', () => {
      registry.register('memory', 'memory@3.21.0', createMockHandler(), {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      expect(registry.unregister('memory', 'memory@3.21.0')).toBe(true);
      expect(registry.size).toBe(0);
    });

    it('returns false for non-existent handler', () => {
      expect(registry.unregister('memory', 'memory@1.0.0')).toBe(false);
    });
  });

  describe('getVersionsForModule', () => {
    it('returns all versions for module', () => {
      registry.register('memory', 'memory@3.20.0', createMockHandler(), {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      registry.register('memory', 'memory@3.21.0', createMockHandler(), {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      const versions = registry.getVersionsForModule('memory');

      expect(versions).toContain('memory@3.20.0');
      expect(versions).toContain('memory@3.21.0');
    });

    it('returns empty array for unknown module', () => {
      const versions = registry.getVersionsForModule('unknown');
      expect(versions).toEqual([]);
    });
  });

  describe('getAllRegistrations', () => {
    it('returns all registrations', () => {
      registry.register('memory', 'memory@3.21.0', createMockHandler(), {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      registry.register('query', 'query@3.21.0', createMockHandler(), {
        schemas: ['query.search'],
        kinds: ['query'],
      });

      const all = registry.getAllRegistrations();

      expect(all.length).toBe(2);
      expect(all.some(r => r.targetModule === 'memory')).toBe(true);
      expect(all.some(r => r.targetModule === 'query')).toBe(true);
    });
  });

  describe('clear', () => {
    it('removes all handlers', () => {
      registry.register('memory', 'memory@3.21.0', createMockHandler(), {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      registry.clear();

      expect(registry.size).toBe(0);
    });
  });
});
