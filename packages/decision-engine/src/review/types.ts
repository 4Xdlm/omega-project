/**
 * @fileoverview REVIEW module type definitions.
 * @module @omega/decision-engine/review/types
 */

import type { QueueEntry, ReviewDecision } from '../types/index.js';
import type { EscalationQueue } from '../queue/types.js';

/**
 * REVIEW_INTERFACE - API for human review of ALERT events.
 * INV-REVIEW-01: Decision = hash signed.
 * INV-REVIEW-02: History complete.
 * INV-REVIEW-03: No silent review.
 */
export interface ReviewInterface {
  /**
   * Approves a queue entry.
   * @param entryId - Queue entry ID
   * @param reviewerId - Reviewer identifier
   * @param comment - Optional comment
   * @returns Review decision
   */
  approve(entryId: string, reviewerId: string, comment?: string): ReviewDecision;

  /**
   * Rejects a queue entry.
   * @param entryId - Queue entry ID
   * @param reviewerId - Reviewer identifier
   * @param comment - Optional comment
   * @returns Review decision
   */
  reject(entryId: string, reviewerId: string, comment?: string): ReviewDecision;

  /**
   * Defers a queue entry.
   * @param entryId - Queue entry ID
   * @param reviewerId - Reviewer identifier
   * @param reason - Reason for deferral
   * @returns Review decision
   */
  defer(entryId: string, reviewerId: string, reason: string): ReviewDecision;

  /**
   * Gets pending reviews.
   * @returns Queue entries pending review
   */
  getPendingReviews(): readonly QueueEntry[];

  /**
   * Gets review history for an entry.
   * INV-REVIEW-02: Complete history.
   * @param entryId - Queue entry ID
   * @returns Review decisions for this entry
   */
  getReviewHistory(entryId: string): readonly ReviewDecision[];

  /**
   * Gets all review decisions.
   * @returns All review decisions
   */
  getAllDecisions(): readonly ReviewDecision[];

  /**
   * Verifies decision integrity.
   * INV-REVIEW-01: Hash verification.
   * @param decision - Decision to verify
   * @returns True if valid
   */
  verifyDecision(decision: ReviewDecision): boolean;
}

/**
 * Options for creating a ReviewInterface.
 */
export interface ReviewInterfaceOptions {
  /** Clock function for timestamps */
  readonly clock?: () => number;
  /** ID generator function */
  readonly idGenerator?: () => string;
  /** Queue to operate on */
  readonly queue: EscalationQueue;
}

/**
 * Review action type.
 */
export type ReviewAction = 'APPROVE' | 'REJECT' | 'DEFER';

/**
 * Review request for processing.
 */
export interface ReviewRequest {
  /** Queue entry ID */
  readonly entryId: string;
  /** Reviewer identifier */
  readonly reviewerId: string;
  /** Action to take */
  readonly action: ReviewAction;
  /** Optional comment/reason */
  readonly comment?: string;
}
