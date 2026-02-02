/**
 * @fileoverview End-to-end flow tests.
 * Tests complete decision pipeline.
 * Target: 30 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSentinel,
  createClassifier,
  createEscalationQueue,
  createIncidentLog,
  createDecisionTrace,
  createReviewInterface,
  createDefaultRules,
  outcomeFromClassification,
} from '../../src/index.js';
import type {
  Sentinel,
  Classifier,
  EscalationQueue,
  IncidentLog,
  DecisionTrace,
  ReviewInterface,
  BuildVerdict,
  Decision,
} from '../../src/index.js';

function createTestVerdict(overrides: Partial<BuildVerdict> = {}): BuildVerdict {
  return {
    id: `v-${Date.now()}-${Math.random().toString(36)}`,
    timestamp: Date.now(),
    source: 'ORACLE',
    verdict: 'ACCEPT',
    payload: { test: true },
    hash: `hash-${Math.random().toString(36)}`,
    ...overrides,
  };
}

describe('E2E Flow', () => {
  let sentinel: Sentinel;
  let classifier: Classifier;
  let queue: EscalationQueue;
  let incidentLog: IncidentLog;
  let trace: DecisionTrace;
  let review: ReviewInterface;

  beforeEach(() => {
    sentinel = createSentinel();
    classifier = createClassifier({ rules: createDefaultRules() });
    queue = createEscalationQueue();
    incidentLog = createIncidentLog();
    trace = createDecisionTrace();
    review = createReviewInterface({ queue });
  });

  function processVerdict(verdict: BuildVerdict): Decision {
    const event = sentinel.observeVerdict(verdict);
    const result = classifier.classify(event);

    const decision: Decision = {
      id: `dec-${Date.now()}-${Math.random().toString(36)}`,
      event,
      classification: result,
      outcome: outcomeFromClassification(result.classification),
      timestamp: Date.now(),
    };

    switch (result.classification) {
      case 'ACCEPT':
        // Accepted - just trace
        break;
      case 'ALERT':
        queue.enqueue(event, 50);
        break;
      case 'BLOCK':
        incidentLog.logIncident(event, result.reasoning);
        break;
    }

    trace.trace(decision);
    return decision;
  }

  describe('Complete flow', () => {
    it('processes ACCEPT verdict through pipeline', () => {
      const verdict = createTestVerdict({ verdict: 'ACCEPT' });
      const decision = processVerdict(verdict);

      expect(decision.outcome).toBe('ACCEPTED');
      expect(trace.size()).toBe(1);
      expect(queue.size()).toBe(0);
      expect(incidentLog.count()).toBe(0);
    });

    it('processes REJECT verdict through pipeline', () => {
      const verdict = createTestVerdict({ verdict: 'REJECT' });
      const decision = processVerdict(verdict);

      expect(decision.outcome).toBe('BLOCKED');
      expect(incidentLog.count()).toBe(1);
      expect(queue.size()).toBe(0);
    });

    it('processes CONDITIONAL verdict through pipeline', () => {
      const verdict = createTestVerdict({ verdict: 'CONDITIONAL' });
      const decision = processVerdict(verdict);

      expect(decision.outcome).toBe('ALERTED');
      expect(queue.size()).toBe(1);
      expect(incidentLog.count()).toBe(0);
    });

    it('processes multiple verdicts', () => {
      processVerdict(createTestVerdict({ verdict: 'ACCEPT' }));
      processVerdict(createTestVerdict({ verdict: 'REJECT' }));
      processVerdict(createTestVerdict({ verdict: 'CONDITIONAL' }));

      expect(trace.size()).toBe(3);
      expect(queue.size()).toBe(1);
      expect(incidentLog.count()).toBe(1);
    });
  });

  describe('Review flow', () => {
    it('approves escalated event', () => {
      const verdict = createTestVerdict({ verdict: 'CONDITIONAL' });
      processVerdict(verdict);

      const pending = review.getPendingReviews();
      expect(pending).toHaveLength(1);

      const entry = pending[0]!;
      review.approve(entry.id, 'human-reviewer', 'Approved after review');

      expect(review.getPendingReviews()).toHaveLength(0);
      expect(queue.getById(entry.id)?.status).toBe('RESOLVED');
    });

    it('rejects escalated event', () => {
      const verdict = createTestVerdict({ verdict: 'CONDITIONAL' });
      processVerdict(verdict);

      const entry = review.getPendingReviews()[0]!;
      review.reject(entry.id, 'human-reviewer', 'Rejected after review');

      expect(review.getPendingReviews()).toHaveLength(0);
    });

    it('defers and later approves', () => {
      const verdict = createTestVerdict({ verdict: 'CONDITIONAL' });
      processVerdict(verdict);

      const entry = review.getPendingReviews()[0]!;
      review.defer(entry.id, 'reviewer-1', 'Need more info');
      expect(review.getPendingReviews()).toHaveLength(1);

      review.approve(entry.id, 'reviewer-2', 'Info received, approved');
      expect(review.getPendingReviews()).toHaveLength(0);
    });
  });

  describe('Audit trail', () => {
    it('trace chain is valid after many operations', () => {
      for (let i = 0; i < 50; i++) {
        const verdictType = ['ACCEPT', 'REJECT', 'CONDITIONAL'][i % 3] as 'ACCEPT' | 'REJECT' | 'CONDITIONAL';
        processVerdict(createTestVerdict({ verdict: verdictType }));
      }

      expect(trace.verifyChain()).toBe(true);
    });

    it('incident hashes are valid', () => {
      for (let i = 0; i < 20; i++) {
        processVerdict(createTestVerdict({ verdict: 'REJECT' }));
      }

      expect(incidentLog.verifyIntegrity()).toBe(true);
    });

    it('review decisions are verifiable', () => {
      for (let i = 0; i < 10; i++) {
        processVerdict(createTestVerdict({ verdict: 'CONDITIONAL' }));
      }

      const pending = review.getPendingReviews();
      for (const entry of pending) {
        const decision = review.approve(entry.id, 'bulk-reviewer');
        expect(review.verifyDecision(decision)).toBe(true);
      }
    });

    it('exports consistent data', () => {
      processVerdict(createTestVerdict({ verdict: 'ACCEPT' }));
      processVerdict(createTestVerdict({ verdict: 'REJECT' }));
      processVerdict(createTestVerdict({ verdict: 'CONDITIONAL' }));

      const json1 = trace.exportTraces('json');
      const json2 = trace.exportTraces('json');
      expect(json1).toBe(json2);

      const csv1 = trace.exportTraces('csv');
      const csv2 = trace.exportTraces('csv');
      expect(csv1).toBe(csv2);
    });
  });

  describe('Statistics and snapshots', () => {
    it('sentinel stats reflect processing', () => {
      processVerdict(createTestVerdict({ source: 'ORACLE', verdict: 'ACCEPT' }));
      processVerdict(createTestVerdict({ source: 'ORACLE', verdict: 'REJECT' }));
      processVerdict(createTestVerdict({ source: 'DECISION_ENGINE', verdict: 'ACCEPT' }));

      const stats = sentinel.getStats();
      expect(stats.totalObserved).toBe(3);
      expect(stats.bySource['ORACLE']).toBe(2);
      expect(stats.bySource['DECISION_ENGINE']).toBe(1);
    });

    it('snapshot shows current state', () => {
      processVerdict(createTestVerdict());
      const snapshot = sentinel.getSnapshot();
      expect(snapshot.totalEvents).toBe(1);
      expect(snapshot.lastEventId).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('handles empty pipeline', () => {
      expect(trace.size()).toBe(0);
      expect(queue.size()).toBe(0);
      expect(incidentLog.count()).toBe(0);
      expect(review.getPendingReviews()).toHaveLength(0);
    });

    it('handles rapid processing', () => {
      for (let i = 0; i < 100; i++) {
        processVerdict(createTestVerdict());
      }

      expect(trace.size()).toBe(100);
    });

    it('handles mixed sources', () => {
      processVerdict(createTestVerdict({ source: 'ORACLE' }));
      processVerdict(createTestVerdict({ source: 'DECISION_ENGINE' }));

      expect(sentinel.getStats().bySource['ORACLE']).toBe(1);
      expect(sentinel.getStats().bySource['DECISION_ENGINE']).toBe(1);
    });
  });

  describe('Determinism', () => {
    it('same verdict produces consistent classification', () => {
      const verdict = createTestVerdict({ verdict: 'ACCEPT' });
      const event = sentinel.observeVerdict(verdict);

      const result1 = classifier.classify(event);
      const result2 = classifier.classify(event);

      expect(result1.classification).toBe(result2.classification);
      expect(result1.score).toBe(result2.score);
    });

    it('deterministic with fixed clock', () => {
      let time = 1000;
      const fixedSentinel = createSentinel({ clock: () => time++ });
      const fixedClassifier = createClassifier({
        clock: () => time++,
        rules: createDefaultRules(),
      });

      const verdict = createTestVerdict();
      const event = fixedSentinel.observeVerdict(verdict);
      const result = fixedClassifier.classify(event);

      expect(event.timestamp).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Data integrity', () => {
    it('queue entries reference correct events', () => {
      const verdict = createTestVerdict({ verdict: 'CONDITIONAL' });
      const event = sentinel.observeVerdict(verdict);
      classifier.classify(event);
      queue.enqueue(event, 50);

      const entry = queue.peek();
      expect(entry?.event.id).toBe(event.id);
      expect(entry?.event.verdict.id).toBe(verdict.id);
    });

    it('incident entries reference correct events', () => {
      const verdict = createTestVerdict({ verdict: 'REJECT' });
      const event = sentinel.observeVerdict(verdict);
      const result = classifier.classify(event);
      incidentLog.logIncident(event, result.reasoning);

      const incidents = incidentLog.getAll();
      expect(incidents[0]?.event.id).toBe(event.id);
    });

    it('trace entries reference correct decisions', () => {
      const verdict = createTestVerdict();
      const event = sentinel.observeVerdict(verdict);
      const result = classifier.classify(event);

      const decision: Decision = {
        id: 'test-decision',
        event,
        classification: result,
        outcome: outcomeFromClassification(result.classification),
        timestamp: Date.now(),
      };

      trace.trace(decision);

      const traceEntry = trace.getAll()[0];
      expect(traceEntry?.decision.id).toBe('test-decision');
      expect(traceEntry?.decision.event.id).toBe(event.id);
    });
  });
});
