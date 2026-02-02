/**
 * @fileoverview CLASSIFIER performance tests.
 * INV-CLASSIFIER-04: Performance <50ms per event
 * Target: 30 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createClassifier,
  createMatchAllRule,
  createDefaultRules,
} from '../../src/classifier/index.js';
import type { RuntimeEvent, ClassificationRule } from '../../src/types/index.js';

function createTestEvent(): RuntimeEvent {
  return {
    id: `evt-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    type: 'VERDICT_OBSERVED',
    verdict: {
      id: 'v-001',
      timestamp: Date.now() - 100,
      source: 'ORACLE',
      verdict: 'ACCEPT',
      payload: { data: 'test' },
      hash: 'perf-hash',
    },
    metadata: {
      observedAt: Date.now(),
      hash: 'event-hash',
    },
  };
}

describe('CLASSIFIER Performance', () => {
  const PERFORMANCE_THRESHOLD_MS = 50;
  const ITERATIONS = 100;

  describe('INV-CLASSIFIER-04: Single classification <50ms', () => {
    it('classifies event with no rules in <50ms', () => {
      const classifier = createClassifier();
      const event = createTestEvent();
      const start = performance.now();
      classifier.classify(event);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('classifies event with default rules in <50ms', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const event = createTestEvent();
      const start = performance.now();
      classifier.classify(event);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('classifies event with 10 rules in <50ms', () => {
      const classifier = createClassifier();
      for (let i = 0; i < 10; i++) {
        classifier.addRule(createMatchAllRule(`rule-${i}`, 'ACCEPT', i));
      }
      const event = createTestEvent();
      const start = performance.now();
      classifier.classify(event);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('classifies event with 50 rules in <50ms', () => {
      const classifier = createClassifier();
      for (let i = 0; i < 50; i++) {
        classifier.addRule(createMatchAllRule(`rule-${i}`, 'ACCEPT', i));
      }
      const event = createTestEvent();
      const start = performance.now();
      classifier.classify(event);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('classifies event with 100 rules in <50ms', () => {
      const classifier = createClassifier();
      for (let i = 0; i < 100; i++) {
        classifier.addRule(createMatchAllRule(`rule-${i}`, 'ACCEPT', i));
      }
      const event = createTestEvent();
      const start = performance.now();
      classifier.classify(event);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });

  describe('Batch performance', () => {
    it('processes 100 events with average <50ms each', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const events = Array.from({ length: ITERATIONS }, () => createTestEvent());

      const start = performance.now();
      for (const event of events) {
        classifier.classify(event);
      }
      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / ITERATIONS;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('maintains performance with complex rules', () => {
      const classifier = createClassifier();
      for (let i = 0; i < 50; i++) {
        classifier.addRule({
          id: `complex-${i}`,
          priority: i,
          condition: (e) => e.verdict.source === 'ORACLE' && e.verdict.verdict === 'ACCEPT',
          action: 'ACCEPT',
          weight: 0.5 + (i % 10) / 20,
        });
      }

      const events = Array.from({ length: ITERATIONS }, () => createTestEvent());
      const start = performance.now();
      for (const event of events) {
        classifier.classify(event);
      }
      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / ITERATIONS;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('maintains performance with varying events', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const verdicts: Array<'ACCEPT' | 'REJECT' | 'CONDITIONAL'> = ['ACCEPT', 'REJECT', 'CONDITIONAL'];

      const events = Array.from({ length: ITERATIONS }, (_, i) => ({
        ...createTestEvent(),
        verdict: {
          ...createTestEvent().verdict,
          verdict: verdicts[i % 3]!,
        },
      }));

      const start = performance.now();
      for (const event of events) {
        classifier.classify(event);
      }
      const totalDuration = performance.now() - start;
      const avgDuration = totalDuration / ITERATIONS;

      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });

  describe('Rule management performance', () => {
    it('adds 100 rules in <100ms', () => {
      const classifier = createClassifier();
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        classifier.addRule(createMatchAllRule(`rule-${i}`, 'ACCEPT', i));
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('removes rules efficiently', () => {
      const classifier = createClassifier();
      for (let i = 0; i < 100; i++) {
        classifier.addRule(createMatchAllRule(`rule-${i}`, 'ACCEPT', i));
      }

      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        classifier.removeRule(`rule-${i}`);
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('getRules is fast with many rules', () => {
      const classifier = createClassifier();
      for (let i = 0; i < 100; i++) {
        classifier.addRule(createMatchAllRule(`rule-${i}`, 'ACCEPT', i));
      }

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        classifier.getRules();
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Stress tests', () => {
    it('handles 1000 classifications without degradation', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const durations: number[] = [];

      for (let i = 0; i < 1000; i++) {
        const event = createTestEvent();
        const start = performance.now();
        classifier.classify(event);
        durations.push(performance.now() - start);
      }

      const first100Avg = durations.slice(0, 100).reduce((a, b) => a + b, 0) / 100;
      const last100Avg = durations.slice(-100).reduce((a, b) => a + b, 0) / 100;

      expect(last100Avg).toBeLessThan(first100Avg * 3 + 1);
    });

    it('maintains performance with rule churn', () => {
      const classifier = createClassifier();
      const durations: number[] = [];

      for (let i = 0; i < 100; i++) {
        classifier.addRule(createMatchAllRule(`rule-${i}`, 'ACCEPT', i));

        const event = createTestEvent();
        const start = performance.now();
        classifier.classify(event);
        durations.push(performance.now() - start);

        if (i > 10) {
          classifier.removeRule(`rule-${i - 10}`);
        }
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('consistent timing across many operations', () => {
      const classifier = createClassifier({ rules: createDefaultRules() });
      const durations: number[] = [];

      for (let i = 0; i < 100; i++) {
        const event = createTestEvent();
        const start = performance.now();
        classifier.classify(event);
        durations.push(performance.now() - start);
      }

      for (const duration of durations) {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      }
    });
  });

  describe('Memory efficiency', () => {
    it('handles clear and rebuild', () => {
      const classifier = createClassifier();

      for (let round = 0; round < 10; round++) {
        for (let i = 0; i < 50; i++) {
          classifier.addRule(createMatchAllRule(`rule-${round}-${i}`, 'ACCEPT', i));
        }
        classifier.clearRules();
      }

      expect(classifier.getRules()).toHaveLength(0);
    });

    it('processes events after many rule changes', () => {
      const classifier = createClassifier();

      for (let round = 0; round < 5; round++) {
        for (let i = 0; i < 20; i++) {
          classifier.addRule(createMatchAllRule(`rule-${round}-${i}`, 'ACCEPT', i));
        }

        const event = createTestEvent();
        const start = performance.now();
        classifier.classify(event);
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

        classifier.clearRules();
      }
    });
  });
});
