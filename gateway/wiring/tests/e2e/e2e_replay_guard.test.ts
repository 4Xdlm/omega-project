// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — E2E TESTS: REPLAY GUARD WITH PROOF CRYSTAL
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { FixedClock } from '../../src/clock.js';
import { HandlerRegistry } from '../../src/orchestrator/registry.js';
import { Orchestrator, createOrchestrator } from '../../src/orchestrator/orchestrator.js';
import { InMemoryChronicle } from '../../src/orchestrator/chronicle.js';
import { ReplayGuard, InMemoryReplayStore } from '../../src/orchestrator/replay_guard.js';
import type { NexusEnvelope, NexusHandler } from '../../src/types.js';
import { isOk, isErr } from '../../src/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createValidEnvelope(overrides: Partial<NexusEnvelope> = {}): NexusEnvelope {
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
    replay_protection_key: `rpk-${Date.now()}-${Math.random()}`,
    payload: { key: 'test', value: 42 },
    ...overrides,
  };
}

function createMockHandler(): NexusHandler {
  let callCount = 0;
  return {
    canHandle: () => true,
    handle: async () => ({ ok: true, value: { result: ++callCount } }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('E2E — Replay Guard (Integration)', () => {
  const MEMORY_VERSION = 'memory@3.21.0';

  let clock: FixedClock;
  let registry: HandlerRegistry;
  let chronicle: InMemoryChronicle;
  let replayStore: InMemoryReplayStore;
  let replayGuard: ReplayGuard;
  let orchestrator: Orchestrator;
  let mockHandler: NexusHandler;

  beforeEach(() => {
    clock = new FixedClock(1704499200000);
    registry = new HandlerRegistry();
    chronicle = new InMemoryChronicle();
    replayStore = new InMemoryReplayStore();
    replayGuard = new ReplayGuard(replayStore, { defaultStrategy: 'reject' });
    mockHandler = createMockHandler();

    registry.register('memory', MEMORY_VERSION, mockHandler, {
      schemas: ['memory.write'],
      kinds: ['command'],
    });

    orchestrator = createOrchestrator({
      clock,
      registry,
      chronicle,
      replayGuard,
    });
  });

  describe('INV-ORCH-04: Replay Guard Protection', () => {
    it('accepts first message with unique replay key', async () => {
      const env = createValidEnvelope({ replay_protection_key: 'unique-key-1' });

      const result = await orchestrator.dispatch(env);

      expect(isOk(result.result)).toBe(true);
    });

    it('rejects duplicate message with same replay key', async () => {
      const env = createValidEnvelope({ replay_protection_key: 'duplicate-key' });

      // First dispatch - should succeed
      const result1 = await orchestrator.dispatch(env);
      expect(isOk(result1.result)).toBe(true);

      // Second dispatch with same key - should fail
      const result2 = await orchestrator.dispatch(env);
      expect(isErr(result2.result)).toBe(true);
      if (isErr(result2.result)) {
        expect(result2.result.error.error_code).toBe('ORCH_REPLAY_REJECTED');
      }
    });

    it('accepts messages with different replay keys', async () => {
      const env1 = createValidEnvelope({ replay_protection_key: 'key-1' });
      const env2 = createValidEnvelope({ replay_protection_key: 'key-2' });
      const env3 = createValidEnvelope({ replay_protection_key: 'key-3' });

      const results = await Promise.all([
        orchestrator.dispatch(env1),
        orchestrator.dispatch(env2),
        orchestrator.dispatch(env3),
      ]);

      for (const result of results) {
        expect(isOk(result.result)).toBe(true);
      }
    });

    it('records replay rejection in chronicle', async () => {
      const env = createValidEnvelope({ replay_protection_key: 'chronicle-test-key' });

      await orchestrator.dispatch(env);
      await orchestrator.dispatch(env); // Replay

      const records = chronicle.snapshot();
      const replayRejections = records.filter(r => r.event_type === 'REPLAY_REJECTED');

      expect(replayRejections.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Replay key uniqueness', () => {
    it('handles high-volume unique keys', async () => {
      const N = 100;
      const results = [];

      for (let i = 0; i < N; i++) {
        const env = createValidEnvelope({ replay_protection_key: `bulk-key-${i}` });
        results.push(await orchestrator.dispatch(env));
      }

      const successCount = results.filter(r => isOk(r.result)).length;
      expect(successCount).toBe(N);
    });

    it('detects duplicate in high-volume batch', async () => {
      const keys = ['k1', 'k2', 'k3', 'k2', 'k4', 'k5', 'k1']; // k2 and k1 are duplicates
      const results = [];

      for (const key of keys) {
        const env = createValidEnvelope({ replay_protection_key: key });
        results.push(await orchestrator.dispatch(env));
      }

      const successCount = results.filter(r => isOk(r.result)).length;
      const failCount = results.filter(r => isErr(r.result)).length;

      expect(successCount).toBe(5); // k1, k2, k3, k4, k5
      expect(failCount).toBe(2); // duplicate k2, duplicate k1
    });
  });

  describe('Idempotent replay strategy', () => {
    it('returns cached result for idempotent operations', async () => {
      const idempotentStore = new InMemoryReplayStore();
      const idempotentGuard = new ReplayGuard(idempotentStore, { defaultStrategy: 'idempotent' });
      
      const handler: NexusHandler = {
        canHandle: () => true,
        handle: async () => ({ ok: true, value: { cached: 'original-value' } }),
      };

      registry.register('memory', 'memory@idem', handler, {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      const idempotentOrch = createOrchestrator({
        clock,
        registry,
        chronicle: new InMemoryChronicle(),
        replayGuard: idempotentGuard,
      });

      const env = createValidEnvelope({
        replay_protection_key: 'idempotent-key',
        module_version: 'memory@idem',
      });

      const result1 = await idempotentOrch.dispatch(env);
      expect(isOk(result1.result)).toBe(true);

      const result2 = await idempotentOrch.dispatch(env);
      expect(isOk(result2.result)).toBe(true);

      // Both should return the same cached value
      if (isOk(result1.result) && isOk(result2.result)) {
        expect(result2.result.value).toEqual(result1.result.value);
      }
    });
  });

  describe('Replay key requirements', () => {
    it('rejects envelope without replay_protection_key', async () => {
      const env = createValidEnvelope();
      delete (env as any).replay_protection_key;

      const result = await orchestrator.dispatch(env);

      // Should fail validation or replay guard
      expect(isErr(result.result)).toBe(true);
    });

    it('rejects envelope with empty replay_protection_key', async () => {
      const env = createValidEnvelope({ replay_protection_key: '' });

      const result = await orchestrator.dispatch(env);

      expect(isErr(result.result)).toBe(true);
    });
  });
});
