// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS REPLAY GUARD
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-ORCH-04: Replay Guard
// @invariant INV-REPLAY-01: Key Required
// @invariant INV-REPLAY-02: Strategy Enforced
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReplayGuard,
  InMemoryReplayStore,
  createReplayGuard,
  createStrictReplayGuard,
  createIdempotentReplayGuard,
  ReplayErrorCodes,
} from '../src/orchestrator/replay_guard.js';
import type { NexusEnvelope } from '../src/types.js';
import { isOk, isErr } from '../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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
// TESTS IN-MEMORY STORE
// ═══════════════════════════════════════════════════════════════════════════════

describe('InMemoryReplayStore', () => {
  let store: InMemoryReplayStore;
  let time: number;
  let clock: { now: () => number };

  beforeEach(() => {
    time = 1000000; // Fixed time
    clock = { now: () => time };
    store = new InMemoryReplayStore(10000, 5 * 60 * 1000, clock);
  });

  describe('Basic operations', () => {
    it('stores and retrieves entries', () => {
      store.set('key1', { firstSeen: time, attempts: 1 });

      const entry = store.get('key1');
      expect(entry).toBeDefined();
      expect(entry!.firstSeen).toBe(time);
    });

    it('returns undefined for unknown key', () => {
      expect(store.get('unknown')).toBeUndefined();
    });

    it('has returns correct value', () => {
      store.set('key1', { firstSeen: time, attempts: 1 });

      expect(store.has('key1')).toBe(true);
      expect(store.has('key2')).toBe(false);
    });

    it('delete removes entry', () => {
      store.set('key1', { firstSeen: time, attempts: 1 });

      expect(store.delete('key1')).toBe(true);
      expect(store.has('key1')).toBe(false);
    });

    it('clear removes all entries', () => {
      store.set('key1', { firstSeen: time, attempts: 1 });
      store.set('key2', { firstSeen: time, attempts: 1 });

      store.clear();

      expect(store.size()).toBe(0);
    });
  });

  describe('TTL expiration', () => {
    it('expires entries after TTL', () => {
      const shortTtlStore = new InMemoryReplayStore(1000, 100, clock); // 100ms TTL

      shortTtlStore.set('key1', { firstSeen: time - 200, attempts: 1 }); // Created 200ms ago

      expect(shortTtlStore.get('key1')).toBeUndefined();
    });

    it('returns entry within TTL', () => {
      const shortTtlStore = new InMemoryReplayStore(1000, 100000, clock);

      shortTtlStore.set('key1', { firstSeen: time, attempts: 1 });

      expect(shortTtlStore.get('key1')).toBeDefined();
    });
  });

  describe('Max size eviction', () => {
    it('evicts oldest when max size reached', () => {
      const smallStore = new InMemoryReplayStore(3, 5 * 60 * 1000, clock);

      smallStore.set('key1', { firstSeen: time, attempts: 1 });
      smallStore.set('key2', { firstSeen: time + 1, attempts: 1 });
      smallStore.set('key3', { firstSeen: time + 2, attempts: 1 });
      smallStore.set('key4', { firstSeen: time + 3, attempts: 1 });

      expect(smallStore.size()).toBe(3);
      expect(smallStore.has('key1')).toBe(false); // Evicted
      expect(smallStore.has('key4')).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS REPLAY GUARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('ReplayGuard', () => {
  describe('INV-REPLAY-01: Key Required', () => {
    it('rejects missing replay_protection_key', () => {
      const guard = createStrictReplayGuard();
      const env = createEnvelope({ replay_protection_key: '' });

      const result = guard.check(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe(ReplayErrorCodes.NO_KEY);
      }
    });

    it('rejects undefined replay_protection_key', () => {
      const guard = createStrictReplayGuard();
      const env = createEnvelope();
      (env as any).replay_protection_key = undefined;

      const result = guard.check(env);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('Strict strategy (reject duplicates)', () => {
    let guard: ReplayGuard;

    beforeEach(() => {
      guard = createStrictReplayGuard();
    });

    it('allows new message', () => {
      const env = createEnvelope({ replay_protection_key: 'unique-key-1' });

      const result = guard.check(env);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('new');
      }
    });

    it('INV-ORCH-04: rejects duplicate message', () => {
      const env = createEnvelope({ replay_protection_key: 'dup-key' });

      guard.record(env.replay_protection_key);
      const result = guard.check(env);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.error_code).toBe(ReplayErrorCodes.DUPLICATE);
      }
    });

    it('checkAndRecord atomically checks and records', () => {
      const env = createEnvelope({ replay_protection_key: 'atomic-key' });

      const result1 = guard.checkAndRecord(env);
      expect(isOk(result1)).toBe(true);
      if (isOk(result1)) {
        expect(result1.value.status).toBe('new');
      }

      const result2 = guard.checkAndRecord(env);
      expect(isErr(result2)).toBe(true);
    });
  });

  describe('Idempotent strategy (return cached)', () => {
    let guard: ReplayGuard;

    beforeEach(() => {
      guard = new ReplayGuard(new InMemoryReplayStore(), {
        defaultStrategy: 'idempotent',
      });
    });

    it('returns cached result for duplicate', () => {
      const env = createEnvelope({ replay_protection_key: 'idem-key' });

      // First call
      guard.record(env.replay_protection_key, { cachedValue: 42 });
      guard.updateCachedResult(env.replay_protection_key, { cachedValue: 42 });

      // Second call
      const result = guard.check(env);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('duplicate_idempotent');
        if (result.value.status === 'duplicate_idempotent') {
          expect(result.value.cachedResult).toEqual({ cachedValue: 42 });
        }
      }
    });
  });

  describe('Allow strategy (permit duplicates)', () => {
    let guard: ReplayGuard;

    beforeEach(() => {
      guard = new ReplayGuard(new InMemoryReplayStore(), {
        defaultStrategy: 'allow',
      });
    });

    it('allows duplicate with status duplicate_allowed', () => {
      const env = createEnvelope({ replay_protection_key: 'allow-key' });

      guard.record(env.replay_protection_key);
      const result = guard.check(env);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('duplicate_allowed');
      }
    });
  });

  describe('INV-REPLAY-02: Strategy by schema', () => {
    it('uses schema-specific strategy', () => {
      const guard = new ReplayGuard(new InMemoryReplayStore(), {
        defaultStrategy: 'reject',
        schemaStrategies: new Map([
          ['query.search', 'idempotent'],
        ]),
      });

      const queryEnv = createEnvelope({
        replay_protection_key: 'query-key',
        payload_schema: 'query.search',
      });

      guard.record(queryEnv.replay_protection_key, { results: [] });
      guard.updateCachedResult(queryEnv.replay_protection_key, { results: [] });

      const result = guard.check(queryEnv);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('duplicate_idempotent');
      }
    });
  });

  describe('Strategy by kind', () => {
    it('uses kind-specific strategy', () => {
      const guard = createIdempotentReplayGuard();

      // Query should be idempotent
      const queryEnv = createEnvelope({
        replay_protection_key: 'kind-query',
        kind: 'query',
      });

      guard.record(queryEnv.replay_protection_key, { data: 1 });
      guard.updateCachedResult(queryEnv.replay_protection_key, { data: 1 });

      const queryResult = guard.check(queryEnv);
      expect(isOk(queryResult)).toBe(true);
      if (isOk(queryResult)) {
        expect(queryResult.value.status).toBe('duplicate_idempotent');
      }

      // Command should be rejected
      const cmdEnv = createEnvelope({
        replay_protection_key: 'kind-cmd',
        kind: 'command',
      });

      guard.record(cmdEnv.replay_protection_key);

      const cmdResult = guard.check(cmdEnv);
      expect(isErr(cmdResult)).toBe(true);
    });
  });

  describe('updateCachedResult', () => {
    it('updates cached result for existing entry', () => {
      const guard = new ReplayGuard(new InMemoryReplayStore(), {
        defaultStrategy: 'idempotent',
      });

      const env = createEnvelope({ replay_protection_key: 'update-key' });

      guard.record(env.replay_protection_key);
      guard.updateCachedResult(env.replay_protection_key, { updated: true });

      const result = guard.check(env);

      expect(isOk(result)).toBe(true);
      if (isOk(result) && result.value.status === 'duplicate_idempotent') {
        expect(result.value.cachedResult).toEqual({ updated: true });
      }
    });
  });
});
