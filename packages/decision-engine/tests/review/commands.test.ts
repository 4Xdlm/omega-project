/**
 * @fileoverview REVIEW commands tests.
 * Target: 15 tests
 */

import { describe, it, expect } from 'vitest';
import {
  isValidReviewerId,
  isValidReviewAction,
  isValidReviewRequest,
  createApproveRequest,
  createRejectRequest,
  createDeferRequest,
  getActionDisplayName,
  isTerminalAction,
} from '../../src/review/index.js';

describe('REVIEW Commands', () => {
  describe('isValidReviewerId', () => {
    it('returns true for valid ID', () => {
      expect(isValidReviewerId('reviewer-1')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidReviewerId('')).toBe(false);
    });

    it('returns false for non-string', () => {
      expect(isValidReviewerId(123)).toBe(false);
      expect(isValidReviewerId(null)).toBe(false);
    });

    it('returns false for very long ID', () => {
      expect(isValidReviewerId('x'.repeat(300))).toBe(false);
    });
  });

  describe('isValidReviewAction', () => {
    it('returns true for APPROVE', () => {
      expect(isValidReviewAction('APPROVE')).toBe(true);
    });

    it('returns true for REJECT', () => {
      expect(isValidReviewAction('REJECT')).toBe(true);
    });

    it('returns true for DEFER', () => {
      expect(isValidReviewAction('DEFER')).toBe(true);
    });

    it('returns false for invalid action', () => {
      expect(isValidReviewAction('INVALID')).toBe(false);
    });
  });

  describe('isValidReviewRequest', () => {
    it('returns true for valid request', () => {
      const request = {
        entryId: 'entry-1',
        reviewerId: 'reviewer-1',
        action: 'APPROVE',
      };
      expect(isValidReviewRequest(request)).toBe(true);
    });

    it('returns false for missing entryId', () => {
      const request = {
        reviewerId: 'reviewer-1',
        action: 'APPROVE',
      };
      expect(isValidReviewRequest(request)).toBe(false);
    });

    it('returns false for invalid action', () => {
      const request = {
        entryId: 'entry-1',
        reviewerId: 'reviewer-1',
        action: 'INVALID',
      };
      expect(isValidReviewRequest(request)).toBe(false);
    });

    it('allows optional comment', () => {
      const request = {
        entryId: 'entry-1',
        reviewerId: 'reviewer-1',
        action: 'APPROVE',
        comment: 'Looks good',
      };
      expect(isValidReviewRequest(request)).toBe(true);
    });
  });

  describe('createApproveRequest', () => {
    it('creates approve request', () => {
      const request = createApproveRequest('entry-1', 'reviewer-1');
      expect(request.action).toBe('APPROVE');
      expect(request.entryId).toBe('entry-1');
      expect(request.reviewerId).toBe('reviewer-1');
    });

    it('includes optional comment', () => {
      const request = createApproveRequest('entry-1', 'reviewer-1', 'Comment');
      expect(request.comment).toBe('Comment');
    });
  });

  describe('createRejectRequest', () => {
    it('creates reject request', () => {
      const request = createRejectRequest('entry-1', 'reviewer-1');
      expect(request.action).toBe('REJECT');
    });
  });

  describe('createDeferRequest', () => {
    it('creates defer request with reason', () => {
      const request = createDeferRequest('entry-1', 'reviewer-1', 'Need more info');
      expect(request.action).toBe('DEFER');
      expect(request.comment).toBe('Need more info');
    });
  });

  describe('getActionDisplayName', () => {
    it('returns Approved for APPROVE', () => {
      expect(getActionDisplayName('APPROVE')).toBe('Approved');
    });

    it('returns Rejected for REJECT', () => {
      expect(getActionDisplayName('REJECT')).toBe('Rejected');
    });

    it('returns Deferred for DEFER', () => {
      expect(getActionDisplayName('DEFER')).toBe('Deferred');
    });
  });

  describe('isTerminalAction', () => {
    it('returns true for APPROVE', () => {
      expect(isTerminalAction('APPROVE')).toBe(true);
    });

    it('returns true for REJECT', () => {
      expect(isTerminalAction('REJECT')).toBe(true);
    });

    it('returns false for DEFER', () => {
      expect(isTerminalAction('DEFER')).toBe(false);
    });
  });
});
