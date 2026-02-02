/**
 * @fileoverview REVIEW_INTERFACE unit tests.
 * Target: 50 tests
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

describe('REVIEW_INTERFACE', () => {
  let queue: EscalationQueue;

  beforeEach(() => {
    queue = createEscalationQueue();
  });

  describe('createReviewInterface', () => {
    it('creates a review interface', () => {
      const review = createReviewInterface({ queue });
      expect(review).toBeDefined();
    });

    it('creates with custom clock', () => {
      let time = 5000;
      const review = createReviewInterface({
        queue,
        clock: () => time++,
      });
      const entry = queue.enqueue(createTestEvent(), 50);
      const decision = review.approve(entry.id, 'reviewer-1');
      expect(decision.timestamp).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('DefaultReviewInterface', () => {
    let review: DefaultReviewInterface;

    beforeEach(() => {
      review = new DefaultReviewInterface({ queue });
    });

    describe('approve', () => {
      it('approves a queue entry', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        const decision = review.approve(entry.id, 'reviewer-1');

        expect(decision.action).toBe('APPROVE');
        expect(decision.entryId).toBe(entry.id);
      });

      it('assigns reviewer ID', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        const decision = review.approve(entry.id, 'john-doe');

        expect(decision.reviewerId).toBe('john-doe');
      });

      it('records optional comment', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        const decision = review.approve(entry.id, 'reviewer-1', 'Looks good');

        expect(decision.comment).toBe('Looks good');
      });

      it('resolves the queue entry', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.approve(entry.id, 'reviewer-1');

        expect(queue.getById(entry.id)?.status).toBe('RESOLVED');
      });

      it('computes hash', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        const decision = review.approve(entry.id, 'reviewer-1');

        expect(decision.hash).toBeDefined();
        expect(decision.hash.length).toBeGreaterThan(0);
      });

      it('throws for non-existent entry', () => {
        expect(() => review.approve('does-not-exist', 'reviewer-1')).toThrow();
      });

      it('throws for already resolved entry', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.approve(entry.id, 'reviewer-1');

        expect(() => review.approve(entry.id, 'reviewer-2')).toThrow();
      });

      it('throws for invalid reviewer ID', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        expect(() => review.approve(entry.id, '')).toThrow();
      });
    });

    describe('reject', () => {
      it('rejects a queue entry', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        const decision = review.reject(entry.id, 'reviewer-1');

        expect(decision.action).toBe('REJECT');
      });

      it('resolves the queue entry', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.reject(entry.id, 'reviewer-1');

        expect(queue.getById(entry.id)?.status).toBe('RESOLVED');
      });

      it('records optional comment', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        const decision = review.reject(entry.id, 'reviewer-1', 'Not valid');

        expect(decision.comment).toBe('Not valid');
      });
    });

    describe('defer', () => {
      it('defers a queue entry', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        const decision = review.defer(entry.id, 'reviewer-1', 'Need more info');

        expect(decision.action).toBe('DEFER');
      });

      it('keeps entry pending', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.defer(entry.id, 'reviewer-1', 'Need more info');

        expect(queue.getById(entry.id)?.status).toBe('PENDING');
      });

      it('requires reason', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        expect(() => review.defer(entry.id, 'reviewer-1', '')).toThrow();
      });

      it('stores reason as comment', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        const decision = review.defer(entry.id, 'reviewer-1', 'Waiting for clarification');

        expect(decision.comment).toBe('Waiting for clarification');
      });

      it('allows multiple deferrals', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.defer(entry.id, 'reviewer-1', 'First deferral');
        review.defer(entry.id, 'reviewer-2', 'Second deferral');

        const history = review.getReviewHistory(entry.id);
        expect(history).toHaveLength(2);
      });
    });

    describe('getPendingReviews', () => {
      it('returns empty array when no pending', () => {
        expect(review.getPendingReviews()).toEqual([]);
      });

      it('returns pending entries', () => {
        queue.enqueue(createTestEvent('a'), 50);
        queue.enqueue(createTestEvent('b'), 50);

        expect(review.getPendingReviews()).toHaveLength(2);
      });

      it('excludes resolved entries', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.approve(entry.id, 'reviewer-1');

        expect(review.getPendingReviews()).toHaveLength(0);
      });

      it('includes reviewing status', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        queue.updateStatus(entry.id, 'REVIEWING');

        expect(review.getPendingReviews()).toHaveLength(1);
      });

      it('returns frozen array', () => {
        queue.enqueue(createTestEvent(), 50);
        expect(Object.isFrozen(review.getPendingReviews())).toBe(true);
      });
    });

    describe('getReviewHistory', () => {
      it('returns empty array for no history', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        expect(review.getReviewHistory(entry.id)).toEqual([]);
      });

      it('returns all decisions for entry', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.defer(entry.id, 'reviewer-1', 'Deferred');
        review.approve(entry.id, 'reviewer-2');

        expect(review.getReviewHistory(entry.id)).toHaveLength(2);
      });

      it('returns decisions in order', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.defer(entry.id, 'reviewer-1', 'First');
        review.defer(entry.id, 'reviewer-2', 'Second');

        const history = review.getReviewHistory(entry.id);
        expect(history[0]?.comment).toBe('First');
        expect(history[1]?.comment).toBe('Second');
      });

      it('returns frozen array', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.approve(entry.id, 'reviewer-1');
        expect(Object.isFrozen(review.getReviewHistory(entry.id))).toBe(true);
      });
    });

    describe('getAllDecisions', () => {
      it('returns empty array initially', () => {
        expect(review.getAllDecisions()).toEqual([]);
      });

      it('returns all decisions', () => {
        const e1 = queue.enqueue(createTestEvent('a'), 50);
        const e2 = queue.enqueue(createTestEvent('b'), 50);

        review.approve(e1.id, 'reviewer-1');
        review.reject(e2.id, 'reviewer-2');

        expect(review.getAllDecisions()).toHaveLength(2);
      });

      it('returns frozen array', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        review.approve(entry.id, 'reviewer-1');
        expect(Object.isFrozen(review.getAllDecisions())).toBe(true);
      });
    });

    describe('verifyDecision', () => {
      it('returns true for valid decision', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        const decision = review.approve(entry.id, 'reviewer-1');

        expect(review.verifyDecision(decision)).toBe(true);
      });

      it('verifies all decisions', () => {
        const e1 = queue.enqueue(createTestEvent('a'), 50);
        const e2 = queue.enqueue(createTestEvent('b'), 50);
        const e3 = queue.enqueue(createTestEvent('c'), 50);

        const d1 = review.approve(e1.id, 'reviewer-1');
        const d2 = review.reject(e2.id, 'reviewer-2');
        const d3 = review.defer(e3.id, 'reviewer-3', 'Reason');

        expect(review.verifyDecision(d1)).toBe(true);
        expect(review.verifyDecision(d2)).toBe(true);
        expect(review.verifyDecision(d3)).toBe(true);
      });
    });

    describe('getDecisionCount', () => {
      it('returns 0 initially', () => {
        expect(review.getDecisionCount()).toBe(0);
      });

      it('counts all decisions', () => {
        const e1 = queue.enqueue(createTestEvent('a'), 50);
        const e2 = queue.enqueue(createTestEvent('b'), 50);

        review.approve(e1.id, 'reviewer-1');
        review.defer(e2.id, 'reviewer-2', 'Reason');
        review.approve(e2.id, 'reviewer-3');

        expect(review.getDecisionCount()).toBe(3);
      });
    });
  });
});
