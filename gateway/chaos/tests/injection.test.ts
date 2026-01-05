/**
 * OMEGA CHAOS_HARNESS — Injection Tests
 * Phase 16.4
 * 
 * INV-CHA-01: Faults only injected when enabled
 * INV-CHA-02: Original behavior preserved when disabled
 * INV-CHA-03: Fault probability respected
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChaosHarness, FaultType, InjectionResult } from '../src/chaos/index.js';

describe('CHAOS_HARNESS Injection', () => {
  let chaos: ChaosHarness;

  beforeEach(() => {
    chaos = new ChaosHarness({ enabled: true, seed: 12345 });
  });

  describe('inject() (INV-CHA-01)', () => {
    it('returns DISABLED when not enabled', () => {
      const disabledChaos = new ChaosHarness({ enabled: false });
      disabledChaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      const result = disabledChaos.inject({ operation: 'test' });
      expect(result.result).toBe(InjectionResult.DISABLED);
    });

    it('returns NO_MATCH when no matching fault', () => {
      const result = chaos.inject({ operation: 'test' });
      expect(result.result).toBe(InjectionResult.NO_MATCH);
    });

    it('returns INJECTED when fault matches and probability hits', () => {
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      const result = chaos.inject({ operation: 'test' });
      expect(result.result).toBe(InjectionResult.INJECTED);
    });

    it('returns SKIPPED when probability misses', () => {
      chaos.registerFault({ type: FaultType.ERROR, probability: 0 });
      const result = chaos.inject({ operation: 'test' });
      expect(result.result).toBe(InjectionResult.SKIPPED);
    });
  });

  describe('result structure', () => {
    it('includes all required fields', () => {
      chaos.registerFault({ type: FaultType.LATENCY, probability: 1 });
      const result = chaos.inject({ operation: 'test' });
      
      expect(result.result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.context).toBeDefined();
      expect(result.context.operation).toBe('test');
    });

    it('includes faultId when injected', () => {
      const faultId = chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      const result = chaos.inject({ operation: 'test' });
      expect(result.faultId).toBe(faultId);
    });

    it('includes faultType when injected', () => {
      chaos.registerFault({ type: FaultType.LATENCY, probability: 1 });
      const result = chaos.inject({ operation: 'test' });
      expect(result.faultType).toBe(FaultType.LATENCY);
    });
  });

  describe('target matching', () => {
    it('matches exact string target', () => {
      chaos.registerFault({
        type: FaultType.ERROR,
        target: 'api/users',
        probability: 1,
      });
      
      const match = chaos.inject({ operation: 'api/users' });
      const noMatch = chaos.inject({ operation: 'api/posts' });
      
      expect(match.result).toBe(InjectionResult.INJECTED);
      expect(noMatch.result).toBe(InjectionResult.NO_MATCH);
    });

    it('matches partial string target', () => {
      chaos.registerFault({
        type: FaultType.ERROR,
        target: 'users',
        probability: 1,
      });
      
      const result = chaos.inject({ operation: 'api/users/123' });
      expect(result.result).toBe(InjectionResult.INJECTED);
    });

    it('matches regex target', () => {
      chaos.registerFault({
        type: FaultType.ERROR,
        target: /^api\/.*/,
        probability: 1,
      });
      
      const match1 = chaos.inject({ operation: 'api/users' });
      const match2 = chaos.inject({ operation: 'api/posts' });
      const noMatch = chaos.inject({ operation: 'other/path' });
      
      expect(match1.result).toBe(InjectionResult.INJECTED);
      expect(match2.result).toBe(InjectionResult.INJECTED);
      expect(noMatch.result).toBe(InjectionResult.NO_MATCH);
    });

    it('matches all when no target specified', () => {
      chaos.registerFault({ type: FaultType.LATENCY, probability: 1 });
      
      const r1 = chaos.inject({ operation: 'anything' });
      const r2 = chaos.inject({ operation: 'something/else' });
      
      expect(r1.result).toBe(InjectionResult.INJECTED);
      expect(r2.result).toBe(InjectionResult.INJECTED);
    });
  });

  describe('probability (INV-CHA-03)', () => {
    it('respects probability = 1 (always inject)', () => {
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      let injected = 0;
      for (let i = 0; i < 100; i++) {
        if (chaos.inject({ operation: 'test' }).result === InjectionResult.INJECTED) {
          injected++;
        }
      }
      expect(injected).toBe(100);
    });

    it('respects probability = 0 (never inject)', () => {
      chaos.registerFault({ type: FaultType.ERROR, probability: 0 });
      
      let injected = 0;
      for (let i = 0; i < 100; i++) {
        if (chaos.inject({ operation: 'test' }).result === InjectionResult.INJECTED) {
          injected++;
        }
      }
      expect(injected).toBe(0);
    });

    it('respects intermediate probability with seeded random', () => {
      const seededChaos = new ChaosHarness({ enabled: true, seed: 42 });
      seededChaos.registerFault({ type: FaultType.ERROR, probability: 0.5 });
      
      let injected = 0;
      for (let i = 0; i < 100; i++) {
        if (seededChaos.inject({ operation: 'test' }).result === InjectionResult.INJECTED) {
          injected++;
        }
      }
      // With seed, should be deterministic and around 50%
      expect(injected).toBeGreaterThan(30);
      expect(injected).toBeLessThan(70);
    });
  });

  describe('maxInjections', () => {
    it('respects maxInjections limit', () => {
      chaos.registerFault({
        type: FaultType.ERROR,
        probability: 1,
        maxInjections: 5,
      });
      
      let injected = 0;
      for (let i = 0; i < 20; i++) {
        if (chaos.inject({ operation: 'test' }).result === InjectionResult.INJECTED) {
          injected++;
        }
      }
      expect(injected).toBe(5);
    });
  });

  describe('counter updates', () => {
    it('increments injectionCount', () => {
      const id = chaos.registerFault({ type: FaultType.LATENCY, probability: 1 });
      
      chaos.inject({ operation: 'test' });
      chaos.inject({ operation: 'test' });
      
      expect(chaos.getFault(id)?.injectionCount).toBe(2);
    });

    it('increments skipCount', () => {
      const id = chaos.registerFault({ type: FaultType.LATENCY, probability: 0 });
      
      chaos.inject({ operation: 'test' });
      chaos.inject({ operation: 'test' });
      
      expect(chaos.getFault(id)?.skipCount).toBe(2);
    });
  });
});
