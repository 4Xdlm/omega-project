// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS ORCHESTRATOR
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// INVARIANTS TESTÉS:
// @invariant INV-ORCH-01: Single Entry Point
// @invariant INV-ORCH-02: Strict Validation
// @invariant INV-ORCH-03: Policy First
// @invariant INV-ORCH-04: Replay Guard
// @invariant INV-ORCH-05: Version Pinned Registry
// @invariant INV-ORCH-06: Chronicle Completeness
// @invariant INV-ORCH-07: Error Coding
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Orchestrator,
  createOrchestrator,
  OrchestratorErrorCodes,
  CircuitBreaker,
} from '../src/orchestrator/orchestrator.js';
import { HandlerRegistry } from '../src/orchestrator/registry.js';
import { InMemoryChronicle } from '../src/orchestrator/chronicle.js';
import { ReplayGuard, InMemoryReplayStore } from '../src/orchestrator/replay_guard.js';
import { PolicyEngine } from '../src/policy.js';
import { FixedClock } from '../src/clock.js';
import type { NexusEnvelope, NexusHandler, NexusResult } from '../src/types.js';
import { isOk, isErr } from '../src/types.js';

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

function createMockHandler(result: NexusResult<unknown> = { ok: true, value: { success: true } }): NexusHandler {
  return {
    canHandle: () => true,
    handle: vi.fn().mockResolvedValue(result),
  };
}

