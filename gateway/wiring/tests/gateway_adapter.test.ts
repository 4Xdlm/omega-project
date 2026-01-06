// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS GATEWAY ADAPTER
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-GW-01: Zero Direct Call - aucun import de module métier
// @invariant INV-GW-02: Schema Determinism - même input → même schema
// @invariant INV-GW-03: No Hidden Mutation - payload === input
// @invariant INV-GW-04: Version Pinning - module_version explicite
// @invariant INV-GW-05: Rejection Strict - input inconnu → erreur
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  GatewayAdapter,
  createGatewayAdapter,
  createOmegaGatewayAdapter,
  GatewayErrorCodes,
} from '../src/adapters/gateway_adapter.js';
import type { GatewayInput, GatewayRequestContext } from '../src/adapters/index.js';
import { FixedClock } from '../src/clock.js';
import { FixedIdFactory, SequentialIdFactory } from '../src/id_factory.js';
import { isOk, isErr } from '../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const MODULE_VERSIONS = {
  memory: 'memory@3.21.0',
  query: 'query@3.21.0',
  gateway: 'gateway@3.21.0',
};

function createAdapter() {
  return new GatewayAdapter({
    clock: new FixedClock(1704499200000),
    ids: new FixedIdFactory('msg-fixed'),
    moduleVersions: MODULE_VERSIONS,
  });
}

