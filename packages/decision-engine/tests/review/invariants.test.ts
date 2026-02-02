/**
 * @fileoverview REVIEW invariant tests.
 * Tests for INV-REVIEW-01 through INV-REVIEW-03
 * Target: 15 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createReviewInterface,
  DefaultReviewInterface,
} from '../../src/review/index.js';
import { createEscalationQueue } from '../../src/queue/index.js';
import type { EscalationQueue } from '../../src/queue/index.js';
import type { RuntimeEvent } from '../../src/types/index.js';

function createTestEvent(id: string = 'evt-001'): RuntimeEvent {
  return {
    id,
    timestamp: 1000,
    type: 'VERDICT_OBSERVED',
    verdict: {
      id: 'v-001',
      timestamp: 999,
      source: 'ORACLE',
      verdict: 'CONDITIONAL',
      payload: {},
      hash: 'hash123',
    },
    metadata: { observedAt: 1000, hash: 'event-hash' },
  };
}

describe('REVIEW Invariants', () => {
  let queue: EscalationQueue;
  let review: DefaultReviewInterface;

  beforeEach(() => {
    queue = createEscalationQueue();
    review = new DefaultReviewInterface({ queue });
  });

  describe('INV-REVIEW-01: Decision = hash signed', () => {
    it('every decision has a hash', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      const decision = review.approve(entry.id, 'reviewer-1');

      expect(decision.hash).toBeDefined();
      expect(decision.hash.length).toBeGreaterThan(0);
    });

    it('hash is verifiable', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      const decision = review.approve(entry.id, 'reviewer-1');

      expect(review.verifyDecision(decision)).toBe(true);
    });

    it('different decisions have different hashes', () => {
      const e1 = queue.enqueue(createTestEvent('a'), 50);
      const e2 = queue.enqueue(createTestEvent('b'), 50);

      const d1 = review.approve(e1.id, 'reviewer-1');
      const d2 = review.approve(e2.id, 'reviewer-2');

      expect(d1.hash).not.toBe(d2.hash);
    });

    it('hash includes all decision fields', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      const d1 = review.defer(entry.id, 'reviewer-1', 'Comment A');
      const d2 = review.defer(entry.id, 'reviewer-1', 'Comment B');

      // Different comments should produce different hashes
      expect(d1.hash).not.toBe(d2.hash);
    });

    it('all decision types have valid hashes', () => {
      const e1 = queue.enqueue(createTestEvent('a'), 50);
      const e2 = queue.enqueue(createTestEvent('b'), 50);
      const e3 = queue.enqueue(createTestEvent('c'), 50);

      const approve = review.approve(e1.id, 'reviewer');
      const reject = review.reject(e2.id, 'reviewer');
      const defer = review.defer(e3.id, 'reviewer', 'Reason');

      expect(review.verifyDecision(approve)).toBe(true);
      expect(review.verifyDecision(reject)).toBe(true);
      expect(review.verifyDecision(defer)).toBe(true);
    });
  });

  describe('INV-REVIEW-02: History complete', () => {
    it('all decisions are recorded in history', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      review.defer(entry.id, 'reviewer-1', 'First');
      review.defer(entry.id, 'reviewer-2', 'Second');
      review.approve(entry.id, 'reviewer-3');

      const history = review.getReviewHistory(entry.id);
      expect(history).toHaveLength(3);
    });

    it('history maintains order', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      review.defer(entry.id, 'A', 'First');
      review.defer(entry.id, 'B', 'Second');
      review.defer(entry.id, 'C', 'Third');

      const history = review.getReviewHistory(entry.id);
      expect(history[0]?.reviewerId).toBe('A');
      expect(history[1]?.reviewerId).toBe('B');
      expect(history[2]?.reviewerId).toBe('C');
    });

    it('getAllDecisions includes all decisions', () => {
      const e1 = queue.enqueue(createTestEvent('a'), 50);
      const e2 = queue.enqueue(createTestEvent('b'), 50);

      review.approve(e1.id, 'reviewer-1');
      review.defer(e2.id, 'reviewer-2', 'Reason');
      review.approve(e2.id, 'reviewer-3');

      expect(review.getAllDecisions()).toHaveLength(3);
    });

    it('history is preserved after terminal action', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      review.defer(entry.id, 'reviewer-1', 'Deferred');
      review.approve(entry.id, 'reviewer-2');

      const history = review.getReviewHistory(entry.id);
      expect(history).toHaveLength(2);
      expect(history[0]?.action).toBe('DEFER');
      expect(history[1]?.action).toBe('APPROVE');
    });
  });

  describe('INV-REVIEW-03: No silent review', () => {
    it('approve updates queue status', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      review.approve(entry.id, 'reviewer-1');

      expect(queue.getById(entry.id)?.status).toBe('RESOLVED');
    });

    it('reject updates queue status', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      review.reject(entry.id, 'reviewer-1');

      expect(queue.getById(entry.id)?.status).toBe('RESOLVED');
    });

    it('defer updates queue status', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      queue.updateStatus(entry.id, 'REVIEWING');
      review.defer(entry.id, 'reviewer-1', 'Reason');

      expect(queue.getById(entry.id)?.status).toBe('PENDING');
    });

    it('every review action creates a decision record', () => {
      const entry = queue.enqueue(createTestEvent(), 50);
      const countBefore = review.getDecisionCount();

      review.defer(entry.id, 'reviewer-1', 'Reason');

      expect(review.getDecisionCount()).toBe(countBefore + 1);
    });

    it('getPendingReviews reflects status changes', () => {
      queue.enqueue(createTestEvent('a'), 50);
      const e2 = queue.enqueue(createTestEvent('b'), 50);

      expect(review.getPendingReviews()).toHaveLength(2);

      review.approve(e2.id, 'reviewer');

      expect(review.getPendingReviews()).toHaveLength(1);
    });
  });
});