function createTestOrchestrator(options: {
  handler?: NexusHandler;
  policy?: PolicyEngine;
  replayGuard?: ReplayGuard;
} = {}) {
  const clock = new FixedClock(1704499200000);
  const registry = new HandlerRegistry();
  const chronicle = new InMemoryChronicle();

  const handler = options.handler ?? createMockHandler();
  registry.register('memory', 'memory@3.21.0', handler, {
    schemas: ['memory.write', 'memory.readLatest'],
    kinds: ['command', 'query'],
  });

  return {
    orchestrator: createOrchestrator({
      clock,
      registry,
      chronicle,
      policy: options.policy,
      replayGuard: options.replayGuard,
    }),
    registry,
    chronicle,
    handler,
    clock,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Orchestrator', () => {
  describe('INV-ORCH-01: Single Entry Point', () => {
    it('dispatch is the only way to execute', async () => {
      const { orchestrator } = createTestOrchestrator();
      const env = createValidEnvelope();

      const result = await orchestrator.dispatch(env);

      expect(result.result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.traceId).toBe('trace-001');
    });
  });

  describe('INV-ORCH-02: Strict Validation', () => {
    it('rejects null input', async () => {
      const { orchestrator } = createTestOrchestrator();

      const result = await orchestrator.dispatch(null);

      expect(isErr(result.result)).toBe(true);
      if (isErr(result.result)) {
        expect(result.result.error.error_code).toBe(OrchestratorErrorCodes.VALIDATION_FAILED);
      }
    });

    it('rejects invalid envelope', async () => {
      const { orchestrator } = createTestOrchestrator();

      const result = await orchestrator.dispatch({ foo: 'bar' });

      expect(isErr(result.result)).toBe(true);
    });

    it('rejects envelope missing required fields', async () => {
      const { orchestrator } = createTestOrchestrator();

      const result = await orchestrator.dispatch({
        message_id: 'msg-1',
        // Missing other required fields
      });

      expect(isErr(result.result)).toBe(true);
    });

    it('accepts valid envelope', async () => {
      const { orchestrator } = createTestOrchestrator();

      const result = await orchestrator.dispatch(createValidEnvelope());

      expect(isOk(result.result)).toBe(true);
    });
  });

  describe('INV-ORCH-03: Policy First', () => {
    it('applies policy before handler', async () => {
      const policy = new PolicyEngine({
        allowedTargetModules: new Set(['query']), // memory NOT allowed
      });
      policy.resetRateLimits();

      const { orchestrator, handler } = createTestOrchestrator({ policy });

      const result = await orchestrator.dispatch(createValidEnvelope());

      expect(isErr(result.result)).toBe(true);
      if (isErr(result.result)) {
        expect(result.result.error.error_code).toBe(OrchestratorErrorCodes.POLICY_REJECTED);
      }

      // Handler should NOT have been called
      expect(handler.handle).not.toHaveBeenCalled();
    });

    it('allows if policy passes', async () => {
      const policy = new PolicyEngine();
      policy.resetRateLimits();

      const { orchestrator } = createTestOrchestrator({ policy });

      const result = await orchestrator.dispatch(createValidEnvelope());

      expect(isOk(result.result)).toBe(true);
    });
  });

  describe('INV-ORCH-04: Replay Guard', () => {
    it('rejects duplicate messages', async () => {
      const replayGuard = new ReplayGuard(new InMemoryReplayStore(), {
        defaultStrategy: 'reject',
      });

      const { orchestrator } = createTestOrchestrator({ replayGuard });
      const env = createValidEnvelope({ replay_protection_key: 'duplicate-key' });

      // First dispatch - should succeed
      const result1 = await orchestrator.dispatch(env);
      expect(isOk(result1.result)).toBe(true);

      // Second dispatch with same key - should fail
      const result2 = await orchestrator.dispatch(env);
      expect(isErr(result2.result)).toBe(true);
      if (isErr(result2.result)) {
        expect(result2.result.error.error_code).toBe(OrchestratorErrorCodes.REPLAY_REJECTED);
      }
    });

    it('returns cached result for idempotent replay', async () => {
      const replayGuard = new ReplayGuard(new InMemoryReplayStore(), {
        defaultStrategy: 'idempotent',
      });

      const handler = createMockHandler({ ok: true, value: { data: 'original' } });
      const { orchestrator } = createTestOrchestrator({ replayGuard, handler });

      const env = createValidEnvelope({ replay_protection_key: 'idem-key' });

      // First dispatch
      const result1 = await orchestrator.dispatch(env);
      expect(isOk(result1.result)).toBe(true);

      // Second dispatch - should return cached
      const result2 = await orchestrator.dispatch(env);
      expect(isOk(result2.result)).toBe(true);

      // Handler should only be called once
      expect(handler.handle).toHaveBeenCalledTimes(1);
    });
  });

  describe('INV-ORCH-05: Version Pinned Registry', () => {
    it('rejects unknown module version', async () => {
      const { orchestrator } = createTestOrchestrator();

      const env = createValidEnvelope({
        module_version: 'memory@9.99.0', // Not registered
      });

      const result = await orchestrator.dispatch(env);

      expect(isErr(result.result)).toBe(true);
      if (isErr(result.result)) {
        expect(result.result.error.error_code).toBe(OrchestratorErrorCodes.NO_HANDLER);
      }
    });

    it('routes to correct version', async () => {
      const clock = new FixedClock(1000);
      const registry = new HandlerRegistry();
      const chronicle = new InMemoryChronicle();

      const oldHandler = createMockHandler({ ok: true, value: { version: 'old' } });
      const newHandler = createMockHandler({ ok: true, value: { version: 'new' } });

      registry.register('memory', 'memory@3.20.0', oldHandler, {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      registry.register('memory', 'memory@3.21.0', newHandler, {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      const orchestrator = createOrchestrator({ clock, registry, chronicle });

      // Request v3.21.0
      const env = createValidEnvelope({ module_version: 'memory@3.21.0' });
      await orchestrator.dispatch(env);

      expect(newHandler.handle).toHaveBeenCalled();
      expect(oldHandler.handle).not.toHaveBeenCalled();
    });
  });

  describe('INV-ORCH-06: Chronicle Completeness', () => {
    it('records complete trace for successful dispatch', async () => {
      const { orchestrator, chronicle } = createTestOrchestrator();

      await orchestrator.dispatch(createValidEnvelope());

      const records = chronicle.snapshot();

      // Should have: received, validation_ok, handler_resolved, execution_start, execution_ok, dispatch_complete
      const eventTypes = records.map(r => r.event_type);

      expect(eventTypes).toContain('DISPATCH_RECEIVED');
      expect(eventTypes).toContain('VALIDATION_OK');
      expect(eventTypes).toContain('HANDLER_RESOLVED');
      expect(eventTypes).toContain('EXECUTION_START');
      expect(eventTypes).toContain('EXECUTION_OK');
      expect(eventTypes).toContain('DISPATCH_COMPLETE');
    });

    it('records trace for failed validation', async () => {
      const { orchestrator, chronicle } = createTestOrchestrator();

      await orchestrator.dispatch({ invalid: true });

      const records = chronicle.snapshot();
      const eventTypes = records.map(r => r.event_type);

      expect(eventTypes).toContain('VALIDATION_FAILED');
    });

    it('records trace for failed policy', async () => {
      const policy = new PolicyEngine({
        allowedTargetModules: new Set(['none']),
      });

      const { orchestrator, chronicle } = createTestOrchestrator({ policy });

      await orchestrator.dispatch(createValidEnvelope());

      const records = chronicle.snapshot();
      const eventTypes = records.map(r => r.event_type);

      expect(eventTypes).toContain('POLICY_REJECTED');
    });
  });

  describe('INV-ORCH-07: Error Coding', () => {
    it('all errors have error_code', async () => {
      const { orchestrator } = createTestOrchestrator();

      const result = await orchestrator.dispatch(null);

      expect(isErr(result.result)).toBe(true);
      if (isErr(result.result)) {
        expect(result.result.error.error_code).toBeDefined();
        expect(result.result.error.error_code.length).toBeGreaterThan(0);
      }
    });

    it('handler errors are wrapped safely', async () => {
      const handler: NexusHandler = {
        canHandle: () => true,
        handle: vi.fn().mockRejectedValue(new Error('SECRET: database password')),
      };

      const { orchestrator } = createTestOrchestrator({ handler });

      const result = await orchestrator.dispatch(createValidEnvelope());

      expect(isErr(result.result)).toBe(true);
      if (isErr(result.result)) {
        expect(result.result.error.message).not.toContain('SECRET');
        expect(result.result.error.error_code).toBe(OrchestratorErrorCodes.EXECUTION_FAILED);
      }
    });
  });

  describe('Metrics', () => {
    it('returns timing metrics', async () => {
      const { orchestrator } = createTestOrchestrator();

      const result = await orchestrator.dispatch(createValidEnvelope());

      expect(result.metrics).toBeDefined();
      expect(typeof result.metrics.totalDurationMs).toBe('number');
      expect(typeof result.metrics.validationDurationMs).toBe('number');
      expect(typeof result.metrics.executionDurationMs).toBe('number');
    });
  });

  describe('Circuit Breaker', () => {
    it('opens after consecutive failures', async () => {
      const failingHandler: NexusHandler = {
        canHandle: () => true,
        handle: vi.fn().mockRejectedValue(new Error('fail')),
      };

      const clock = new FixedClock(1000);
      const registry = new HandlerRegistry();
      const chronicle = new InMemoryChronicle();

      registry.register('memory', 'memory@3.21.0', failingHandler, {
        schemas: ['memory.write'],
        kinds: ['command'],
      });

      const orchestrator = createOrchestrator({
        clock,
        registry,
        chronicle,
        circuitBreaker: {
          failureThreshold: 3,
          recoveryTimeMs: 30000,
          successThreshold: 2,
        },
      });

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        await orchestrator.dispatch(createValidEnvelope({ replay_protection_key: `key-${i}` }));
      }

      // 4th attempt should be blocked by circuit
      const result = await orchestrator.dispatch(createValidEnvelope({ replay_protection_key: 'key-4' }));

      expect(isErr(result.result)).toBe(true);
      if (isErr(result.result)) {
        expect(result.result.error.error_code).toBe(OrchestratorErrorCodes.CIRCUIT_OPEN);
      }

      const states = orchestrator.getCircuitStates();
      expect(states.get('memory@memory@3.21.0')).toBe('open');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS CIRCUIT BREAKER UNIT
// ═══════════════════════════════════════════════════════════════════════════════

describe('CircuitBreaker', () => {
  let clock: { now: () => number };
  let time: number;

  beforeEach(() => {
    time = 1000;
    clock = { now: () => time };
  });

  it('starts in closed state', () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeMs: 1000,
      successThreshold: 2,
    }, clock);

    expect(cb.getState()).toBe('closed');
    expect(cb.canExecute()).toBe(true);
  });

  it('opens after threshold failures', () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeMs: 1000,
      successThreshold: 2,
    }, clock);

    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('closed');

    cb.recordFailure();
    expect(cb.getState()).toBe('open');
    expect(cb.canExecute()).toBe(false);
  });

  it('transitions to half-open after recovery time', () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeMs: 1000,
      successThreshold: 2,
    }, clock);

    // Open the circuit
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('open');

    // Advance time past recovery
    time += 1100;

    expect(cb.canExecute()).toBe(true);
    expect(cb.getState()).toBe('half-open');
  });

  it('closes after success threshold in half-open', () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeMs: 1000,
      successThreshold: 2,
    }, clock);

    // Open the circuit
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();

    // Move to half-open
    time += 1100;
    cb.canExecute();

    // Record successes
    cb.recordSuccess();
    expect(cb.getState()).toBe('half-open');

    cb.recordSuccess();
    expect(cb.getState()).toBe('closed');
  });

  it('reopens on failure in half-open', () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeMs: 1000,
      successThreshold: 2,
    }, clock);

    // Open -> half-open
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    time += 1100;
    cb.canExecute();

    // Fail in half-open
    cb.recordFailure();
    expect(cb.getState()).toBe('open');
  });

  it('reset clears state', () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeMs: 1000,
      successThreshold: 2,
    }, clock);

    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('open');

    cb.reset();
    expect(cb.getState()).toBe('closed');
    expect(cb.canExecute()).toBe(true);
  });
});
