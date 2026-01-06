// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS QUERY ADAPTER
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-ADP-03: Query Search Bounded (timeout + limit)
// @invariant INV-WIRE-03: Version Pinning (mismatch = reject)
// @invariant INV-ADP-05: Error No Leak
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';
import {
  QueryAdapter,
  createQueryAdapter,
  QUERY_SCHEMAS,
} from '../src/adapters/query_adapter.js';
import type { QueryEngine } from '../src/adapters/query_adapter.js';
import type { NexusEnvelope } from '../src/types.js';
import { isOk, isErr } from '../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const MODULE_VERSION = 'query@3.21.0';

function createMockQueryEngine(overrides: Partial<QueryEngine> = {}): QueryEngine {
  return {
    search: vi.fn().mockResolvedValue({ results: [{ id: 1 }, { id: 2 }], total: 2 }),
    find: vi.fn().mockResolvedValue({ results: [{ id: 3 }], total: 1 }),
    aggregate: vi.fn().mockResolvedValue({ value: 42 }),
    analyze: vi.fn().mockResolvedValue({ interpretation: { type: 'test' }, confidence: 0.95 }),
    ...overrides,
  };
}

function createEnvelope(overrides: Partial<NexusEnvelope> = {}): NexusEnvelope {
  return {
    message_id: 'msg-001',
    trace_id: 'trace-001',
    timestamp: 1704499200000,
    source_module: 'gateway',
    target_module: 'query',
    kind: 'query',
    payload_schema: 'query.search',
    payload_version: 'v1.0.0',
    module_version: MODULE_VERSION,
    replay_protection_key: 'rpk-001',
    payload: { query: 'test search' },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('QueryAdapter', () => {
  describe('Construction', () => {
    it('creates adapter with valid moduleVersion', () => {
      const query = createMockQueryEngine();
      const adapter = new QueryAdapter(query, MODULE_VERSION);
      expect(adapter.getModuleVersion()).toBe(MODULE_VERSION);
    });

    it('throws on invalid moduleVersion format', () => {
      const query = createMockQueryEngine();
      expect(() => new QueryAdapter(query, 'invalid')).toThrow();
      expect(() => new QueryAdapter(query, '')).toThrow();
    });

    it('createQueryAdapter factory works', () => {
      const query = createMockQueryEngine();
      const adapter = createQueryAdapter(query, MODULE_VERSION);
      expect(adapter).toBeInstanceOf(QueryAdapter);
    });

    it('accepts custom config', () => {
      const query = createMockQueryEngine();
      const adapter = new QueryAdapter(query, MODULE_VERSION, {
        maxLimit: 500,
        defaultLimit: 50,
        timeoutMs: 10000,
      });
      const config = adapter.getConfig();
      expect(config.maxLimit).toBe(500);
      expect(config.defaultLimit).toBe(50);
      expect(config.timeoutMs).toBe(10000);
    });
  });

  describe('canHandle', () => {
    it('returns true for target_module = query', () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);
      expect(adapter.canHandle(createEnvelope({ target_module: 'query' }))).toBe(true);
    });

    it('returns false for other target modules', () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);
      expect(adapter.canHandle(createEnvelope({ target_module: 'memory' }))).toBe(false);
      expect(adapter.canHandle(createEnvelope({ target_module: 'gateway' }))).toBe(false);
    });
  });

  describe('INV-WIRE-03: Version Pinning', () => {
    it('rejects mismatched module_version', async () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);
      const env = createEnvelope({ module_version: 'query@0.0.1' });

      const result = await adapter.handle(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Version mismatch');
      }
    });

    it('accepts matching module_version', async () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);
      const env = createEnvelope({ module_version: MODULE_VERSION });

      const result = await adapter.handle(env);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('query.search', () => {
    it('executes search and returns results', async () => {
      const query = createMockQueryEngine({
        search: vi.fn().mockResolvedValue({ results: [{ name: 'a' }], total: 1 }),
      });
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.SEARCH,
        payload: { query: 'test query' },
      });

      const result = await adapter.handle(env);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual({ results: [{ name: 'a' }], total: 1 });
      }
    });

    it('rejects missing query string', async () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.SEARCH,
        payload: {},
      });

      const result = await adapter.handle(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('ADP_QRY_BAD_PAYLOAD');
      }
    });

    describe('INV-ADP-03: Query Search Bounded', () => {
      it('enforces maxLimit', async () => {
        const query = createMockQueryEngine();
        const adapter = new QueryAdapter(query, MODULE_VERSION, { maxLimit: 50 });

        const env = createEnvelope({
          payload_schema: QUERY_SCHEMAS.SEARCH,
          payload: { query: 'test', limit: 1000 },
        });

        await adapter.handle(env);

        expect(query.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
      });

      it('uses defaultLimit when not specified', async () => {
        const query = createMockQueryEngine();
        const adapter = new QueryAdapter(query, MODULE_VERSION, { defaultLimit: 25 });

        const env = createEnvelope({
          payload_schema: QUERY_SCHEMAS.SEARCH,
          payload: { query: 'test' },
        });

        await adapter.handle(env);

        expect(query.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
      });

      it('uses requested limit when within bounds', async () => {
        const query = createMockQueryEngine();
        const adapter = new QueryAdapter(query, MODULE_VERSION, { maxLimit: 100 });

        const env = createEnvelope({
          payload_schema: QUERY_SCHEMAS.SEARCH,
          payload: { query: 'test', limit: 30 },
        });

        await adapter.handle(env);

        expect(query.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 30 }));
      });

      it('enforces non-negative offset', async () => {
        const query = createMockQueryEngine();
        const adapter = new QueryAdapter(query, MODULE_VERSION);

        const env = createEnvelope({
          payload_schema: QUERY_SCHEMAS.SEARCH,
          payload: { query: 'test', offset: -10 },
        });

        await adapter.handle(env);

        expect(query.search).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
      });

      it('times out on slow queries', async () => {
        const slowQuery = createMockQueryEngine({
          search: vi.fn().mockImplementation(() => new Promise(resolve => {
            setTimeout(() => resolve({ results: [], total: 0 }), 5000);
          })),
        });
        const adapter = new QueryAdapter(slowQuery, MODULE_VERSION, { timeoutMs: 100 });

        const env = createEnvelope({
          payload_schema: QUERY_SCHEMAS.SEARCH,
          payload: { query: 'slow' },
        });

        const result = await adapter.handle(env);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error.error_code).toBe('ADP_QRY_TIMEOUT');
        }
      });
    });
  });

  describe('query.find', () => {
    it('executes find with filters', async () => {
      const query = createMockQueryEngine();
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.FIND,
        payload: { filters: { status: 'active' }, limit: 10 },
      });

      const result = await adapter.handle(env);

      expect(isOk(result)).toBe(true);
      expect(query.find).toHaveBeenCalledWith(expect.objectContaining({
        filters: { status: 'active' },
        limit: 10,
      }));
    });

    it('returns error if find not supported', async () => {
      const query: QueryEngine = {
        search: vi.fn().mockResolvedValue({ results: [], total: 0 }),
      };
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.FIND,
        payload: { filters: {} },
      });

      const result = await adapter.handle(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('ADP_UNSUPPORTED_SCHEMA');
      }
    });

    it('rejects missing filters', async () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.FIND,
        payload: {},
      });

      const result = await adapter.handle(env);

      expect(isErr(result)).toBe(true);
    });

    it('passes sort options', async () => {
      const query = createMockQueryEngine();
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.FIND,
        payload: { filters: {}, sort: { field: 'name', order: 'asc' } },
      });

      await adapter.handle(env);

      expect(query.find).toHaveBeenCalledWith(expect.objectContaining({
        sort: { field: 'name', order: 'asc' },
      }));
    });
  });

  describe('query.aggregate', () => {
    it('executes aggregation', async () => {
      const query = createMockQueryEngine({
        aggregate: vi.fn().mockResolvedValue({ value: 123.45 }),
      });
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.AGGREGATE,
        payload: { field: 'price', operation: 'avg' },
      });

      const result = await adapter.handle(env);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual({ value: 123.45 });
      }
    });

    it('rejects invalid operation', async () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.AGGREGATE,
        payload: { field: 'x', operation: 'invalid_op' },
      });

      const result = await adapter.handle(env);

      expect(isErr(result)).toBe(true);
    });

    it('accepts all valid operations', async () => {
      const query = createMockQueryEngine();
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const ops = ['count', 'sum', 'avg', 'min', 'max'];

      for (const op of ops) {
        const env = createEnvelope({
          payload_schema: QUERY_SCHEMAS.AGGREGATE,
          payload: { field: 'x', operation: op },
        });

        const result = await adapter.handle(env);
        expect(isOk(result)).toBe(true);
      }
    });
  });

  describe('query.analyze', () => {
    it('executes analysis', async () => {
      const query = createMockQueryEngine({
        analyze: vi.fn().mockResolvedValue({
          interpretation: { intent: 'search', entities: [] },
          confidence: 0.88,
        }),
      });
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.ANALYZE,
        payload: { text: 'find all users' },
      });

      const result = await adapter.handle(env);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual({
          interpretation: { intent: 'search', entities: [] },
          confidence: 0.88,
        });
      }
    });

    it('rejects missing text', async () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.ANALYZE,
        payload: {},
      });

      const result = await adapter.handle(env);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('Unsupported schema', () => {
    it('returns error for unknown schema', async () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: 'query.unknown',
      });

      const result = await adapter.handle(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('ADP_UNSUPPORTED_SCHEMA');
      }
    });
  });

  describe('INV-ADP-05: Error No Leak', () => {
    it('does not expose internal error details', async () => {
      const query = createMockQueryEngine({
        search: vi.fn().mockRejectedValue(new Error('SECRET: connection string postgres://user:pass@host')),
      });
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.SEARCH,
        payload: { query: 'test' },
      });

      const result = await adapter.handle(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).not.toContain('SECRET');
        expect(result.error.message).not.toContain('postgres');
        expect(result.error.message).toBe('An internal error occurred');
      }
    });

    it('marks query errors as retryable', async () => {
      const query = createMockQueryEngine({
        search: vi.fn().mockRejectedValue(new Error('Temporary failure')),
      });
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const env = createEnvelope({
        payload_schema: QUERY_SCHEMAS.SEARCH,
        payload: { query: 'test' },
      });

      const result = await adapter.handle(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.retryable).toBe(true);
      }
    });
  });

  describe('getSupportedSchemas', () => {
    it('returns only search for minimal engine', () => {
      const query: QueryEngine = {
        search: vi.fn().mockResolvedValue({ results: [], total: 0 }),
      };
      const adapter = new QueryAdapter(query, MODULE_VERSION);

      const schemas = adapter.getSupportedSchemas();

      expect(schemas).toContain(QUERY_SCHEMAS.SEARCH);
      expect(schemas).not.toContain(QUERY_SCHEMAS.FIND);
      expect(schemas).not.toContain(QUERY_SCHEMAS.AGGREGATE);
      expect(schemas).not.toContain(QUERY_SCHEMAS.ANALYZE);
    });

    it('returns all schemas for full engine', () => {
      const adapter = new QueryAdapter(createMockQueryEngine(), MODULE_VERSION);

      const schemas = adapter.getSupportedSchemas();

      expect(schemas).toContain(QUERY_SCHEMAS.SEARCH);
      expect(schemas).toContain(QUERY_SCHEMAS.FIND);
      expect(schemas).toContain(QUERY_SCHEMAS.AGGREGATE);
      expect(schemas).toContain(QUERY_SCHEMAS.ANALYZE);
    });
  });
});
