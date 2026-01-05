/**
 * OMEGA CHAOS_HARNESS — Behavior Tests
 * Phase 16.4
 * 
 * INV-CHA-02: Original behavior preserved when disabled
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChaosHarness, FaultType, InjectionResult } from '../src/chaos/index.js';

describe('CHAOS_HARNESS Behavior Injection', () => {
  let chaos: ChaosHarness;

  beforeEach(() => {
    chaos = new ChaosHarness({ enabled: true });
  });

  describe('injectWithBehavior() (INV-CHA-02)', () => {
    it('returns original result when disabled', async () => {
      const disabledChaos = new ChaosHarness({ enabled: false });
      disabledChaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      const result = await disabledChaos.injectWithBehavior(
        { operation: 'test' },
        () => 'original'
      );
      
      expect(result.result).toBe('original');
      expect(result.faultInjected).toBe(false);
    });

    it('returns original result when no fault matches', async () => {
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => 42
      );
      
      expect(result.result).toBe(42);
      expect(result.faultInjected).toBe(false);
    });

    it('returns original result when probability skips', async () => {
      chaos.registerFault({
        type: FaultType.ERROR,
        probability: 0,
        target: 'test',
      });
      
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => 'success'
      );
      
      expect(result.result).toBe('success');
      expect(result.faultInjected).toBe(false);
    });
  });

  describe('LATENCY fault', () => {
    it('adds delay before returning result', async () => {
      chaos.registerFault({
        type: FaultType.LATENCY,
        latencyMs: 100,
        probability: 1,
      });
      
      const start = Date.now();
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => 'delayed'
      );
      const elapsed = Date.now() - start;
      
      expect(result.result).toBe('delayed');
      expect(result.faultInjected).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('ERROR fault', () => {
    it('returns error instead of executing', async () => {
      chaos.registerFault({
        type: FaultType.ERROR,
        errorMessage: 'Injected error',
        probability: 1,
      });
      
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => 'should not return'
      );
      
      expect(result.result).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Injected error');
      expect(result.faultInjected).toBe(true);
    });
  });

  describe('NULL_RESPONSE fault', () => {
    it('returns null instead of result', async () => {
      chaos.registerFault({
        type: FaultType.NULL_RESPONSE,
        probability: 1,
      });
      
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => 'should be null'
      );
      
      expect(result.result).toBeNull();
      expect(result.faultInjected).toBe(true);
    });
  });

  describe('CORRUPT_DATA fault', () => {
    it('corrupts the returned data', async () => {
      chaos.registerFault({
        type: FaultType.CORRUPT_DATA,
        probability: 1,
        corruptor: (data) => ({ ...data as object, corrupted: true }),
      });
      
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => ({ value: 42 })
      );
      
      expect(result.result).toEqual({ value: 42, corrupted: true });
      expect(result.faultInjected).toBe(true);
    });

    it('returns original if no corruptor', async () => {
      chaos.registerFault({
        type: FaultType.CORRUPT_DATA,
        probability: 1,
      });
      
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => ({ original: true })
      );
      
      expect(result.result).toEqual({ original: true });
      expect(result.faultInjected).toBe(true);
    });
  });

  describe('wrap()', () => {
    it('creates wrapped function', async () => {
      chaos.registerFault({
        type: FaultType.LATENCY,
        latencyMs: 50,
        probability: 1,
      });
      
      const original = () => 'wrapped result';
      const wrapped = chaos.wrap(original, { operation: 'test' });
      
      const result = await wrapped();
      expect(result.result).toBe('wrapped result');
    });

    it('includes operation in context', async () => {
      chaos.registerFault({ type: FaultType.LATENCY, probability: 1 });
      
      const wrapped = chaos.wrap(() => 'test', { operation: 'myOp' });
      const result = await wrapped();
      
      expect(result.attempt.context.operation).toBe('myOp');
    });
  });

  describe('async functions', () => {
    it('handles async original function', async () => {
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async result';
        }
      );
      
      expect(result.result).toBe('async result');
    });

    it('handles async function with latency fault', async () => {
      chaos.registerFault({
        type: FaultType.LATENCY,
        latencyMs: 50,
        probability: 1,
      });
      
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        async () => 'async delayed'
      );
      
      expect(result.result).toBe('async delayed');
      expect(result.faultInjected).toBe(true);
    });
  });

  describe('executionMs tracking', () => {
    it('tracks execution time', async () => {
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => 'quick'
      );
      
      expect(result.executionMs).toBeGreaterThanOrEqual(0);
    });

    it('includes latency in execution time', async () => {
      chaos.registerFault({
        type: FaultType.LATENCY,
        latencyMs: 100,
        probability: 1,
      });
      
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => 'delayed'
      );
      
      expect(result.executionMs).toBeGreaterThanOrEqual(90);
    });
  });
});
