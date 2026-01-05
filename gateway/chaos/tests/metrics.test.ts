/**
 * OMEGA CHAOS_HARNESS — Metrics Tests
 * Phase 16.4
 * 
 * INV-CHA-05: Metrics accurate
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChaosHarness, FaultType, CHAOS_VERSION } from '../src/chaos/index.js';

describe('CHAOS_HARNESS Metrics (INV-CHA-05)', () => {
  let chaos: ChaosHarness;

  beforeEach(() => {
    chaos = new ChaosHarness({ enabled: true, seed: 12345 });
  });

  describe('getMetrics()', () => {
    it('includes timestamp', () => {
      const metrics = chaos.getMetrics();
      expect(metrics.timestamp).toBeDefined();
      expect(new Date(metrics.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes version', () => {
      const metrics = chaos.getMetrics();
      expect(metrics.version).toBe(CHAOS_VERSION);
    });

    it('includes uptimeMs', () => {
      const metrics = chaos.getMetrics();
      expect(metrics.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('includes enabled status', () => {
      const metrics = chaos.getMetrics();
      expect(metrics.enabled).toBe(true);
      
      chaos.disable();
      expect(chaos.getMetrics().enabled).toBe(false);
    });

    it('includes config', () => {
      const metrics = chaos.getMetrics();
      expect(metrics.config).toBeDefined();
      expect(metrics.config.enabled).toBe(true);
    });
  });

  describe('attempt tracking', () => {
    it('tracks totalAttempts', () => {
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      chaos.inject({ operation: 'test' });
      chaos.inject({ operation: 'test' });
      chaos.inject({ operation: 'test' });
      
      expect(chaos.getMetrics().totalAttempts).toBe(3);
    });

    it('tracks totalInjections', () => {
      chaos.registerFault({ type: FaultType.LATENCY, probability: 1 });
      
      chaos.inject({ operation: 'test' });
      chaos.inject({ operation: 'test' });
      
      expect(chaos.getMetrics().totalInjections).toBe(2);
    });

    it('tracks totalSkipped', () => {
      chaos.registerFault({ type: FaultType.ERROR, probability: 0 });
      
      chaos.inject({ operation: 'test' });
      chaos.inject({ operation: 'test' });
      
      expect(chaos.getMetrics().totalSkipped).toBe(2);
    });

    it('tracks totalDisabled', () => {
      const disabledChaos = new ChaosHarness({ enabled: false });
      disabledChaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      disabledChaos.inject({ operation: 'test' });
      disabledChaos.inject({ operation: 'test' });
      
      expect(disabledChaos.getMetrics().totalDisabled).toBe(2);
    });
  });

  describe('fault counting', () => {
    it('tracks activeFaults', () => {
      expect(chaos.getMetrics().activeFaults).toBe(0);
      
      chaos.registerFault({ type: FaultType.LATENCY });
      expect(chaos.getMetrics().activeFaults).toBe(1);
      
      chaos.registerFault({ type: FaultType.ERROR });
      expect(chaos.getMetrics().activeFaults).toBe(2);
    });
  });

  describe('experiment counting', () => {
    it('tracks activeExperiments', () => {
      expect(chaos.getMetrics().activeExperiments).toBe(0);
      
      chaos.startExperiment({
        name: 'Test',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      expect(chaos.getMetrics().activeExperiments).toBe(1);
    });

    it('tracks completedExperiments', () => {
      expect(chaos.getMetrics().completedExperiments).toBe(0);
      
      const id = chaos.startExperiment({
        name: 'Test',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      chaos.stopExperiment(id);
      expect(chaos.getMetrics().completedExperiments).toBe(1);
    });
  });

  describe('injection rate', () => {
    it('calculates injectionRate correctly', () => {
      chaos.registerFault({ type: FaultType.ERROR, probability: 1 });
      
      for (let i = 0; i < 10; i++) {
        chaos.inject({ operation: 'test' });
      }
      
      expect(chaos.getMetrics().injectionRate).toBe(100);
    });

    it('handles mixed injections and skips', () => {
      // Use seeded random for predictability
      const seeded = new ChaosHarness({ enabled: true, seed: 42 });
      seeded.registerFault({ type: FaultType.ERROR, probability: 0.5 });
      
      for (let i = 0; i < 100; i++) {
        seeded.inject({ operation: 'test' });
      }
      
      const metrics = seeded.getMetrics();
      // Should be around 50% with some variance
      expect(metrics.injectionRate).toBeGreaterThan(30);
      expect(metrics.injectionRate).toBeLessThan(70);
    });
  });

  describe('byFaultType', () => {
    it('tracks injections by fault type', () => {
      chaos.registerFault({ type: FaultType.LATENCY, probability: 1, target: 'latency' });
      chaos.registerFault({ type: FaultType.ERROR, probability: 1, target: 'error' });
      
      chaos.inject({ operation: 'latency' });
      chaos.inject({ operation: 'latency' });
      chaos.inject({ operation: 'error' });
      
      const metrics = chaos.getMetrics();
      expect(metrics.byFaultType[FaultType.LATENCY]).toBe(2);
      expect(metrics.byFaultType[FaultType.ERROR]).toBe(1);
    });

    it('initializes all fault types to zero', () => {
      const metrics = chaos.getMetrics();
      
      for (const type of Object.values(FaultType)) {
        expect(metrics.byFaultType[type]).toBe(0);
      }
    });
  });

  describe('getFaultMetrics()', () => {
    it('returns metrics for specific fault', () => {
      const id = chaos.registerFault({ type: FaultType.LATENCY, probability: 1 });
      
      chaos.inject({ operation: 'test' });
      chaos.inject({ operation: 'test' });
      
      const metrics = chaos.getFaultMetrics(id);
      expect(metrics).not.toBeNull();
      expect(metrics?.injections).toBe(2);
      expect(metrics?.type).toBe(FaultType.LATENCY);
    });

    it('returns null for unknown fault', () => {
      const metrics = chaos.getFaultMetrics('unknown');
      expect(metrics).toBeNull();
    });

    it('calculates injectionRate per fault', () => {
      const seeded = new ChaosHarness({ enabled: true, seed: 42 });
      const id = seeded.registerFault({ type: FaultType.ERROR, probability: 0.5 });
      
      for (let i = 0; i < 100; i++) {
        seeded.inject({ operation: 'test' });
      }
      
      const metrics = seeded.getFaultMetrics(id);
      expect(metrics?.injectionRate).toBeGreaterThan(30);
      expect(metrics?.injectionRate).toBeLessThan(70);
    });
  });

  describe('metrics coherence (INV-CHA-05)', () => {
    it('totalAttempts = injections + skipped + disabled + no_match', () => {
      chaos.registerFault({ type: FaultType.ERROR, probability: 0.5 });
      
      for (let i = 0; i < 50; i++) {
        chaos.inject({ operation: 'test' });
      }
      
      const m = chaos.getMetrics();
      expect(m.totalAttempts).toBe(m.totalInjections + m.totalSkipped + m.totalDisabled);
    });
  });
});
