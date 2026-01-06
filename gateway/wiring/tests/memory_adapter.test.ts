// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS MEMORY ADAPTER
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-ADP-01: Memory Write Forwards Hash
// @invariant INV-ADP-02: Memory Read Deterministic
// @invariant INV-WIRE-03: Version Pinning (mismatch = reject)
// @invariant INV-ADP-05: Error No Leak
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MemoryAdapter,
  createMemoryAdapter,
  MEMORY_SCHEMAS,
} from '../src/adapters/memory_adapter.js';
import type { MemoryStack } from '../src/adapters/memory_adapter.js';
import type { NexusEnvelope } from '../src/types.js';
import { isOk, isErr } from '../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const MODULE_VERSION = 'memory@3.21.0';

function createMockMemoryStack(overrides: Partial<MemoryStack> = {}): MemoryStack {
  return {
    write: vi.fn().mockResolvedValue({ hash: 'mock-hash-123' }),
    readLatest: vi.fn().mockResolvedValue({ value: { test: true }, hash: 'mock-hash-456' }),
    readByHash: vi.fn().mockResolvedValue({ key: 'test-key', value: { data: 42 } }),
    listKeys: vi.fn().mockResolvedValue({ keys: ['key-1', 'key-2', 'key-3'] }),
    ...overrides,
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
    module_version: MODULE_VERSION,
    replay_protection_key: 'rpk-001',
    payload: { key: 'test-key', value: { data: 42 } },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MemoryAdapter', () => {
  describe('Construction', () => {
    it('creates adapter with valid moduleVersion', () => {
      const memory = createMockMemoryStack();
      const adapter = new MemoryAdapter(memory, 'memory@1.0.0');
      expect(adapter.getModuleVersion()).toBe('memory@1.0.0');
    });

    it('throws on invalid moduleVersion format', () => {
      const memory = createMockMemoryStack();
      expect(() => new MemoryAdapter(memory, 'invalid')).toThrow();
      expect(() => new MemoryAdapter(memory, '')).toThrow();
    });

    it('createMemoryAdapter factory works', () => {
      const memory = createMockMemoryStack();
      const adapter = createMemoryAdapter(memory, MODULE_VERSION);
      expect(adapter).toBeInstanceOf(MemoryAdapter);
    });
  });

  describe('canHandle', () => {
    it('returns true for target_module = memory', () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      const env = createEnvelope({ target_module: 'memory' });
      expect(adapter.canHandle(env)).toBe(true);
    });

    it('returns false for other target modules', () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      expect(adapter.canHandle(createEnvelope({ target_module: 'query' }))).toBe(false);
      expect(adapter.canHandle(createEnvelope({ target_module: 'gateway' }))).toBe(false);
      expect(adapter.canHandle(createEnvelope({ target_module: 'oracle' }))).toBe(false);
    });
  });

  describe('INV-WIRE-03: Version Pinning', () => {
    it('rejects mismatched module_version', async () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      const env = createEnvelope({ module_version: 'memory@0.0.1' });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Version mismatch');
        expect(result.error.message).toContain(MODULE_VERSION);
        expect(result.error.message).toContain('memory@0.0.1');
      }
    });

    it('accepts matching module_version', async () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      const env = createEnvelope({ module_version: MODULE_VERSION });
      
      const result = await adapter.handle(env);
      
      expect(isOk(result)).toBe(true);
    });

    it('exact version match required', async () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), 'memory@3.21.0');
      
      // Minor version mismatch
      const result1 = await adapter.handle(createEnvelope({ module_version: 'memory@3.21.1' }));
      expect(isErr(result1)).toBe(true);
      
      // Major version mismatch
      const result2 = await adapter.handle(createEnvelope({ module_version: 'memory@4.21.0' }));
      expect(isErr(result2)).toBe(true);
    });
  });

  describe('memory.write', () => {
    describe('INV-ADP-01: Memory Write Forwards Hash', () => {
      it('forwards expected_previous_hash to Memory Stack', async () => {
        const memory = createMockMemoryStack();
        const adapter = new MemoryAdapter(memory, MODULE_VERSION);
        
        const env = createEnvelope({
          payload_schema: MEMORY_SCHEMAS.WRITE,
          expected_previous_hash: 'previous-hash-abc',
          payload: { key: 'my-key', value: { data: 123 } },
        });
        
        await adapter.handle(env);
        
        expect(memory.write).toHaveBeenCalledWith({
          key: 'my-key',
          value: { data: 123 },
          expected_previous_hash: 'previous-hash-abc',
        });
      });

      it('passes null when expected_previous_hash is undefined', async () => {
        const memory = createMockMemoryStack();
        const adapter = new MemoryAdapter(memory, MODULE_VERSION);
        
        const env = createEnvelope({
          payload_schema: MEMORY_SCHEMAS.WRITE,
          payload: { key: 'my-key', value: 'test' },
        });
        delete env.expected_previous_hash;
        
        await adapter.handle(env);
        
        expect(memory.write).toHaveBeenCalledWith({
          key: 'my-key',
          value: 'test',
          expected_previous_hash: null,
        });
      });

      it('returns hash from Memory Stack', async () => {
        const memory = createMockMemoryStack({
          write: vi.fn().mockResolvedValue({ hash: 'result-hash-xyz' }),
        });
        const adapter = new MemoryAdapter(memory, MODULE_VERSION);
        
        const env = createEnvelope({
          payload_schema: MEMORY_SCHEMAS.WRITE,
          payload: { key: 'k', value: 'v' },
        });
        
        const result = await adapter.handle(env);
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value).toEqual({ hash: 'result-hash-xyz' });
        }
      });
    });

    it('rejects missing key in payload', async () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.WRITE,
        payload: { value: 'test' }, // Missing key
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('ADP_MEM_BAD_PAYLOAD');
      }
    });

    it('rejects empty key', async () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.WRITE,
        payload: { key: '', value: 'test' },
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
    });

    it('accepts null value', async () => {
      const memory = createMockMemoryStack();
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.WRITE,
        payload: { key: 'k', value: null },
      });
      
      const result = await adapter.handle(env);
      
      expect(isOk(result)).toBe(true);
      expect(memory.write).toHaveBeenCalledWith(expect.objectContaining({ value: null }));
    });
  });

  describe('memory.readLatest', () => {
    describe('INV-ADP-02: Memory Read Deterministic', () => {
      it('returns consistent results for same key', async () => {
        const memory = createMockMemoryStack({
          readLatest: vi.fn().mockResolvedValue({ value: { x: 42 }, hash: 'hash-abc' }),
        });
        const adapter = new MemoryAdapter(memory, MODULE_VERSION);
        
        const env = createEnvelope({
          payload_schema: MEMORY_SCHEMAS.READ_LATEST,
          payload: { key: 'consistent-key' },
        });
        
        const result1 = await adapter.handle(env);
        const result2 = await adapter.handle(env);
        const result3 = await adapter.handle(env);
        
        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });

      it('returns value and hash', async () => {
        const memory = createMockMemoryStack({
          readLatest: vi.fn().mockResolvedValue({ 
            value: { complex: { nested: true } }, 
            hash: 'read-hash-123' 
          }),
        });
        const adapter = new MemoryAdapter(memory, MODULE_VERSION);
        
        const env = createEnvelope({
          payload_schema: MEMORY_SCHEMAS.READ_LATEST,
          payload: { key: 'my-key' },
        });
        
        const result = await adapter.handle(env);
        
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value).toEqual({
            value: { complex: { nested: true } },
            hash: 'read-hash-123',
          });
        }
      });
    });

    it('rejects missing key', async () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.READ_LATEST,
        payload: {},
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
    });

    it('rejects empty key', async () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.READ_LATEST,
        payload: { key: '' },
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
    });
  });

  describe('memory.readByHash', () => {
    it('returns key and value for valid hash', async () => {
      const memory = createMockMemoryStack({
        readByHash: vi.fn().mockResolvedValue({ key: 'found-key', value: { data: 99 } }),
      });
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.READ_BY_HASH,
        payload: { hash: 'lookup-hash' },
      });
      
      const result = await adapter.handle(env);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual({ key: 'found-key', value: { data: 99 } });
      }
    });

    it('returns null for non-existent hash', async () => {
      const memory = createMockMemoryStack({
        readByHash: vi.fn().mockResolvedValue(null),
      });
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.READ_BY_HASH,
        payload: { hash: 'nonexistent-hash' },
      });
      
      const result = await adapter.handle(env);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(null);
      }
    });

    it('returns error if readByHash not supported', async () => {
      const memory = createMockMemoryStack();
      delete memory.readByHash;
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.READ_BY_HASH,
        payload: { hash: 'any-hash' },
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('ADP_UNSUPPORTED_SCHEMA');
      }
    });

    it('rejects empty hash', async () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.READ_BY_HASH,
        payload: { hash: '' },
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
    });
  });

  describe('memory.listKeys', () => {
    it('returns list of keys', async () => {
      const memory = createMockMemoryStack({
        listKeys: vi.fn().mockResolvedValue({ keys: ['a', 'b', 'c'] }),
      });
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.LIST_KEYS,
        payload: {},
      });
      
      const result = await adapter.handle(env);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual({ keys: ['a', 'b', 'c'] });
      }
    });

    it('passes prefix filter', async () => {
      const memory = createMockMemoryStack();
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.LIST_KEYS,
        payload: { prefix: 'user:' },
      });
      
      await adapter.handle(env);
      
      expect(memory.listKeys).toHaveBeenCalledWith({ prefix: 'user:' });
    });

    it('returns error if listKeys not supported', async () => {
      const memory = createMockMemoryStack();
      delete memory.listKeys;
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.LIST_KEYS,
        payload: {},
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
    });
  });

  describe('Unsupported schema', () => {
    it('returns error for unknown schema', async () => {
      const adapter = new MemoryAdapter(createMockMemoryStack(), MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: 'memory.unknown',
        payload: {},
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('ADP_UNSUPPORTED_SCHEMA');
        expect(result.error.message).toContain('memory.unknown');
      }
    });
  });

  describe('INV-ADP-05: Error No Leak', () => {
    it('does not expose internal error details', async () => {
      const memory = createMockMemoryStack({
        write: vi.fn().mockRejectedValue(new Error('SECRET: database connection string: postgres://user:pass@host')),
      });
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.WRITE,
        payload: { key: 'k', value: 'v' },
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).not.toContain('SECRET');
        expect(result.error.message).not.toContain('postgres');
        expect(result.error.message).not.toContain('password');
        expect(result.error.message).not.toContain('user:pass');
      }
    });

    it('does not expose stack traces', async () => {
      const secretError = new Error('boom');
      secretError.stack = 'at secretFunction (/home/user/secret/path.ts:42:10)';
      
      const memory = createMockMemoryStack({
        write: vi.fn().mockRejectedValue(secretError),
      });
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.WRITE,
        payload: { key: 'k', value: 'v' },
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        const errorStr = JSON.stringify(result.error);
        expect(errorStr).not.toContain('secretFunction');
        expect(errorStr).not.toContain('/home/user');
        expect(errorStr).not.toContain('.ts:42');
      }
    });

    it('returns generic message for all errors', async () => {
      const errors = [
        new Error('Specific error 1'),
        new Error('Specific error 2'),
        new TypeError('Type mismatch'),
        new RangeError('Out of range'),
      ];
      
      for (const err of errors) {
        const memory = createMockMemoryStack({
          write: vi.fn().mockRejectedValue(err),
        });
        const adapter = new MemoryAdapter(memory, MODULE_VERSION);
        
        const env = createEnvelope({
          payload_schema: MEMORY_SCHEMAS.WRITE,
          payload: { key: 'k', value: 'v' },
        });
        
        const result = await adapter.handle(env);
        
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.message).toBe('An internal error occurred');
        }
      }
    });

    it('marks errors as retryable when appropriate', async () => {
      const memory = createMockMemoryStack({
        write: vi.fn().mockRejectedValue(new Error('Temporary failure')),
      });
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const env = createEnvelope({
        payload_schema: MEMORY_SCHEMAS.WRITE,
        payload: { key: 'k', value: 'v' },
      });
      
      const result = await adapter.handle(env);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.retryable).toBe(true);
      }
    });
  });

  describe('getSupportedSchemas', () => {
    it('returns base schemas for minimal Memory Stack', () => {
      const memory: MemoryStack = {
        write: vi.fn().mockResolvedValue({ hash: 'h' }),
        readLatest: vi.fn().mockResolvedValue({ value: null, hash: 'h' }),
      };
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const schemas = adapter.getSupportedSchemas();
      
      expect(schemas).toContain(MEMORY_SCHEMAS.WRITE);
      expect(schemas).toContain(MEMORY_SCHEMAS.READ_LATEST);
      expect(schemas).not.toContain(MEMORY_SCHEMAS.READ_BY_HASH);
      expect(schemas).not.toContain(MEMORY_SCHEMAS.LIST_KEYS);
    });

    it('returns all schemas for full Memory Stack', () => {
      const memory = createMockMemoryStack();
      const adapter = new MemoryAdapter(memory, MODULE_VERSION);
      
      const schemas = adapter.getSupportedSchemas();
      
      expect(schemas).toContain(MEMORY_SCHEMAS.WRITE);
      expect(schemas).toContain(MEMORY_SCHEMAS.READ_LATEST);
      expect(schemas).toContain(MEMORY_SCHEMAS.READ_BY_HASH);
      expect(schemas).toContain(MEMORY_SCHEMAS.LIST_KEYS);
    });
  });
});
