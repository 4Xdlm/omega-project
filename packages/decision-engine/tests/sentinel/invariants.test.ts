/**
 * @fileoverview SENTINEL invariant tests.
 * Tests for INV-SENTINEL-01 through INV-SENTINEL-04
 * Target: 70 tests (20 invariants + 50 edge cases/concurrency)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSentinel,
  DefaultSentinel,
  isHashPreserved,
  computeLatency,
} from '../../src/sentinel/index.js';
import type { BuildVerdict, RuntimeEvent } from '../../src/types/index.js';

function createTestVerdict(overrides: Partial<BuildVerdict> = {}): BuildVerdict {
  return {
    id: `v-${Date.now()}-${Math.random().toString(36)}`,
    timestamp: Date.now() - 100,
    source: 'ORACLE',
    verdict: 'ACCEPT',
    payload: { test: true },
    hash: `hash-${Math.random().toString(36)}`,
    ...overrides,
  };
}

describe('SENTINEL Invariants', () => {
  describe('INV-SENTINEL-01: Read-only (never modifies verdict)', () => {
    it('does not modify original verdict object', () => {
      const sentinel = createSentinel();
      const original = createTestVerdict();
      const originalId = original.id;
      const originalHash = original.hash;

      sentinel.observeVerdict(original);

      expect(original.id).toBe(originalId);
      expect(original.hash).toBe(originalHash);
    });

    it('event contains copy of verdict, not reference', () => {
      const sentinel = createSentinel();
      const original = createTestVerdict();
      const event = sentinel.observeVerdict(original);

      // Should be frozen, so modification should fail silently or throw
      expect(() => {
        (event.verdict as BuildVerdict).id = 'modified';
      }).toThrow();
    });

    it('verdict payload is preserved exactly', () => {
      const sentinel = createSentinel();
      const payload = { key: 'value', num: 123, nested: { deep: true } };
      const verdict = createTestVerdict({ payload });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.payload).toEqual(payload);
    });

    it('multiple observations do not interfere', () => {
      const sentinel = createSentinel();
      const v1 = createTestVerdict({ id: 'v1', hash: 'h1' });
      const v2 = createTestVerdict({ id: 'v2', hash: 'h2' });

      const e1 = sentinel.observeVerdict(v1);
      const e2 = sentinel.observeVerdict(v2);

      expect(e1.verdict.id).toBe('v1');
      expect(e2.verdict.id).toBe('v2');
      expect(v1.id).toBe('v1');
      expect(v2.id).toBe('v2');
    });

    it('event is immutable (frozen)', () => {
      const sentinel = createSentinel();
      const event = sentinel.observeVerdict(createTestVerdict());

      expect(Object.isFrozen(event)).toBe(true);
    });

    it('event verdict is immutable', () => {
      const sentinel = createSentinel();
      const event = sentinel.observeVerdict(createTestVerdict());

      expect(Object.isFrozen(event.verdict)).toBe(true);
    });

    it('event metadata is immutable', () => {
      const sentinel = createSentinel();
      const event = sentinel.observeVerdict(createTestVerdict());

      expect(Object.isFrozen(event.metadata)).toBe(true);
    });
  });

  describe('INV-SENTINEL-02: Timestamp precision (±1ms)', () => {
    it('observedAt is within 5ms of actual time', () => {
      const sentinel = createSentinel();
      const before = Date.now();
      const event = sentinel.observeVerdict(createTestVerdict());
      const after = Date.now();

      expect(event.metadata.observedAt).toBeGreaterThanOrEqual(before);
      expect(event.metadata.observedAt).toBeLessThanOrEqual(after + 1);
    });

    it('event timestamp matches observedAt', () => {
      let time = 1000;
      const sentinel = createSentinel({ clock: () => time++ });
      const event = sentinel.observeVerdict(createTestVerdict());

      expect(event.timestamp).toBe(event.metadata.observedAt);
    });

    it('timestamps are monotonically increasing', () => {
      const sentinel = createSentinel();
      const events: RuntimeEvent[] = [];

      for (let i = 0; i < 10; i++) {
        events.push(sentinel.observeVerdict(createTestVerdict()));
      }

      for (let i = 1; i < events.length; i++) {
        expect(events[i]!.timestamp).toBeGreaterThanOrEqual(events[i - 1]!.timestamp);
      }
    });

    it('uses provided clock function', () => {
      let time = 5000;
      const sentinel = createSentinel({ clock: () => time++ });
      const event = sentinel.observeVerdict(createTestVerdict());

      expect(event.timestamp).toBe(5000);
    });

    it('snapshot timestamp is current', () => {
      let time = 1000;
      const sentinel = createSentinel({ clock: () => time++ });
      sentinel.observeVerdict(createTestVerdict());

      const snapshot = sentinel.getSnapshot();
      expect(snapshot.snapshotTimestamp).toBeGreaterThan(1000);
    });

    it('handles rapid observations with distinct timestamps', () => {
      let time = 0;
      const sentinel = createSentinel({ clock: () => time++ });
      const events: RuntimeEvent[] = [];

      for (let i = 0; i < 100; i++) {
        events.push(sentinel.observeVerdict(createTestVerdict()));
      }

      const timestamps = events.map(e => e.timestamp);
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBe(100);
    });
  });

  describe('INV-SENTINEL-03: Hash preservation (original → event)', () => {
    it('preserves exact hash from verdict', () => {
      const sentinel = createSentinel();
      const hash = 'exact-hash-to-preserve-123';
      const verdict = createTestVerdict({ hash });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.hash).toBe(hash);
    });

    it('isHashPreserved returns true for valid event', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ hash: 'test-hash' });
      const event = sentinel.observeVerdict(verdict);

      expect(isHashPreserved(verdict, event)).toBe(true);
    });

    it('preserves hash across multiple verdicts', () => {
      const sentinel = createSentinel();
      const hashes = ['hash1', 'hash2', 'hash3'];
      const events = hashes.map(hash =>
        sentinel.observeVerdict(createTestVerdict({ hash }))
      );

      events.forEach((event, i) => {
        expect(event.verdict.hash).toBe(hashes[i]);
      });
    });

    it('preserves long hash', () => {
      const sentinel = createSentinel();
      const longHash = 'a'.repeat(256);
      const verdict = createTestVerdict({ hash: longHash });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.hash).toBe(longHash);
    });

    it('preserves hash with special characters', () => {
      const sentinel = createSentinel();
      const hash = 'hash/with+special=chars&more!';
      const verdict = createTestVerdict({ hash });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.hash).toBe(hash);
    });

    it('event generates its own metadata hash', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ hash: 'original-hash' });
      const event = sentinel.observeVerdict(verdict);

      expect(event.metadata.hash).toBeDefined();
      expect(event.metadata.hash).not.toBe(verdict.hash);
    });
  });

  describe('INV-SENTINEL-04: Performance <10ms per verdict', () => {
    const THRESHOLD_MS = 10;

    it('single observation under 10ms', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict();

      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(THRESHOLD_MS);
    });

    it('maintains performance with large payload', () => {
      const sentinel = createSentinel();
      const largePayload = { data: 'x'.repeat(10000) };
      const verdict = createTestVerdict({ payload: largePayload });

      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(THRESHOLD_MS);
    });

    it('maintains performance after 1000 observations', () => {
      const sentinel = createSentinel();

      for (let i = 0; i < 1000; i++) {
        sentinel.observeVerdict(createTestVerdict());
      }

      const verdict = createTestVerdict();
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(THRESHOLD_MS);
    });
  });

  describe('Edge cases', () => {
    it('handles empty payload', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ payload: {} });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.payload).toEqual({});
    });

    it('handles array payload', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ payload: [1, 2, 3] });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.payload).toEqual([1, 2, 3]);
    });

    it('handles deeply nested payload', () => {
      const sentinel = createSentinel();
      const payload = { a: { b: { c: { d: { e: 'deep' } } } } };
      const verdict = createTestVerdict({ payload });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.payload).toEqual(payload);
    });

    it('handles boolean payload', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ payload: true });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.payload).toBe(true);
    });

    it('handles number payload', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ payload: 42 });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.payload).toBe(42);
    });

    it('handles string payload', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ payload: 'string' });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.payload).toBe('string');
    });

    it('handles very long id', () => {
      const sentinel = createSentinel();
      const longId = 'id-' + 'x'.repeat(1000);
      const verdict = createTestVerdict({ id: longId });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.id).toBe(longId);
    });

    it('handles unicode in payload', () => {
      const sentinel = createSentinel();
      const payload = { emoji: '🎉', chinese: '中文', arabic: 'العربية' };
      const verdict = createTestVerdict({ payload });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.payload).toEqual(payload);
    });

    it('handles timestamp at epoch', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ timestamp: 0 });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.timestamp).toBe(0);
    });

    it('handles very large timestamp', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ timestamp: Number.MAX_SAFE_INTEGER });
      const event = sentinel.observeVerdict(verdict);

      expect(event.verdict.timestamp).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('handles consecutive identical verdicts', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict();

      const e1 = sentinel.observeVerdict(verdict);
      const e2 = sentinel.observeVerdict(verdict);

      expect(e1.id).not.toBe(e2.id);
      expect(e1.verdict.hash).toBe(e2.verdict.hash);
    });
  });

  describe('Concurrency simulation', () => {
    it('handles rapid sequential observations', () => {
      const sentinel = createSentinel();
      const events: RuntimeEvent[] = [];

      for (let i = 0; i < 100; i++) {
        events.push(sentinel.observeVerdict(createTestVerdict()));
      }

      expect(events.length).toBe(100);
      const ids = new Set(events.map(e => e.id));
      expect(ids.size).toBe(100);
    });

    it('getSnapshot is consistent with observations', () => {
      const sentinel = createSentinel();

      sentinel.observeVerdict(createTestVerdict());
      expect(sentinel.getSnapshot().totalEvents).toBe(1);

      sentinel.observeVerdict(createTestVerdict());
      expect(sentinel.getSnapshot().totalEvents).toBe(2);
    });

    it('getStats is consistent with observations', () => {
      const sentinel = createSentinel();

      sentinel.observeVerdict(createTestVerdict({ source: 'ORACLE' }));
      expect(sentinel.getStats().bySource['ORACLE']).toBe(1);

      sentinel.observeVerdict(createTestVerdict({ source: 'ORACLE' }));
      expect(sentinel.getStats().bySource['ORACLE']).toBe(2);
    });

    it('reset clears all state atomically', () => {
      const sentinel = createSentinel();

      for (let i = 0; i < 50; i++) {
        sentinel.observeVerdict(createTestVerdict());
      }

      sentinel.reset();

      expect(sentinel.getSnapshot().totalEvents).toBe(0);
      expect(sentinel.getStats().totalObserved).toBe(0);
    });

    it('observations after reset start fresh', () => {
      const sentinel = createSentinel();

      sentinel.observeVerdict(createTestVerdict());
      sentinel.reset();
      const event = sentinel.observeVerdict(createTestVerdict());

      expect(sentinel.getSnapshot().totalEvents).toBe(1);
      expect(sentinel.getSnapshot().lastEventId).toBe(event.id);
    });

    it('handles interleaved getSnapshot calls', () => {
      const sentinel = createSentinel();

      sentinel.observeVerdict(createTestVerdict());
      const s1 = sentinel.getSnapshot();

      sentinel.observeVerdict(createTestVerdict());
      const s2 = sentinel.getSnapshot();

      sentinel.observeVerdict(createTestVerdict());
      const s3 = sentinel.getSnapshot();

      expect(s1.totalEvents).toBe(1);
      expect(s2.totalEvents).toBe(2);
      expect(s3.totalEvents).toBe(3);
    });

    it('handles interleaved getStats calls', () => {
      const sentinel = createSentinel();

      sentinel.observeVerdict(createTestVerdict({ verdict: 'ACCEPT' }));
      expect(sentinel.getStats().byVerdict['ACCEPT']).toBe(1);

      sentinel.observeVerdict(createTestVerdict({ verdict: 'REJECT' }));
      expect(sentinel.getStats().byVerdict['REJECT']).toBe(1);

      sentinel.observeVerdict(createTestVerdict({ verdict: 'ACCEPT' }));
      expect(sentinel.getStats().byVerdict['ACCEPT']).toBe(2);
    });

    it('maintains data integrity under stress', () => {
      const sentinel = createSentinel();
      const expectedCounts = { ORACLE: 0, DECISION_ENGINE: 0 };

      for (let i = 0; i < 1000; i++) {
        const source = i % 2 === 0 ? 'ORACLE' : 'DECISION_ENGINE';
        sentinel.observeVerdict(createTestVerdict({ source }));
        expectedCounts[source]++;
      }

      const stats = sentinel.getStats();
      expect(stats.bySource['ORACLE']).toBe(expectedCounts.ORACLE);
      expect(stats.bySource['DECISION_ENGINE']).toBe(expectedCounts.DECISION_ENGINE);
    });
  });

  describe('computeLatency', () => {
    it('computes correct latency for normal case', () => {
      expect(computeLatency(1000, 1100)).toBe(100);
    });

    it('returns 0 for simultaneous timestamps', () => {
      expect(computeLatency(1000, 1000)).toBe(0);
    });

    it('returns 0 for future verdict (clock skew)', () => {
      expect(computeLatency(2000, 1000)).toBe(0);
    });

    it('handles large time differences', () => {
      expect(computeLatency(0, 1000000)).toBe(1000000);
    });
  });
});
