/**
 * @fileoverview SENTINEL unit tests.
 * Target: 50 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSentinel,
  DefaultSentinel,
  isValidBuildVerdict,
  generateEventId,
  computeEventHash,
  isHashPreserved,
  computeLatency,
  deepFreeze,
} from '../../src/sentinel/index.js';
import type { BuildVerdict } from '../../src/types/index.js';

function createTestVerdict(overrides: Partial<BuildVerdict> = {}): BuildVerdict {
  return {
    id: 'v-001',
    timestamp: 1000,
    source: 'ORACLE',
    verdict: 'ACCEPT',
    payload: { test: true },
    hash: 'abc123',
    ...overrides,
  };
}

describe('SENTINEL', () => {
  describe('createSentinel', () => {
    it('creates a sentinel instance', () => {
      const sentinel = createSentinel();
      expect(sentinel).toBeDefined();
    });

    it('creates sentinel with custom clock', () => {
      let time = 1000;
      const sentinel = createSentinel({ clock: () => time++ });
      const event = sentinel.observeVerdict(createTestVerdict());
      expect(event.timestamp).toBe(1000);
    });

    it('creates sentinel with custom ID generator', () => {
      const sentinel = createSentinel({ idGenerator: () => 'custom-id' });
      const event = sentinel.observeVerdict(createTestVerdict());
      expect(event.id).toBe('custom-id');
    });

    it('uses default clock if not provided', () => {
      const sentinel = createSentinel();
      const before = Date.now();
      const event = sentinel.observeVerdict(createTestVerdict());
      const after = Date.now();
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('DefaultSentinel', () => {
    let sentinel: DefaultSentinel;
    let time: number;

    beforeEach(() => {
      time = 1000;
      sentinel = new DefaultSentinel({ clock: () => time++ });
    });

    describe('observeVerdict', () => {
      it('observes an ORACLE verdict', () => {
        const verdict = createTestVerdict({ source: 'ORACLE' });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.source).toBe('ORACLE');
      });

      it('observes a DECISION_ENGINE verdict', () => {
        const verdict = createTestVerdict({ source: 'DECISION_ENGINE' });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.source).toBe('DECISION_ENGINE');
      });

      it('observes ACCEPT verdict', () => {
        const verdict = createTestVerdict({ verdict: 'ACCEPT' });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.verdict).toBe('ACCEPT');
      });

      it('observes REJECT verdict', () => {
        const verdict = createTestVerdict({ verdict: 'REJECT' });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.verdict).toBe('REJECT');
      });

      it('observes CONDITIONAL verdict', () => {
        const verdict = createTestVerdict({ verdict: 'CONDITIONAL' });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.verdict).toBe('CONDITIONAL');
      });

      it('generates unique event ID', () => {
        const verdict = createTestVerdict();
        const event1 = sentinel.observeVerdict(verdict);
        const event2 = sentinel.observeVerdict(verdict);
        expect(event1.id).not.toBe(event2.id);
      });

      it('sets event type to VERDICT_OBSERVED', () => {
        const event = sentinel.observeVerdict(createTestVerdict());
        expect(event.type).toBe('VERDICT_OBSERVED');
      });

      it('preserves original verdict hash', () => {
        const verdict = createTestVerdict({ hash: 'original-hash-123' });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.hash).toBe('original-hash-123');
      });

      it('preserves original verdict payload', () => {
        const payload = { key: 'value', nested: { data: true } };
        const verdict = createTestVerdict({ payload });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.payload).toEqual(payload);
      });

      it('sets observedAt in metadata', () => {
        const event = sentinel.observeVerdict(createTestVerdict());
        expect(event.metadata.observedAt).toBeDefined();
        expect(event.metadata.observedAt).toBeGreaterThan(0);
      });

      it('computes event hash', () => {
        const event = sentinel.observeVerdict(createTestVerdict());
        expect(event.metadata.hash).toBeDefined();
        expect(event.metadata.hash.length).toBeGreaterThan(0);
      });

      it('throws on invalid verdict - missing id', () => {
        const invalid = { ...createTestVerdict(), id: undefined } as unknown as BuildVerdict;
        expect(() => sentinel.observeVerdict(invalid)).toThrow();
      });

      it('throws on invalid verdict - missing timestamp', () => {
        const invalid = { ...createTestVerdict(), timestamp: undefined } as unknown as BuildVerdict;
        expect(() => sentinel.observeVerdict(invalid)).toThrow();
      });

      it('throws on invalid verdict - invalid source', () => {
        const invalid = { ...createTestVerdict(), source: 'INVALID' } as unknown as BuildVerdict;
        expect(() => sentinel.observeVerdict(invalid)).toThrow();
      });

      it('throws on invalid verdict - invalid verdict type', () => {
        const invalid = { ...createTestVerdict(), verdict: 'INVALID' } as unknown as BuildVerdict;
        expect(() => sentinel.observeVerdict(invalid)).toThrow();
      });

      it('throws on invalid verdict - missing hash', () => {
        const invalid = { ...createTestVerdict(), hash: undefined } as unknown as BuildVerdict;
        expect(() => sentinel.observeVerdict(invalid)).toThrow();
      });

      it('handles verdict with null payload', () => {
        const verdict = createTestVerdict({ payload: null });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.payload).toBeNull();
      });

      it('handles verdict with undefined payload', () => {
        const verdict = createTestVerdict({ payload: undefined });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.payload).toBeUndefined();
      });

      it('handles verdict with complex payload', () => {
        const payload = {
          array: [1, 2, 3],
          nested: { deep: { value: 'test' } },
          date: '2026-01-01',
        };
        const verdict = createTestVerdict({ payload });
        const event = sentinel.observeVerdict(verdict);
        expect(event.verdict.payload).toEqual(payload);
      });
    });

    describe('getSnapshot', () => {
      it('returns empty snapshot initially', () => {
        const snapshot = sentinel.getSnapshot();
        expect(snapshot.totalEvents).toBe(0);
        expect(snapshot.lastEventId).toBeNull();
        expect(snapshot.lastEventTimestamp).toBeNull();
      });

      it('returns snapshot with one event', () => {
        sentinel.observeVerdict(createTestVerdict());
        const snapshot = sentinel.getSnapshot();
        expect(snapshot.totalEvents).toBe(1);
        expect(snapshot.lastEventId).toBeDefined();
      });

      it('returns snapshot with multiple events', () => {
        sentinel.observeVerdict(createTestVerdict());
        sentinel.observeVerdict(createTestVerdict());
        sentinel.observeVerdict(createTestVerdict());
        const snapshot = sentinel.getSnapshot();
        expect(snapshot.totalEvents).toBe(3);
      });

      it('updates lastEventId correctly', () => {
        const event1 = sentinel.observeVerdict(createTestVerdict());
        const snapshot1 = sentinel.getSnapshot();
        expect(snapshot1.lastEventId).toBe(event1.id);

        const event2 = sentinel.observeVerdict(createTestVerdict());
        const snapshot2 = sentinel.getSnapshot();
        expect(snapshot2.lastEventId).toBe(event2.id);
      });

      it('includes snapshot timestamp', () => {
        const snapshot = sentinel.getSnapshot();
        expect(snapshot.snapshotTimestamp).toBeDefined();
      });
    });

    describe('getStats', () => {
      it('returns empty stats initially', () => {
        const stats = sentinel.getStats();
        expect(stats.totalObserved).toBe(0);
        expect(stats.avgLatencyMs).toBe(0);
        expect(stats.maxLatencyMs).toBe(0);
      });

      it('counts by source', () => {
        sentinel.observeVerdict(createTestVerdict({ source: 'ORACLE' }));
        sentinel.observeVerdict(createTestVerdict({ source: 'ORACLE' }));
        sentinel.observeVerdict(createTestVerdict({ source: 'DECISION_ENGINE' }));
        const stats = sentinel.getStats();
        expect(stats.bySource['ORACLE']).toBe(2);
        expect(stats.bySource['DECISION_ENGINE']).toBe(1);
      });

      it('counts by verdict', () => {
        sentinel.observeVerdict(createTestVerdict({ verdict: 'ACCEPT' }));
        sentinel.observeVerdict(createTestVerdict({ verdict: 'ACCEPT' }));
        sentinel.observeVerdict(createTestVerdict({ verdict: 'REJECT' }));
        const stats = sentinel.getStats();
        expect(stats.byVerdict['ACCEPT']).toBe(2);
        expect(stats.byVerdict['REJECT']).toBe(1);
      });

      it('tracks total observed', () => {
        sentinel.observeVerdict(createTestVerdict());
        sentinel.observeVerdict(createTestVerdict());
        const stats = sentinel.getStats();
        expect(stats.totalObserved).toBe(2);
      });
    });

    describe('reset', () => {
      it('clears all observations', () => {
        sentinel.observeVerdict(createTestVerdict());
        sentinel.observeVerdict(createTestVerdict());
        sentinel.reset();
        const snapshot = sentinel.getSnapshot();
        expect(snapshot.totalEvents).toBe(0);
      });

      it('clears statistics', () => {
        sentinel.observeVerdict(createTestVerdict());
        sentinel.reset();
        const stats = sentinel.getStats();
        expect(stats.totalObserved).toBe(0);
      });

      it('allows new observations after reset', () => {
        sentinel.observeVerdict(createTestVerdict());
        sentinel.reset();
        const event = sentinel.observeVerdict(createTestVerdict());
        expect(event).toBeDefined();
      });
    });
  });

  describe('isValidBuildVerdict', () => {
    it('returns true for valid verdict', () => {
      expect(isValidBuildVerdict(createTestVerdict())).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidBuildVerdict(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidBuildVerdict(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isValidBuildVerdict('string')).toBe(false);
      expect(isValidBuildVerdict(123)).toBe(false);
    });

    it('returns false for missing id', () => {
      const { id, ...rest } = createTestVerdict();
      expect(isValidBuildVerdict(rest)).toBe(false);
    });

    it('returns false for invalid source', () => {
      expect(isValidBuildVerdict({ ...createTestVerdict(), source: 'BAD' })).toBe(false);
    });

    it('returns false for invalid verdict', () => {
      expect(isValidBuildVerdict({ ...createTestVerdict(), verdict: 'BAD' })).toBe(false);
    });
  });

  describe('generateEventId', () => {
    it('generates id with default prefix', () => {
      const id = generateEventId();
      expect(id).toMatch(/^evt_/);
    });

    it('generates id with custom prefix', () => {
      const id = generateEventId('custom');
      expect(id).toMatch(/^custom_/);
    });

    it('generates unique ids', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateEventId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('isHashPreserved', () => {
    it('returns true when hash preserved', () => {
      const verdict = createTestVerdict({ hash: 'test-hash' });
      const sentinel = createSentinel();
      const event = sentinel.observeVerdict(verdict);
      expect(isHashPreserved(verdict, event)).toBe(true);
    });
  });

  describe('computeLatency', () => {
    it('computes positive latency', () => {
      expect(computeLatency(1000, 1500)).toBe(500);
    });

    it('returns 0 for same timestamps', () => {
      expect(computeLatency(1000, 1000)).toBe(0);
    });

    it('returns 0 for negative latency', () => {
      expect(computeLatency(1500, 1000)).toBe(0);
    });
  });

  describe('deepFreeze', () => {
    it('freezes object', () => {
      const obj = { a: 1 };
      deepFreeze(obj);
      expect(Object.isFrozen(obj)).toBe(true);
    });

    it('freezes nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      deepFreeze(obj);
      expect(Object.isFrozen(obj.a)).toBe(true);
      expect(Object.isFrozen(obj.a.b)).toBe(true);
    });

    it('handles arrays', () => {
      const obj = { arr: [1, 2, 3] };
      deepFreeze(obj);
      expect(Object.isFrozen(obj.arr)).toBe(true);
    });
  });
});
