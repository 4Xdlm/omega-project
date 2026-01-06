// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS ENVELOPE
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-ENV-01: message_id obligatoire et unique
// @invariant INV-ENV-02: timestamp via Clock injectable
// @invariant INV-ENV-03: payload_schema + payload_version obligatoires
// @invariant INV-ENV-04: champs hors contrat = rejet
// @invariant INV-ENV-05: même input → même replay_protection_key
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  buildEnvelope,
  validateEnvelopeStrict,
  validateEnvelopeLenient,
  parsePayloadSchema,
  buildPayloadSchema,
  isSameReplayKey,
  computeReplayKey,
  verifyReplayKey,
} from '../src/envelope.js';
import { FixedClock } from '../src/clock.js';
import { FixedIdFactory, SequentialIdFactory } from '../src/id_factory.js';
import type { NexusEnvelope } from '../src/types.js';
import { isOk, isErr } from '../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createMinimalValidEnvelope(overrides: Partial<NexusEnvelope> = {}): NexusEnvelope {
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
    replay_protection_key: 'abc123',
    payload: { key: 'test', value: 42 },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS buildEnvelope
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildEnvelope', () => {
  describe('INV-ENV-01: message_id obligatoire', () => {
    it('includes message_id from IdFactory', () => {
      const env = buildEnvelope({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('unique-id-123'),
        trace_id: 'trace-1',
        source_module: 'gateway',
        target_module: 'memory',
        kind: 'command',
        payload_schema: 'memory.write',
        payload_version: 'v1.0.0',
        module_version: 'memory@3.21.0',
        payload: {},
      });
      expect(env.message_id).toBe('unique-id-123');
    });

    it('message_id is never empty', () => {
      const env = buildEnvelope({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('x'),
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'query',
        payload_schema: 'b.action',
        payload_version: 'v1',
        module_version: 'b@1',
        payload: null,
      });
      expect(env.message_id.length).toBeGreaterThan(0);
    });
  });

  describe('INV-ENV-02: timestamp via Clock', () => {
    it('uses injected Clock for timestamp', () => {
      const clock = new FixedClock(1704499200000);
      const env = buildEnvelope({
        clock,
        ids: new FixedIdFactory('id'),
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'event',
        payload_schema: 'b.evt',
        payload_version: 'v1',
        module_version: 'b@1',
        payload: {},
      });
      expect(env.timestamp).toBe(1704499200000);
    });

    it('different clocks produce different timestamps', () => {
      const ids = new SequentialIdFactory();
      
      const env1 = buildEnvelope({
        clock: new FixedClock(1000),
        ids,
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'command',
        payload_schema: 'b.x',
        payload_version: 'v1',
        module_version: 'b@1',
        payload: {},
      });

      const env2 = buildEnvelope({
        clock: new FixedClock(2000),
        ids,
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'command',
        payload_schema: 'b.x',
        payload_version: 'v1',
        module_version: 'b@1',
        payload: {},
      });

      expect(env1.timestamp).toBe(1000);
      expect(env2.timestamp).toBe(2000);
    });
  });

  describe('INV-ENV-05: replay_protection_key determinism', () => {
    it('same logical input produces same replay_protection_key', () => {
      // Two envelopes with different message_id and timestamp
      // but same "logical content" should have same replay_protection_key
      const env1 = buildEnvelope({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id-1'),
        trace_id: 'trace-001',
        source_module: 'gateway',
        target_module: 'memory',
        kind: 'command',
        payload_schema: 'memory.write',
        payload_version: 'v1.0.0',
        module_version: 'memory@3.21.0',
        payload: { key: 'k', value: { b: 2, a: 1 } },
        expected_previous_hash: 'prev123',
      });

      const env2 = buildEnvelope({
        clock: new FixedClock(9999),  // Different timestamp
        ids: new FixedIdFactory('id-2'),  // Different message_id
        trace_id: 'trace-001',
        source_module: 'gateway',
        target_module: 'memory',
        kind: 'command',
        payload_schema: 'memory.write',
        payload_version: 'v1.0.0',
        module_version: 'memory@3.21.0',
        payload: { key: 'k', value: { a: 1, b: 2 } },  // Different key order
        expected_previous_hash: 'prev123',
      });

      expect(env1.replay_protection_key).toBe(env2.replay_protection_key);
    });

    it('different payload produces different replay_protection_key', () => {
      const base = {
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'command' as const,
        payload_schema: 'b.x',
        payload_version: 'v1',
        module_version: 'b@1',
      };

      const env1 = buildEnvelope({ ...base, payload: { x: 1 } });
      const env2 = buildEnvelope({ ...base, payload: { x: 2 } });

      expect(env1.replay_protection_key).not.toBe(env2.replay_protection_key);
    });

    it('100 runs produce identical replay_protection_key', () => {
      const args = {
        clock: new FixedClock(42),
        ids: new FixedIdFactory('fixed'),
        trace_id: 'trace',
        source_module: 'src',
        target_module: 'tgt',
        kind: 'command' as const,
        payload_schema: 'tgt.action',
        payload_version: 'v1.0.0',
        module_version: 'tgt@1.0.0',
        payload: { complex: { nested: [1, 2, 3] } },
      };

      const first = buildEnvelope(args);
      for (let i = 0; i < 100; i++) {
        const env = buildEnvelope(args);
        expect(env.replay_protection_key).toBe(first.replay_protection_key);
      }
    });
  });

  describe('optional fields', () => {
    it('includes parent_span_id when provided', () => {
      const env = buildEnvelope({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'command',
        payload_schema: 'b.x',
        payload_version: 'v1',
        module_version: 'b@1',
        payload: {},
        parent_span_id: 'span-123',
      });
      expect(env.parent_span_id).toBe('span-123');
    });

    it('includes auth_context when provided', () => {
      const auth = { subject: 'user-1', role: 'admin', scope: ['read', 'write'] };
      const env = buildEnvelope({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'command',
        payload_schema: 'b.x',
        payload_version: 'v1',
        module_version: 'b@1',
        payload: {},
        auth_context: auth,
      });
      expect(env.auth_context).toEqual(auth);
    });

    it('includes expected_previous_hash when provided', () => {
      const env = buildEnvelope({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'command',
        payload_schema: 'b.x',
        payload_version: 'v1',
        module_version: 'b@1',
        payload: {},
        expected_previous_hash: 'hash-abc',
      });
      expect(env.expected_previous_hash).toBe('hash-abc');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS validateEnvelopeStrict
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateEnvelopeStrict', () => {
  describe('INV-ENV-04: strict contract', () => {
    it('rejects unknown fields', () => {
      const env = { ...createMinimalValidEnvelope(), unknown_field: 'value' };
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('ENV_UNKNOWN_FIELD');
      }
    });

    it('rejects multiple unknown fields', () => {
      const env = { ...createMinimalValidEnvelope(), extra1: 1, extra2: 2 };
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });

    it('accepts all allowed fields', () => {
      const env = createMinimalValidEnvelope({
        parent_span_id: 'span',
        auth_context: { subject: 'user' },
        expected_previous_hash: 'hash',
      });
      const result = validateEnvelopeStrict(env);
      expect(isOk(result)).toBe(true);
    });
  });

  describe('INV-ENV-03: required fields', () => {
    it('rejects missing message_id', () => {
      const env = createMinimalValidEnvelope();
      delete (env as any).message_id;
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });

    it('rejects empty message_id', () => {
      const env = createMinimalValidEnvelope({ message_id: '' });
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });

    it('rejects whitespace-only message_id', () => {
      const env = createMinimalValidEnvelope({ message_id: '   ' });
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });

    it('rejects missing payload_schema', () => {
      const env = createMinimalValidEnvelope();
      delete (env as any).payload_schema;
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });

    it('rejects payload_schema without dot', () => {
      const env = createMinimalValidEnvelope({ payload_schema: 'nodot' });
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('ENV_BAD_SCHEMA');
      }
    });

    it('accepts payload_schema with dot', () => {
      const env = createMinimalValidEnvelope({ payload_schema: 'module.action' });
      const result = validateEnvelopeStrict(env);
      expect(isOk(result)).toBe(true);
    });
  });

  describe('timestamp validation', () => {
    it('rejects non-number timestamp', () => {
      const env = createMinimalValidEnvelope();
      (env as any).timestamp = 'not a number';
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });

    it('rejects NaN timestamp', () => {
      const env = createMinimalValidEnvelope({ timestamp: NaN });
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });

    it('rejects Infinity timestamp', () => {
      const env = createMinimalValidEnvelope({ timestamp: Infinity });
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });

    it('accepts zero timestamp', () => {
      const env = createMinimalValidEnvelope({ timestamp: 0 });
      const result = validateEnvelopeStrict(env);
      expect(isOk(result)).toBe(true);
    });
  });

  describe('kind validation', () => {
    it('accepts command kind', () => {
      const env = createMinimalValidEnvelope({ kind: 'command' });
      expect(isOk(validateEnvelopeStrict(env))).toBe(true);
    });

    it('accepts query kind', () => {
      const env = createMinimalValidEnvelope({ kind: 'query' });
      expect(isOk(validateEnvelopeStrict(env))).toBe(true);
    });

    it('accepts event kind', () => {
      const env = createMinimalValidEnvelope({ kind: 'event' });
      expect(isOk(validateEnvelopeStrict(env))).toBe(true);
    });

    it('rejects invalid kind', () => {
      const env = createMinimalValidEnvelope({ kind: 'invalid' as any });
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe('ENV_BAD_KIND');
      }
    });
  });

  describe('replay_protection_key validation', () => {
    it('rejects missing replay_protection_key', () => {
      const env = createMinimalValidEnvelope();
      delete (env as any).replay_protection_key;
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });

    it('rejects empty replay_protection_key', () => {
      const env = createMinimalValidEnvelope({ replay_protection_key: '' });
      const result = validateEnvelopeStrict(env);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('rejects null', () => {
      expect(isErr(validateEnvelopeStrict(null))).toBe(true);
    });

    it('rejects undefined', () => {
      expect(isErr(validateEnvelopeStrict(undefined))).toBe(true);
    });

    it('rejects array', () => {
      expect(isErr(validateEnvelopeStrict([]))).toBe(true);
    });

    it('rejects primitive', () => {
      expect(isErr(validateEnvelopeStrict('string'))).toBe(true);
      expect(isErr(validateEnvelopeStrict(42))).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Envelope helpers', () => {
  describe('parsePayloadSchema', () => {
    it('parses valid schema', () => {
      const result = parsePayloadSchema('memory.write');
      expect(result).toEqual({ module: 'memory', action: 'write' });
    });

    it('returns null for invalid schema', () => {
      expect(parsePayloadSchema('nodot')).toBe(null);
      expect(parsePayloadSchema('too.many.dots')).toBe(null);
      expect(parsePayloadSchema('')).toBe(null);
    });
  });

  describe('buildPayloadSchema', () => {
    it('builds schema from parts', () => {
      expect(buildPayloadSchema('memory', 'write')).toBe('memory.write');
      expect(buildPayloadSchema('query', 'search')).toBe('query.search');
    });
  });

  describe('isSameReplayKey', () => {
    it('returns true for same key', () => {
      const a = createMinimalValidEnvelope({ replay_protection_key: 'same' });
      const b = createMinimalValidEnvelope({ replay_protection_key: 'same' });
      expect(isSameReplayKey(a, b)).toBe(true);
    });

    it('returns false for different key', () => {
      const a = createMinimalValidEnvelope({ replay_protection_key: 'key1' });
      const b = createMinimalValidEnvelope({ replay_protection_key: 'key2' });
      expect(isSameReplayKey(a, b)).toBe(false);
    });
  });

  describe('verifyReplayKey', () => {
    it('returns true for valid envelope', () => {
      const env = buildEnvelope({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'command',
        payload_schema: 'b.x',
        payload_version: 'v1',
        module_version: 'b@1',
        payload: { test: true },
      });
      expect(verifyReplayKey(env)).toBe(true);
    });

    it('returns false for tampered envelope', () => {
      const env = buildEnvelope({
        clock: new FixedClock(1000),
        ids: new FixedIdFactory('id'),
        trace_id: 't',
        source_module: 'a',
        target_module: 'b',
        kind: 'command',
        payload_schema: 'b.x',
        payload_version: 'v1',
        module_version: 'b@1',
        payload: { test: true },
      });
      
      // Tamper with payload
      (env.payload as any).test = false;
      expect(verifyReplayKey(env)).toBe(false);
    });
  });
});
