// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS GATEWAY SCHEMAS
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-GW-02: Schema Determinism - même input → même schema
// @invariant INV-GW-05: Rejection Strict - input inconnu → erreur
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  mapToEnvelopeSpec,
  validateGatewayInput,
  GATEWAY_INPUT_KINDS,
  GatewayValidationCodes,
  isMemoryKind,
  isQueryKind,
  isGatewayKind,
} from '../src/adapters/gateway_schemas.js';
import type { GatewayInput, GatewayInputKind } from '../src/adapters/gateway_schemas.js';

describe('Gateway Schemas', () => {
  describe('mapToEnvelopeSpec', () => {
    describe('Memory operations', () => {
      it('maps memory.write correctly', () => {
        const input: GatewayInput = { kind: 'memory.write', key: 'mykey', value: { data: 42 } };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.target_module).toBe('memory');
        expect(spec.payload_schema).toBe('memory.write');
        expect(spec.payload_version).toBe('v1.0.0');
        expect(spec.nexus_kind).toBe('command');
        expect(spec.payload).toEqual({ key: 'mykey', value: { data: 42 } });
      });

      it('maps memory.readLatest correctly', () => {
        const input: GatewayInput = { kind: 'memory.readLatest', key: 'mykey' };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.target_module).toBe('memory');
        expect(spec.payload_schema).toBe('memory.readLatest');
        expect(spec.nexus_kind).toBe('query');
        expect(spec.payload).toEqual({ key: 'mykey' });
      });

      it('maps memory.readByHash correctly', () => {
        const input: GatewayInput = { kind: 'memory.readByHash', hash: 'abc123' };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.payload_schema).toBe('memory.readByHash');
        expect(spec.payload).toEqual({ hash: 'abc123' });
      });

      it('maps memory.listKeys correctly', () => {
        const input: GatewayInput = { kind: 'memory.listKeys', prefix: 'user:' };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.payload_schema).toBe('memory.listKeys');
        expect(spec.payload).toEqual({ prefix: 'user:' });
      });

      it('memory.listKeys with undefined prefix', () => {
        const input: GatewayInput = { kind: 'memory.listKeys' };
        const spec = mapToEnvelopeSpec(input);

        // undefined est filtré, donc payload est vide
        expect(spec.payload).toEqual({});
      });
    });

    describe('Query operations', () => {
      it('maps query.search correctly', () => {
        const input: GatewayInput = { kind: 'query.search', query: 'test', limit: 10, offset: 5 };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.target_module).toBe('query');
        expect(spec.payload_schema).toBe('query.search');
        expect(spec.nexus_kind).toBe('query');
        expect(spec.payload).toEqual({ query: 'test', limit: 10, offset: 5 });
      });

      it('maps query.find correctly', () => {
        const input: GatewayInput = { kind: 'query.find', filters: { status: 'active' }, limit: 20 };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.payload_schema).toBe('query.find');
        expect(spec.payload).toEqual({ filters: { status: 'active' }, limit: 20 });
      });

      it('maps query.aggregate correctly', () => {
        const input: GatewayInput = { kind: 'query.aggregate', field: 'price', operation: 'avg' };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.payload_schema).toBe('query.aggregate');
        expect(spec.payload).toEqual({ field: 'price', operation: 'avg' });
      });

      it('maps query.analyze correctly', () => {
        const input: GatewayInput = { kind: 'query.analyze', text: 'find all users' };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.payload_schema).toBe('query.analyze');
        expect(spec.payload).toEqual({ text: 'find all users' });
      });
    });

    describe('Gateway operations', () => {
      it('maps gateway.ping correctly', () => {
        const input: GatewayInput = { kind: 'gateway.ping' };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.target_module).toBe('gateway');
        expect(spec.payload_schema).toBe('gateway.ping');
        expect(spec.nexus_kind).toBe('query');
        expect(spec.payload).toEqual({});
      });

      it('maps gateway.status correctly', () => {
        const input: GatewayInput = { kind: 'gateway.status' };
        const spec = mapToEnvelopeSpec(input);

        expect(spec.payload_schema).toBe('gateway.status');
        expect(spec.payload).toEqual({});
      });
    });

    describe('INV-GW-02: Determinism', () => {
      it('same input produces identical spec 100 times', () => {
        const input: GatewayInput = { kind: 'memory.write', key: 'k', value: { nested: { x: 1 } } };
        
        const first = mapToEnvelopeSpec(input);
        for (let i = 0; i < 100; i++) {
          const spec = mapToEnvelopeSpec(input);
          expect(spec).toEqual(first);
        }
      });

      it('all kinds have deterministic mapping', () => {
        const inputs: GatewayInput[] = [
          { kind: 'memory.write', key: 'k', value: 1 },
          { kind: 'memory.readLatest', key: 'k' },
          { kind: 'memory.readByHash', hash: 'h' },
          { kind: 'memory.listKeys' },
          { kind: 'query.search', query: 'q' },
          { kind: 'query.find', filters: {} },
          { kind: 'query.aggregate', field: 'f', operation: 'count' },
          { kind: 'query.analyze', text: 't' },
          { kind: 'gateway.ping' },
          { kind: 'gateway.status' },
        ];

        for (const input of inputs) {
          const spec1 = mapToEnvelopeSpec(input);
          const spec2 = mapToEnvelopeSpec(input);
          expect(spec1).toEqual(spec2);
        }
      });
    });
  });

  describe('validateGatewayInput', () => {
    describe('Valid inputs', () => {
      it('validates memory.write', () => {
        const result = validateGatewayInput({ kind: 'memory.write', key: 'k', value: 1 });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.value.kind).toBe('memory.write');
        }
      });

      it('validates memory.readLatest', () => {
        const result = validateGatewayInput({ kind: 'memory.readLatest', key: 'k' });
        expect(result.valid).toBe(true);
      });

      it('validates memory.readByHash', () => {
        const result = validateGatewayInput({ kind: 'memory.readByHash', hash: 'h' });
        expect(result.valid).toBe(true);
      });

      it('validates memory.listKeys with prefix', () => {
        const result = validateGatewayInput({ kind: 'memory.listKeys', prefix: 'p' });
        expect(result.valid).toBe(true);
      });

      it('validates memory.listKeys without prefix', () => {
        const result = validateGatewayInput({ kind: 'memory.listKeys' });
        expect(result.valid).toBe(true);
      });

      it('validates query.search', () => {
        const result = validateGatewayInput({ kind: 'query.search', query: 'test' });
        expect(result.valid).toBe(true);
      });

      it('validates query.search with optional fields', () => {
        const result = validateGatewayInput({ kind: 'query.search', query: 'test', limit: 10, offset: 5 });
        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.value).toEqual({ kind: 'query.search', query: 'test', limit: 10, offset: 5 });
        }
      });

      it('validates query.find', () => {
        const result = validateGatewayInput({ kind: 'query.find', filters: { a: 1 } });
        expect(result.valid).toBe(true);
      });

      it('validates query.aggregate with all operations', () => {
        const ops = ['count', 'sum', 'avg', 'min', 'max'] as const;
        for (const operation of ops) {
          const result = validateGatewayInput({ kind: 'query.aggregate', field: 'f', operation });
          expect(result.valid).toBe(true);
        }
      });

      it('validates query.analyze', () => {
        const result = validateGatewayInput({ kind: 'query.analyze', text: 'analyze this' });
        expect(result.valid).toBe(true);
      });

      it('validates gateway.ping', () => {
        const result = validateGatewayInput({ kind: 'gateway.ping' });
        expect(result.valid).toBe(true);
      });

      it('validates gateway.status', () => {
        const result = validateGatewayInput({ kind: 'gateway.status' });
        expect(result.valid).toBe(true);
      });
    });

    describe('INV-GW-05: Invalid inputs rejected', () => {
      it('rejects null', () => {
        const result = validateGatewayInput(null);
        expect(result.valid).toBe(false);
      });

      it('rejects undefined', () => {
        const result = validateGatewayInput(undefined);
        expect(result.valid).toBe(false);
      });

      it('rejects non-object', () => {
        expect(validateGatewayInput('string').valid).toBe(false);
        expect(validateGatewayInput(123).valid).toBe(false);
        expect(validateGatewayInput([]).valid).toBe(false);
      });

      it('rejects missing kind', () => {
        const result = validateGatewayInput({ key: 'k', value: 1 });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.code).toBe(GatewayValidationCodes.MISSING_KIND);
        }
      });

      it('rejects unknown kind', () => {
        const result = validateGatewayInput({ kind: 'unknown.operation' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.code).toBe(GatewayValidationCodes.INVALID_KIND);
        }
      });

      it('rejects memory.write without key', () => {
        const result = validateGatewayInput({ kind: 'memory.write', value: 1 });
        expect(result.valid).toBe(false);
      });

      it('rejects memory.write with empty key', () => {
        const result = validateGatewayInput({ kind: 'memory.write', key: '', value: 1 });
        expect(result.valid).toBe(false);
      });

      it('rejects memory.readLatest without key', () => {
        const result = validateGatewayInput({ kind: 'memory.readLatest' });
        expect(result.valid).toBe(false);
      });

      it('rejects memory.readByHash without hash', () => {
        const result = validateGatewayInput({ kind: 'memory.readByHash' });
        expect(result.valid).toBe(false);
      });

      it('rejects query.search without query', () => {
        const result = validateGatewayInput({ kind: 'query.search' });
        expect(result.valid).toBe(false);
      });

      it('rejects query.find without filters', () => {
        const result = validateGatewayInput({ kind: 'query.find' });
        expect(result.valid).toBe(false);
      });

      it('rejects query.find with null filters', () => {
        const result = validateGatewayInput({ kind: 'query.find', filters: null });
        expect(result.valid).toBe(false);
      });

      it('rejects query.aggregate without field', () => {
        const result = validateGatewayInput({ kind: 'query.aggregate', operation: 'count' });
        expect(result.valid).toBe(false);
      });

      it('rejects query.aggregate with invalid operation', () => {
        const result = validateGatewayInput({ kind: 'query.aggregate', field: 'f', operation: 'invalid' });
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.code).toBe(GatewayValidationCodes.INVALID_FIELD);
        }
      });

      it('rejects query.analyze without text', () => {
        const result = validateGatewayInput({ kind: 'query.analyze' });
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('GATEWAY_INPUT_KINDS', () => {
    it('contains all 10 kinds', () => {
      expect(GATEWAY_INPUT_KINDS.length).toBe(10);
    });

    it('includes all memory kinds', () => {
      expect(GATEWAY_INPUT_KINDS).toContain('memory.write');
      expect(GATEWAY_INPUT_KINDS).toContain('memory.readLatest');
      expect(GATEWAY_INPUT_KINDS).toContain('memory.readByHash');
      expect(GATEWAY_INPUT_KINDS).toContain('memory.listKeys');
    });

    it('includes all query kinds', () => {
      expect(GATEWAY_INPUT_KINDS).toContain('query.search');
      expect(GATEWAY_INPUT_KINDS).toContain('query.find');
      expect(GATEWAY_INPUT_KINDS).toContain('query.aggregate');
      expect(GATEWAY_INPUT_KINDS).toContain('query.analyze');
    });

    it('includes all gateway kinds', () => {
      expect(GATEWAY_INPUT_KINDS).toContain('gateway.ping');
      expect(GATEWAY_INPUT_KINDS).toContain('gateway.status');
    });
  });

  describe('Kind helpers', () => {
    describe('isMemoryKind', () => {
      it('returns true for memory kinds', () => {
        expect(isMemoryKind('memory.write')).toBe(true);
        expect(isMemoryKind('memory.readLatest')).toBe(true);
        expect(isMemoryKind('memory.readByHash')).toBe(true);
        expect(isMemoryKind('memory.listKeys')).toBe(true);
      });

      it('returns false for non-memory kinds', () => {
        expect(isMemoryKind('query.search')).toBe(false);
        expect(isMemoryKind('gateway.ping')).toBe(false);
      });
    });

    describe('isQueryKind', () => {
      it('returns true for query kinds', () => {
        expect(isQueryKind('query.search')).toBe(true);
        expect(isQueryKind('query.find')).toBe(true);
        expect(isQueryKind('query.aggregate')).toBe(true);
        expect(isQueryKind('query.analyze')).toBe(true);
      });

      it('returns false for non-query kinds', () => {
        expect(isQueryKind('memory.write')).toBe(false);
        expect(isQueryKind('gateway.status')).toBe(false);
      });
    });

    describe('isGatewayKind', () => {
      it('returns true for gateway kinds', () => {
        expect(isGatewayKind('gateway.ping')).toBe(true);
        expect(isGatewayKind('gateway.status')).toBe(true);
      });

      it('returns false for non-gateway kinds', () => {
        expect(isGatewayKind('memory.write')).toBe(false);
        expect(isGatewayKind('query.search')).toBe(false);
      });
    });
  });
});
