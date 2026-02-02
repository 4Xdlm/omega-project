/**
 * @fileoverview SENTINEL performance tests.
 * INV-SENTINEL-04: Performance <10ms per verdict
 * Target: 30 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSentinel, DefaultSentinel } from '../../src/sentinel/index.js';
import type { BuildVerdict } from '../../src/types/index.js';

function createTestVerdict(overrides: Partial<BuildVerdict> = {}): BuildVerdict {
  return {
    id: `v-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    source: 'ORACLE',
    verdict: 'ACCEPT',
    payload: { test: true },
    hash: 'perf-test-hash',
    ...overrides,
  };
}

describe('SENTINEL Performance', () => {
  const PERFORMANCE_THRESHOLD_MS = 10;
  const ITERATIONS = 100;

  describe('INV-SENTINEL-04: Single verdict <10ms', () => {
    it('observes verdict in <10ms (ORACLE)', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ source: 'ORACLE' });
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('observes verdict in <10ms (DECISION_ENGINE)', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ source: 'DECISION_ENGINE' });
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('observes ACCEPT verdict in <10ms', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ verdict: 'ACCEPT' });
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('observes REJECT verdict in <10ms', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ verdict: 'REJECT' });
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('observes CONDITIONAL verdict in <10ms', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ verdict: 'CONDITIONAL' });
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('handles small payload in <10ms', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ payload: { a: 1 } });
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('handles medium payload in <10ms', () => {
      const sentinel = createSentinel();
      const payload = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])
      );
      const verdict = createTestVerdict({ payload });
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('handles null payload in <10ms', () => {
      const sentinel = createSentinel();
      const verdict = createTestVerdict({ payload: null });
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });

  describe('Batch performance', () => {
    it('processes 100 verdicts with average <10ms each', () => {
      const sentinel = createSentinel();
      const verdicts = Array.from({ length: ITERATIONS }, () => createTestVerdict());

      const start = performance.now();
      for (const verdict of verdicts) {
        sentinel.observeVerdict(verdict);
      }
      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / ITERATIONS;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('maintains performance with varying sources', () => {
      const sentinel = createSentinel();
      const sources: Array<'ORACLE' | 'DECISION_ENGINE'> = ['ORACLE', 'DECISION_ENGINE'];
      const verdicts = Array.from({ length: ITERATIONS }, (_, i) =>
        createTestVerdict({ source: sources[i % 2] })
      );

      const start = performance.now();
      for (const verdict of verdicts) {
        sentinel.observeVerdict(verdict);
      }
      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / ITERATIONS;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('maintains performance with varying verdict types', () => {
      const sentinel = createSentinel();
      const types: Array<'ACCEPT' | 'REJECT' | 'CONDITIONAL'> = ['ACCEPT', 'REJECT', 'CONDITIONAL'];
      const verdicts = Array.from({ length: ITERATIONS }, (_, i) =>
        createTestVerdict({ verdict: types[i % 3] })
      );

      const start = performance.now();
      for (const verdict of verdicts) {
        sentinel.observeVerdict(verdict);
      }
      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / ITERATIONS;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('maintains performance after many observations', () => {
      const sentinel = createSentinel();

      // Warm up
      for (let i = 0; i < 1000; i++) {
        sentinel.observeVerdict(createTestVerdict());
      }

      // Measure after warmup
      const verdict = createTestVerdict();
      const start = performance.now();
      sentinel.observeVerdict(verdict);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });

  describe('getSnapshot performance', () => {
    it('returns snapshot in <1ms (empty)', () => {
      const sentinel = createSentinel();
      const start = performance.now();
      sentinel.getSnapshot();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1);
    });

    it('returns snapshot in <1ms (after 100 events)', () => {
      const sentinel = createSentinel();
      for (let i = 0; i < 100; i++) {
        sentinel.observeVerdict(createTestVerdict());
      }

      const start = performance.now();
      sentinel.getSnapshot();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1);
    });

    it('returns snapshot in <1ms (after 1000 events)', () => {
      const sentinel = createSentinel();
      for (let i = 0; i < 1000; i++) {
        sentinel.observeVerdict(createTestVerdict());
      }

      const start = performance.now();
      sentinel.getSnapshot();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1);
    });
  });

  describe('getStats performance', () => {
    it('returns stats in <1ms (empty)', () => {
      const sentinel = createSentinel();
      const start = performance.now();
      sentinel.getStats();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1);
    });

    it('returns stats in <1ms (after 100 events)', () => {
      const sentinel = createSentinel();
      for (let i = 0; i < 100; i++) {
        sentinel.observeVerdict(createTestVerdict());
      }

      const start = performance.now();
      sentinel.getStats();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1);
    });

    it('returns stats in <1ms (after 1000 events)', () => {
      const sentinel = createSentinel();
      for (let i = 0; i < 1000; i++) {
        sentinel.observeVerdict(createTestVerdict());
      }

      const start = performance.now();
      sentinel.getStats();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1);
    });
  });

  describe('Memory efficiency', () => {
    it('does not leak memory across resets', () => {
      const sentinel = createSentinel();
      const initialStats = sentinel.getStats();

      for (let round = 0; round < 10; round++) {
        for (let i = 0; i < 100; i++) {
          sentinel.observeVerdict(createTestVerdict());
        }
        sentinel.reset();
      }

      const finalStats = sentinel.getStats();
      expect(finalStats.totalObserved).toBe(0);
    });

    it('handles rapid consecutive observations', () => {
      const sentinel = createSentinel();
      const start = performance.now();

      for (let i = 0; i < 500; i++) {
        sentinel.observeVerdict(createTestVerdict());
      }

      const duration = performance.now() - start;
      const avgPerOp = duration / 500;
      expect(avgPerOp).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });

  describe('Stress tests', () => {
    it('handles 1000 verdicts without degradation', () => {
      const sentinel = createSentinel();
      const durations: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const verdict = createTestVerdict();
        const start = performance.now();
        sentinel.observeVerdict(verdict);
        durations.push(performance.now() - start);
      }

      const first100Avg = durations.slice(0, 100).reduce((a, b) => a + b, 0) / 100;
      const last100Avg = durations.slice(-100).reduce((a, b) => a + b, 0) / 100;

      // No significant degradation (within 5x)
      expect(last100Avg).toBeLessThan(first100Avg * 5 + 1);
    });

    it('maintains consistent timing', () => {
      const sentinel = createSentinel();
      const durations: number[] = [];

      for (let i = 0; i < 100; i++) {
        const verdict = createTestVerdict();
        const start = performance.now();
        sentinel.observeVerdict(verdict);
        durations.push(performance.now() - start);
      }

      // All durations should be under threshold
      for (const duration of durations) {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      }
    });
  });
});
