// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA WIRING — TESTS ID FACTORY
// Version: 1.0.0
// Date: 06 janvier 2026
// Standard: NASA-Grade L4 / DO-178C / MIL-STD
// ═══════════════════════════════════════════════════════════════════════════════
//
// @invariant INV-ADP-07: UUID via factory, pas crypto.randomUUID() direct
//
// ═══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  SystemIdFactory,
  FixedIdFactory,
  SequentialIdFactory,
  DeterministicIdFactory,
  createSystemIdFactory,
  createFixedIdFactory,
  createSequentialIdFactory,
  createDeterministicIdFactory,
} from '../src/id_factory.js';

describe('IdFactory', () => {
  describe('SystemIdFactory', () => {
    it('generates UUID format strings', () => {
      const factory = new SystemIdFactory();
      const id = factory.newId();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('generates unique IDs', () => {
      const factory = new SystemIdFactory();
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(factory.newId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('FixedIdFactory', () => {
    it('always returns the same ID', () => {
      const factory = new FixedIdFactory('fixed-id-123');
      expect(factory.newId()).toBe('fixed-id-123');
      expect(factory.newId()).toBe('fixed-id-123');
      expect(factory.newId()).toBe('fixed-id-123');
    });

    it('throws on empty string', () => {
      expect(() => new FixedIdFactory('')).toThrow();
    });

    it('throws on whitespace only', () => {
      expect(() => new FixedIdFactory('   ')).toThrow();
    });

    it('is deterministic for tests', () => {
      const f1 = new FixedIdFactory('test-id');
      const f2 = new FixedIdFactory('test-id');
      expect(f1.newId()).toBe(f2.newId());
    });
  });

  describe('SequentialIdFactory', () => {
    it('generates sequential IDs', () => {
      const factory = new SequentialIdFactory('msg', 1);
      expect(factory.newId()).toBe('msg-000001');
      expect(factory.newId()).toBe('msg-000002');
      expect(factory.newId()).toBe('msg-000003');
    });

    it('uses default prefix and start', () => {
      const factory = new SequentialIdFactory();
      expect(factory.newId()).toBe('id-000001');
    });

    it('respects custom start', () => {
      const factory = new SequentialIdFactory('x', 100);
      expect(factory.newId()).toBe('x-000100');
      expect(factory.newId()).toBe('x-000101');
    });

    it('can be reset', () => {
      const factory = new SequentialIdFactory('t', 1);
      factory.newId();
      factory.newId();
      factory.reset(1);
      expect(factory.newId()).toBe('t-000001');
    });

    it('throws on negative start', () => {
      expect(() => new SequentialIdFactory('x', -1)).toThrow();
    });

    it('is predictable for tests', () => {
      const f1 = new SequentialIdFactory('env', 1);
      const f2 = new SequentialIdFactory('env', 1);
      
      const ids1: string[] = [];
      const ids2: string[] = [];
      for (let i = 0; i < 5; i++) {
        ids1.push(f1.newId());
        ids2.push(f2.newId());
      }
      expect(ids1).toEqual(ids2);
    });
  });

  describe('DeterministicIdFactory', () => {
    it('generates hash-based IDs', () => {
      const factory = new DeterministicIdFactory('test-seed');
      const id = factory.newId();
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });

    it('same seed produces same sequence', () => {
      const f1 = new DeterministicIdFactory('my-seed');
      const f2 = new DeterministicIdFactory('my-seed');
      
      for (let i = 0; i < 10; i++) {
        expect(f1.newId()).toBe(f2.newId());
      }
    });

    it('different seeds produce different sequences', () => {
      const f1 = new DeterministicIdFactory('seed-A');
      const f2 = new DeterministicIdFactory('seed-B');
      expect(f1.newId()).not.toBe(f2.newId());
    });

    it('can be reset', () => {
      const factory = new DeterministicIdFactory('s');
      const first = factory.newId();
      factory.newId();
      factory.newId();
      factory.reset();
      expect(factory.newId()).toBe(first);
    });

    it('throws on empty seed', () => {
      expect(() => new DeterministicIdFactory('')).toThrow();
    });

    it('is fully deterministic for replay', () => {
      const seed = 'OMEGA_REPLAY_SEED_42';
      const expected = [
        new DeterministicIdFactory(seed).newId(),
      ];
      
      const factory = new DeterministicIdFactory(seed);
      expect(factory.newId()).toBe(expected[0]);
    });
  });

  describe('Factory functions', () => {
    it('createSystemIdFactory returns SystemIdFactory', () => {
      const factory = createSystemIdFactory();
      const id = factory.newId();
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('createFixedIdFactory returns FixedIdFactory', () => {
      const factory = createFixedIdFactory('my-fixed-id');
      expect(factory.newId()).toBe('my-fixed-id');
    });

    it('createSequentialIdFactory returns SequentialIdFactory', () => {
      const factory = createSequentialIdFactory('seq', 10);
      expect(factory.newId()).toBe('seq-000010');
    });

    it('createDeterministicIdFactory returns DeterministicIdFactory', () => {
      const factory = createDeterministicIdFactory('seed');
      const id = factory.newId();
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('INV-ADP-07: IdFactory determinism', () => {
    it('DeterministicIdFactory guarantees replay determinism', () => {
      const seed = 'REPLAY_TEST_SEED';
      
      // Simulate two separate runs with same seed
      const run1: string[] = [];
      const run2: string[] = [];
      
      const f1 = createDeterministicIdFactory(seed);
      const f2 = createDeterministicIdFactory(seed);
      
      for (let i = 0; i < 100; i++) {
        run1.push(f1.newId());
        run2.push(f2.newId());
      }
      
      expect(run1).toEqual(run2);
    });
  });
});