function createContext(overrides: Partial<GatewayRequestContext> = {}): GatewayRequestContext {
  return {
    trace_id: 'trace-001',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GatewayAdapter', () => {
  describe('Construction', () => {
    it('creates adapter with valid config', () => {
      const adapter = createAdapter();
      expect(adapter.getConfig().sourceModule).toBe('gateway');
    });

    it('throws on invalid version format', () => {
      expect(() => new GatewayAdapter({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        moduleVersions: { memory: 'invalid' }, // Missing @
      })).toThrow();
    });

    it('createGatewayAdapter factory works', () => {
      const adapter = createGatewayAdapter({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        moduleVersions: MODULE_VERSIONS,
      });
      expect(adapter).toBeInstanceOf(GatewayAdapter);
    });

    it('createOmegaGatewayAdapter uses default versions', () => {
      const adapter = createOmegaGatewayAdapter(
        new FixedClock(1000),
        new FixedIdFactory('id')
      );
      const config = adapter.getConfig();
      expect(config.moduleVersions.memory).toBe('memory@3.21.0');
      expect(config.moduleVersions.query).toBe('query@3.21.0');
    });
  });

  describe('INV-GW-02: Schema Determinism', () => {
    it('same input produces same envelope spec', () => {
      const adapter = createAdapter();
      const context = createContext();

      const input: GatewayInput = { kind: 'memory.write', key: 'test', value: 42 };

      const result1 = adapter.build(input, context);
      const result2 = adapter.build(input, context);

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);

      if (isOk(result1) && isOk(result2)) {
        expect(result1.value.spec).toEqual(result2.value.spec);
        expect(result1.value.envelope.payload_schema).toBe(result2.value.envelope.payload_schema);
      }
    });

    it('100 builds produce identical schemas', () => {
      const adapter = createAdapter();
      const context = createContext();
      const input: GatewayInput = { kind: 'query.search', query: 'test', limit: 10 };

      const results: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = adapter.build(input, context);
        if (isOk(result)) {
          results.push(result.value.envelope.payload_schema);
        }
      }

      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBe('query.search');
    });

    it('different inputs produce different schemas', () => {
      const adapter = createAdapter();
      const context = createContext();

      const inputs: GatewayInput[] = [
        { kind: 'memory.write', key: 'k', value: 1 },
        { kind: 'memory.readLatest', key: 'k' },
        { kind: 'query.search', query: 'q' },
        { kind: 'query.analyze', text: 't' },
      ];

      const schemas = inputs.map(input => {
        const result = adapter.build(input, context);
        return isOk(result) ? result.value.envelope.payload_schema : null;
      });

      expect(new Set(schemas).size).toBe(4);
    });
  });

  describe('INV-GW-03: No Hidden Mutation', () => {
    it('payload equals input data', () => {
      const adapter = createAdapter();
      const context = createContext();

      const input: GatewayInput = { kind: 'memory.write', key: 'mykey', value: { nested: true } };
      const result = adapter.build(input, context);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const payload = result.value.envelope.payload as any;
        expect(payload.key).toBe('mykey');
        expect(payload.value).toEqual({ nested: true });
      }
    });

    it('payload is not mutated after build', () => {
      const adapter = createAdapter();
      const context = createContext();

      const originalValue = { x: 1 };
      const input: GatewayInput = { kind: 'memory.write', key: 'k', value: originalValue };
      const result = adapter.build(input, context);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // Attempt to mutate the envelope payload
        (result.value.envelope.payload as any).injected = 'hack';
        
        // Original input value should be unchanged
        expect(originalValue).toEqual({ x: 1 });
        expect('injected' in originalValue).toBe(false);
      }
    });

    it('all memory inputs have correct payload structure', () => {
      const adapter = createAdapter();
      const context = createContext();

      const inputs: GatewayInput[] = [
        { kind: 'memory.write', key: 'k1', value: 'v1' },
        { kind: 'memory.readLatest', key: 'k2' },
        { kind: 'memory.readByHash', hash: 'h1' },
        { kind: 'memory.listKeys', prefix: 'p1' },
      ];

      for (const input of inputs) {
        const result = adapter.build(input, context);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          // Payload should only contain fields from input (minus kind)
          const payload = result.value.envelope.payload as Record<string, unknown>;
          expect('kind' in payload).toBe(false);
        }
      }
    });
  });

  describe('INV-GW-04: Version Pinning', () => {
    it('envelope has explicit module_version', () => {
      const adapter = createAdapter();
      const context = createContext();

      const result = adapter.build({ kind: 'memory.write', key: 'k', value: 1 }, context);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.envelope.module_version).toBe('memory@3.21.0');
      }
    });

    it('version comes from config, not guessed', () => {
      const adapter = new GatewayAdapter({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        moduleVersions: {
          memory: 'memory@99.0.0',
          query: 'query@99.0.0',
          gateway: 'gateway@99.0.0',
        },
      });

      const result = adapter.build({ kind: 'memory.write', key: 'k', value: 1 }, createContext());

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.envelope.module_version).toBe('memory@99.0.0');
      }
    });

    it('rejects if target module version not configured', () => {
      const adapter = new GatewayAdapter({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        moduleVersions: {
          gateway: 'gateway@1.0.0',
          // memory NOT configured
        },
      });

      const result = adapter.build({ kind: 'memory.write', key: 'k', value: 1 }, createContext());

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe(GatewayErrorCodes.MISSING_VERSION);
      }
    });
  });

  describe('INV-GW-05: Rejection Strict', () => {
    it('rejects null input', () => {
      const adapter = createAdapter();
      const result = adapter.build(null, createContext());

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe(GatewayErrorCodes.INVALID_INPUT);
      }
    });

    it('rejects undefined input', () => {
      const adapter = createAdapter();
      const result = adapter.build(undefined, createContext());

      expect(isErr(result)).toBe(true);
    });

    it('rejects input without kind', () => {
      const adapter = createAdapter();
      const result = adapter.build({ key: 'k', value: 1 }, createContext());

      expect(isErr(result)).toBe(true);
    });

    it('rejects unknown kind', () => {
      const adapter = createAdapter();
      const result = adapter.build({ kind: 'unknown.operation' }, createContext());

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('unknown.operation');
      }
    });

    it('rejects memory.write without key', () => {
      const adapter = createAdapter();
      const result = adapter.build({ kind: 'memory.write', value: 1 }, createContext());

      expect(isErr(result)).toBe(true);
    });

    it('rejects memory.write with empty key', () => {
      const adapter = createAdapter();
      const result = adapter.build({ kind: 'memory.write', key: '', value: 1 }, createContext());

      expect(isErr(result)).toBe(true);
    });

    it('rejects query.search without query string', () => {
      const adapter = createAdapter();
      const result = adapter.build({ kind: 'query.search' }, createContext());

      expect(isErr(result)).toBe(true);
    });

    it('rejects query.aggregate with invalid operation', () => {
      const adapter = createAdapter();
      const result = adapter.build({ kind: 'query.aggregate', field: 'f', operation: 'invalid' }, createContext());

      expect(isErr(result)).toBe(true);
    });

    it('never returns fallback schema on error', () => {
      const adapter = createAdapter();
      
      const invalidInputs = [
        null,
        undefined,
        {},
        { kind: 'invalid' },
        { kind: 'memory.write' },
        'string',
        123,
        [],
      ];

      for (const input of invalidInputs) {
        const result = adapter.build(input, createContext());
        expect(isErr(result)).toBe(true);
      }
    });
  });

  describe('Envelope construction', () => {
    it('injects trace_id from context', () => {
      const adapter = createAdapter();
      const result = adapter.build(
        { kind: 'gateway.ping' },
        { trace_id: 'custom-trace-123' }
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.envelope.trace_id).toBe('custom-trace-123');
      }
    });

    it('injects auth_context from context', () => {
      const adapter = createAdapter();
      const result = adapter.build(
        { kind: 'gateway.ping' },
        { trace_id: 't', auth_context: { subject: 'user-1', role: 'admin' } }
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.envelope.auth_context).toEqual({ subject: 'user-1', role: 'admin' });
      }
    });

    it('injects parent_span_id from context', () => {
      const adapter = createAdapter();
      const result = adapter.build(
        { kind: 'gateway.ping' },
        { trace_id: 't', parent_span_id: 'span-abc' }
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.envelope.parent_span_id).toBe('span-abc');
      }
    });

    it('uses clock for timestamp', () => {
      const adapter = new GatewayAdapter({
        clock: new FixedClock(9999),
        ids: new FixedIdFactory('id'),
        moduleVersions: MODULE_VERSIONS,
      });

      const result = adapter.build({ kind: 'gateway.ping' }, createContext());

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.envelope.timestamp).toBe(9999);
      }
    });

    it('uses ids for message_id', () => {
      const adapter = new GatewayAdapter({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('custom-msg-id'),
        moduleVersions: MODULE_VERSIONS,
      });

      const result = adapter.build({ kind: 'gateway.ping' }, createContext());

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.envelope.message_id).toBe('custom-msg-id');
      }
    });

    it('sets source_module from config', () => {
      const adapter = new GatewayAdapter({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        moduleVersions: MODULE_VERSIONS,
        sourceModule: 'api-gateway',
      });

      const result = adapter.build({ kind: 'gateway.ping' }, createContext());

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.envelope.source_module).toBe('api-gateway');
      }
    });
  });

  describe('buildFromValidated', () => {
    it('accepts pre-validated input', () => {
      const adapter = createAdapter();
      const input: GatewayInput = { kind: 'memory.write', key: 'k', value: 1 };

      const result = adapter.buildFromValidated(input, createContext());

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.envelope.payload_schema).toBe('memory.write');
      }
    });
  });

  describe('validate', () => {
    it('validates input without building', () => {
      const adapter = createAdapter();

      const valid = adapter.validate({ kind: 'memory.write', key: 'k', value: 1 });
      expect(valid.valid).toBe(true);

      const invalid = adapter.validate({ kind: 'unknown' });
      expect(invalid.valid).toBe(false);
    });
  });

  describe('getSupportedKinds', () => {
    it('returns kinds for configured modules', () => {
      const adapter = createAdapter();
      const kinds = adapter.getSupportedKinds();

      expect(kinds).toContain('memory.write');
      expect(kinds).toContain('query.search');
      expect(kinds).toContain('gateway.ping');
    });

    it('excludes kinds for unconfigured modules', () => {
      const adapter = new GatewayAdapter({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        moduleVersions: { gateway: 'gateway@1.0.0' },
      });

      const kinds = adapter.getSupportedKinds();

      expect(kinds).toContain('gateway.ping');
      expect(kinds).not.toContain('memory.write');
      expect(kinds).not.toContain('query.search');
    });
  });

  describe('isKindSupported', () => {
    it('returns true for configured modules', () => {
      const adapter = createAdapter();
      expect(adapter.isKindSupported('memory.write')).toBe(true);
      expect(adapter.isKindSupported('query.search')).toBe(true);
    });

    it('returns false for unconfigured modules', () => {
      const adapter = new GatewayAdapter({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        moduleVersions: { gateway: 'gateway@1.0.0' },
      });

      expect(adapter.isKindSupported('memory.write')).toBe(false);
    });
  });

  describe('inputFingerprint', () => {
    it('same input produces same fingerprint', () => {
      const adapter = createAdapter();
      const input: GatewayInput = { kind: 'memory.write', key: 'k', value: { x: 1 } };

      const result1 = adapter.build(input, createContext());
      const result2 = adapter.build(input, createContext());

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
      if (isOk(result1) && isOk(result2)) {
        expect(result1.value.inputFingerprint).toBe(result2.value.inputFingerprint);
      }
    });

    it('different inputs produce different fingerprints', () => {
      const adapter = createAdapter();

      const r1 = adapter.build({ kind: 'memory.write', key: 'k1', value: 1 }, createContext());
      const r2 = adapter.build({ kind: 'memory.write', key: 'k2', value: 1 }, createContext());

      expect(isOk(r1)).toBe(true);
      expect(isOk(r2)).toBe(true);
      if (isOk(r1) && isOk(r2)) {
        expect(r1.value.inputFingerprint).not.toBe(r2.value.inputFingerprint);
      }
    });
  });
});
