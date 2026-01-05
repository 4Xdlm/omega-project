/**
 * OMEGA CHAOS_HARNESS — Invariants Proof Tests
 * Phase 16.4
 * 
 * INVARIANTS:
 * - INV-CHA-01: Faults only injected when enabled
 * - INV-CHA-02: Original behavior preserved when disabled
 * - INV-CHA-03: Fault probability respected
 * - INV-CHA-04: Experiments isolated
 * - INV-CHA-05: Metrics accurate
 * - INV-CHA-06: Safe shutdown
 */

import { describe, it, expect } from 'vitest';
import {
  ChaosHarness,
  FaultType,
  InjectionResult,
  ExperimentState,
  CHAOS_VERSION,
} from '../src/chaos/index.js';

describe('INVARIANTS CHAOS_HARNESS', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-CHA-01: Faults only injected when enabled
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-CHA-01: Faults only injected when enabled', () => {
    it('never injects when disabled', () => {
      const chaos = new ChaosHarness({ enabled: false });
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      let injected = 0;
      for (let i = 0; i < 100; i++) {
        if (chaos.inject({ operation: 'test' }).result === InjectionResult.INJECTED) {
          injected++;
        }
      }
      
      expect(injected).toBe(0);
    });

    it('always returns DISABLED when not enabled', () => {
      const chaos = new ChaosHarness({ enabled: false });
      chaos.registerFault({ type: FaultType.LATENCY, probability: 1 });
      
      for (let i = 0; i < 50; i++) {
        const result = chaos.inject({ operation: 'test' });
        expect(result.result).toBe(InjectionResult.DISABLED);
      }
    });

    it('injects after enable()', () => {
      const chaos = new ChaosHarness({ enabled: false });
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      expect(chaos.inject({ operation: 'test' }).result).toBe(InjectionResult.DISABLED);
      
      chaos.enable();
      expect(chaos.inject({ operation: 'test' }).result).toBe(InjectionResult.INJECTED);
    });

    it('stops injecting after disable()', () => {
      const chaos = new ChaosHarness({ enabled: true });
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      expect(chaos.inject({ operation: 'test' }).result).toBe(InjectionResult.INJECTED);
      
      chaos.disable();
      expect(chaos.inject({ operation: 'test' }).result).toBe(InjectionResult.DISABLED);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-CHA-02: Original behavior preserved when disabled
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-CHA-02: Original behavior preserved when disabled', () => {
    it('returns original result when disabled', async () => {
      const chaos = new ChaosHarness({ enabled: false });
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      for (let i = 0; i < 50; i++) {
        const result = await chaos.injectWithBehavior(
          { operation: 'test' },
          () => i * 2
        );
        expect(result.result).toBe(i * 2);
        expect(result.faultInjected).toBe(false);
      }
    });

    it('executes original async function when disabled', async () => {
      const chaos = new ChaosHarness({ enabled: false });
      chaos.registerFault({ type: FaultType.TIMEOUT, probability: 1 });
      
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'async result';
        }
      );
      
      expect(result.result).toBe('async result');
    });

    it('preserves complex return types', async () => {
      const chaos = new ChaosHarness({ enabled: false });
      chaos.registerFault({ type: FaultType.CORRUPT_DATA, probability: 1 });
      
      const original = { nested: { value: [1, 2, 3] }, date: new Date() };
      const result = await chaos.injectWithBehavior(
        { operation: 'test' },
        () => original
      );
      
      expect(result.result).toBe(original);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-CHA-03: Fault probability respected
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-CHA-03: Fault probability respected', () => {
    it('probability 1 always injects', () => {
      const chaos = new ChaosHarness({ enabled: true });
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      let injected = 0;
      for (let i = 0; i < 100; i++) {
        if (chaos.inject({ operation: 'test' }).result === InjectionResult.INJECTED) {
          injected++;
        }
      }
      expect(injected).toBe(100);
    });

    it('probability 0 never injects', () => {
      const chaos = new ChaosHarness({ enabled: true });
      chaos.registerFault({ type: FaultType.ERROR, probability: 0 });
      
      let injected = 0;
      for (let i = 0; i < 100; i++) {
        if (chaos.inject({ operation: 'test' }).result === InjectionResult.INJECTED) {
          injected++;
        }
      }
      expect(injected).toBe(0);
    });

    it('seeded random produces deterministic results', () => {
      const results1: InjectionResult[] = [];
      const results2: InjectionResult[] = [];
      
      // Run 1
      const chaos1 = new ChaosHarness({ enabled: true, seed: 42 });
      chaos1.registerFault({ type: FaultType.ERROR, probability: 0.5 });
      for (let i = 0; i < 50; i++) {
        results1.push(chaos1.inject({ operation: 'test' }).result);
      }
      
      // Run 2 with same seed
      const chaos2 = new ChaosHarness({ enabled: true, seed: 42 });
      chaos2.registerFault({ type: FaultType.ERROR, probability: 0.5 });
      for (let i = 0; i < 50; i++) {
        results2.push(chaos2.inject({ operation: 'test' }).result);
      }
      
      expect(results1).toEqual(results2);
    });

    it('intermediate probability produces expected distribution', () => {
      const chaos = new ChaosHarness({ enabled: true, seed: 12345 });
      chaos.registerFault({ type: FaultType.ERROR, probability: 0.3 });
      
      let injected = 0;
      const trials = 1000;
      for (let i = 0; i < trials; i++) {
        if (chaos.inject({ operation: 'test' }).result === InjectionResult.INJECTED) {
          injected++;
        }
      }
      
      const rate = injected / trials;
      expect(rate).toBeGreaterThan(0.2);
      expect(rate).toBeLessThan(0.4);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-CHA-04: Experiments isolated
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-CHA-04: Experiments isolated', () => {
    it('each experiment has unique ID', () => {
      const chaos = new ChaosHarness({ enabled: true });
      const ids = new Set<string>();
      
      for (let i = 0; i < 50; i++) {
        const id = chaos.startExperiment({
          name: `Exp ${i}`,
          faults: [{ type: FaultType.LATENCY }],
        });
        ids.add(id);
      }
      
      expect(ids.size).toBe(50);
    });

    it('experiments have independent faults', () => {
      const chaos = new ChaosHarness({ enabled: true });
      
      const id1 = chaos.startExperiment({
        name: 'Exp 1',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      const id2 = chaos.startExperiment({
        name: 'Exp 2',
        faults: [{ type: FaultType.ERROR }],
      });
      
      const faults1 = chaos.getExperiment(id1)?.faultIds ?? [];
      const faults2 = chaos.getExperiment(id2)?.faultIds ?? [];
      
      // No shared fault IDs
      const intersection = faults1.filter(f => faults2.includes(f));
      expect(intersection.length).toBe(0);
    });

    it('stopping experiment only affects its faults', () => {
      const chaos = new ChaosHarness({ enabled: true });
      
      const id1 = chaos.startExperiment({
        name: 'Exp 1',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      const id2 = chaos.startExperiment({
        name: 'Exp 2',
        faults: [{ type: FaultType.ERROR }],
      });
      
      const faultId2 = chaos.getExperiment(id2)?.faultIds[0];
      
      chaos.stopExperiment(id1);
      
      // Exp1's fault should be gone, Exp2's should remain
      expect(chaos.getExperiment(id1)?.state).toBe(ExperimentState.COMPLETED);
      expect(chaos.getFault(faultId2!)).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-CHA-05: Metrics accurate
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-CHA-05: Metrics accurate', () => {
    it('totalAttempts equals sum of outcomes', () => {
      const chaos = new ChaosHarness({ enabled: true, seed: 42 });
      chaos.registerFault({ type: FaultType.ERROR, probability: 0.5 });
      
      for (let i = 0; i < 100; i++) {
        chaos.inject({ operation: 'test' });
      }
      
      const m = chaos.getMetrics();
      expect(m.totalAttempts).toBe(m.totalInjections + m.totalSkipped);
    });

    it('byFaultType sums equal totalInjections', () => {
      const chaos = new ChaosHarness({ enabled: true });
      chaos.registerFault({ type: FaultType.LATENCY, probability: 1, target: 'lat' });
      chaos.registerFault({ type: FaultType.ERROR, probability: 1, target: 'err' });
      
      chaos.inject({ operation: 'lat' });
      chaos.inject({ operation: 'lat' });
      chaos.inject({ operation: 'err' });
      
      const m = chaos.getMetrics();
      const byTypeSum = Object.values(m.byFaultType).reduce((a, b) => a + b, 0);
      expect(byTypeSum).toBe(m.totalInjections);
    });

    it('activeFaults equals registered active faults', () => {
      const chaos = new ChaosHarness({ enabled: true });
      
      const id1 = chaos.registerFault({ type: FaultType.LATENCY });
      const id2 = chaos.registerFault({ type: FaultType.ERROR });
      
      expect(chaos.getMetrics().activeFaults).toBe(2);
      
      const fault = chaos.getFault(id1);
      if (fault) fault.active = false;
      
      expect(chaos.getMetrics().activeFaults).toBe(1);
    });

    it('version always returns correct value', () => {
      const configs = [
        { enabled: true },
        { enabled: false },
        { seed: 42 },
        {},
      ];
      
      for (const config of configs) {
        const chaos = new ChaosHarness(config);
        expect(chaos.getMetrics().version).toBe(CHAOS_VERSION);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-CHA-06: Safe shutdown
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-CHA-06: Safe shutdown', () => {
    it('shutdown stops all running experiments', () => {
      const chaos = new ChaosHarness({ enabled: true });
      
      const id1 = chaos.startExperiment({
        name: 'Exp 1',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      const id2 = chaos.startExperiment({
        name: 'Exp 2',
        faults: [{ type: FaultType.ERROR }],
      });
      
      chaos.shutdown();
      
      expect(chaos.getExperiment(id1)?.state).toBe(ExperimentState.COMPLETED);
      expect(chaos.getExperiment(id2)?.state).toBe(ExperimentState.COMPLETED);
    });

    it('shutdown disables injection', () => {
      const chaos = new ChaosHarness({ enabled: true });
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      expect(chaos.inject({ operation: 'test' }).result).toBe(InjectionResult.INJECTED);
      
      chaos.shutdown();
      
      expect(chaos.enabled).toBe(false);
    });

    it('shutdown clears faults', () => {
      const chaos = new ChaosHarness({ enabled: true });
      chaos.registerFault({ type: FaultType.LATENCY });
      chaos.registerFault({ type: FaultType.ERROR });
      
      expect(chaos.getActiveFaults().length).toBe(2);
      
      chaos.shutdown();
      
      expect(chaos.getActiveFaults().length).toBe(0);
    });

    it('clear resets all metrics', () => {
      const chaos = new ChaosHarness({ enabled: true });
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      for (let i = 0; i < 10; i++) {
        chaos.inject({ operation: 'test' });
      }
      
      expect(chaos.getMetrics().totalAttempts).toBe(10);
      
      chaos.clear();
      
      expect(chaos.getMetrics().totalAttempts).toBe(0);
      expect(chaos.getMetrics().totalInjections).toBe(0);
    });
  });
});
