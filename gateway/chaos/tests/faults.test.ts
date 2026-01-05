/**
 * OMEGA CHAOS_HARNESS — Fault Registration Tests
 * Phase 16.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChaosHarness, FaultType } from '../src/chaos/index.js';

describe('CHAOS_HARNESS Fault Registration', () => {
  let chaos: ChaosHarness;

  beforeEach(() => {
    chaos = new ChaosHarness({ enabled: true });
  });

  describe('registerFault()', () => {
    it('registers a fault and returns ID', () => {
      const id = chaos.registerFault({ type: FaultType.LATENCY });
      expect(id).toBeDefined();
      expect(id).toMatch(/^FLT-/);
    });

    it('stores fault configuration', () => {
      const id = chaos.registerFault({
        type: FaultType.ERROR,
        errorMessage: 'Test error',
        probability: 0.5,
      });
      
      const fault = chaos.getFault(id);
      expect(fault).toBeDefined();
      expect(fault?.config.type).toBe(FaultType.ERROR);
      expect(fault?.config.errorMessage).toBe('Test error');
      expect(fault?.config.probability).toBe(0.5);
    });

    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(chaos.registerFault({ type: FaultType.LATENCY }));
      }
      expect(ids.size).toBe(100);
    });

    it('uses default probability if not specified', () => {
      const id = chaos.registerFault({ type: FaultType.LATENCY });
      const fault = chaos.getFault(id);
      expect(fault?.config.probability).toBe(0.1); // DEFAULT_PROBABILITY
    });

    it('initializes counters to zero', () => {
      const id = chaos.registerFault({ type: FaultType.ERROR });
      const fault = chaos.getFault(id);
      expect(fault?.injectionCount).toBe(0);
      expect(fault?.skipCount).toBe(0);
    });

    it('marks fault as active', () => {
      const id = chaos.registerFault({ type: FaultType.LATENCY });
      const fault = chaos.getFault(id);
      expect(fault?.active).toBe(true);
    });
  });

  describe('unregisterFault()', () => {
    it('removes a registered fault', () => {
      const id = chaos.registerFault({ type: FaultType.ERROR });
      expect(chaos.getFault(id)).toBeDefined();
      
      const result = chaos.unregisterFault(id);
      expect(result).toBe(true);
      expect(chaos.getFault(id)).toBeUndefined();
    });

    it('returns false for nonexistent fault', () => {
      const result = chaos.unregisterFault('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getFault()', () => {
    it('returns fault by ID', () => {
      const id = chaos.registerFault({ type: FaultType.NULL_RESPONSE });
      const fault = chaos.getFault(id);
      expect(fault?.id).toBe(id);
    });

    it('returns undefined for unknown ID', () => {
      expect(chaos.getFault('unknown')).toBeUndefined();
    });
  });

  describe('getActiveFaults()', () => {
    it('returns all active faults', () => {
      chaos.registerFault({ type: FaultType.LATENCY });
      chaos.registerFault({ type: FaultType.ERROR });
      chaos.registerFault({ type: FaultType.NULL_RESPONSE });
      
      const active = chaos.getActiveFaults();
      expect(active.length).toBe(3);
    });

    it('excludes inactive faults', () => {
      const id = chaos.registerFault({ type: FaultType.LATENCY });
      chaos.registerFault({ type: FaultType.ERROR });
      
      // Deactivate one
      const fault = chaos.getFault(id);
      if (fault) fault.active = false;
      
      const active = chaos.getActiveFaults();
      expect(active.length).toBe(1);
    });
  });

  describe('fault types', () => {
    it('supports LATENCY type', () => {
      const id = chaos.registerFault({
        type: FaultType.LATENCY,
        latencyMs: 500,
      });
      expect(chaos.getFault(id)?.config.latencyMs).toBe(500);
    });

    it('supports ERROR type', () => {
      const id = chaos.registerFault({
        type: FaultType.ERROR,
        errorMessage: 'Custom error',
        errorClass: 'CustomError',
      });
      expect(chaos.getFault(id)?.config.errorMessage).toBe('Custom error');
    });

    it('supports NULL_RESPONSE type', () => {
      const id = chaos.registerFault({ type: FaultType.NULL_RESPONSE });
      expect(chaos.getFault(id)?.config.type).toBe(FaultType.NULL_RESPONSE);
    });

    it('supports CORRUPT_DATA type', () => {
      const corruptor = <T>(data: T) => data;
      const id = chaos.registerFault({
        type: FaultType.CORRUPT_DATA,
        corruptor,
      });
      expect(chaos.getFault(id)?.config.corruptor).toBe(corruptor);
    });

    it('supports TIMEOUT type', () => {
      const id = chaos.registerFault({ type: FaultType.TIMEOUT });
      expect(chaos.getFault(id)?.config.type).toBe(FaultType.TIMEOUT);
    });
  });

  describe('target patterns', () => {
    it('supports string target', () => {
      const id = chaos.registerFault({
        type: FaultType.LATENCY,
        target: 'api/users',
      });
      expect(chaos.getFault(id)?.config.target).toBe('api/users');
    });

    it('supports regex target', () => {
      const regex = /^api\/.*/;
      const id = chaos.registerFault({
        type: FaultType.ERROR,
        target: regex,
      });
      expect(chaos.getFault(id)?.config.target).toBe(regex);
    });
  });
});
