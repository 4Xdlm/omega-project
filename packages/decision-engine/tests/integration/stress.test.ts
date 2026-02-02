/**
 * @fileoverview Stress tests for performance validation.
 * Target: 1000+ events/sec throughput
 * Target: 10 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSentinel,
  createClassifier,
  createEscalationQueue,
  createIncidentLog,
  createDecisionTrace,
  createDefaultRules,
  outcomeFromClassification,
} from '../../src/index.js';
import type { BuildVerdict, Decision } from '../../src/index.js';

function createTestVerdict(i: number): BuildVerdict {
  const verdicts: Array<'ACCEPT' | 'REJECT' | 'CONDITIONAL'> = ['ACCEPT', 'REJECT', 'CONDITIONAL'];
  return {
    id: `v-${i}`,
    timestamp: Date.now(),
    source: i % 2 === 0 ? 'ORACLE' : 'DECISION_ENGINE',
    verdict: verdicts[i % 3]!,
    payload: { index: i },
    hash: `hash-${i}`,
  };
}

describe('Stress Tests', () => {
  describe('Throughput', () => {
    it('processes 1000 events within time budget', () => {
      const sentinel = createSentinel();
      const classifier = createClassifier({ rules: createDefaultRules() });
      const queue = createEscalationQueue();
      const incidentLog = createIncidentLog();
      const trace = createDecisionTrace();

      const verdicts = Array.from({ length: 1000 }, (_, i) => createTestVerdict(i));

      const start = performance.now();

      for (const verdict of verdicts) {
        const event = sentinel.observeVerdict(verdict);
        const result = classifier.classify(event);

        const decision: Decision = {
          id: `dec-${verdict.id}`,
          event,
          classification: result,
          outcome: outcomeFromClassification(result.classification),
          timestamp: Date.now(),
        };

        switch (result.classification) {
          case 'ALERT':
            queue.enqueue(event, 50);
            break;
          case 'BLOCK':
            incidentLog.logIncident(event, result.reasoning);
            break;
        }

        trace.trace(decision);
      }

      const duration = performance.now() - start;
      const eventsPerSecond = 1000 / (duration / 1000);

      // Should process at least 1000 events/second
      expect(eventsPerSecond).toBeGreaterThan(1000);
    });

    it('maintains performance over 5000 events', () => {
      const sentinel = createSentinel();
      const classifier = createClassifier({ rules: createDefaultRules() });

      const start = performance.now();

      for (let i = 0; i < 5000; i++) {
        const event = sentinel.observeVerdict(createTestVerdict(i));
        classifier.classify(event);
      }

      const duration = performance.now() - start;
      const avgPerEvent = duration / 5000;

      // Average should be under 1ms per event
      expect(avgPerEvent).toBeLessThan(1);
    });
  });

  describe('Memory stability', () => {
    it('handles repeated reset cycles', () => {
      const sentinel = createSentinel();

      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i < 1000; i++) {
          sentinel.observeVerdict(createTestVerdict(i));
        }
        sentinel.reset();
      }

      expect(sentinel.getStats().totalObserved).toBe(0);
    });

    it('queue handles churn', () => {
      const queue = createEscalationQueue();
      const sentinel = createSentinel();

      for (let i = 0; i < 1000; i++) {
        const event = sentinel.observeVerdict(createTestVerdict(i));
        queue.enqueue(event, i % 100);

        if (i > 100 && i % 2 === 0) {
          queue.dequeue();
        }
      }

      expect(queue.size()).toBeGreaterThan(0);
      expect(queue.validateIntegrity()).toBe(true);
    });
  });

  describe('Consistency under load', () => {
    it('trace chain remains valid after 1000 entries', () => {
      const sentinel = createSentinel();
      const classifier = createClassifier({ rules: createDefaultRules() });
      const trace = createDecisionTrace();

      for (let i = 0; i < 1000; i++) {
        const event = sentinel.observeVerdict(createTestVerdict(i));
        const result = classifier.classify(event);

        trace.trace({
          id: `dec-${i}`,
          event,
          classification: result,
          outcome: outcomeFromClassification(result.classification),
          timestamp: Date.now(),
        });
      }

      expect(trace.verifyChain()).toBe(true);
    });

    it('incident log maintains integrity under load', () => {
      const sentinel = createSentinel();
      const incidentLog = createIncidentLog();

      for (let i = 0; i < 500; i++) {
        const event = sentinel.observeVerdict(createTestVerdict(i));
        incidentLog.logIncident(event, `Reason ${i}`);
      }

      expect(incidentLog.verifyIntegrity()).toBe(true);
    });

    it('classifier is deterministic under load', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const sentinel = createSentinel();
      const event = sentinel.observeVerdict(createTestVerdict(0));

      const firstResult = classifier.classify(event);

      // Run many classifications in between
      for (let i = 1; i < 1000; i++) {
        const otherEvent = sentinel.observeVerdict(createTestVerdict(i));
        classifier.classify(otherEvent);
      }

      const laterResult = classifier.classify(event);

      expect(laterResult.classification).toBe(firstResult.classification);
      expect(laterResult.score).toBe(firstResult.score);
    });
  });

  describe('Concurrent-style operations', () => {
    it('handles interleaved operations', () => {
      const sentinel = createSentinel();
      const classifier = createClassifier({ rules: createDefaultRules() });
      const queue = createEscalationQueue();

      for (let i = 0; i < 500; i++) {
        // Interleave operations
        const event = sentinel.observeVerdict(createTestVerdict(i));
        classifier.classify(event);
        queue.enqueue(event, i);

        if (i > 10) {
          queue.dequeue();
        }

        sentinel.getStats();
        sentinel.getSnapshot();
      }

      expect(queue.validateIntegrity()).toBe(true);
    });

    it('handles rapid state queries', () => {
      const sentinel = createSentinel();

      for (let i = 0; i < 100; i++) {
        sentinel.observeVerdict(createTestVerdict(i));

        // Multiple queries between events
        for (let j = 0; j < 10; j++) {
          sentinel.getStats();
          sentinel.getSnapshot();
        }
      }

      expect(sentinel.getStats().totalObserved).toBe(100);
    });
  });
});
