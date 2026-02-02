/**
 * @fileoverview REVIEW_INTERFACE implementation - human review API.
 * @module @omega/decision-engine/review/review-interface
 *
 * INVARIANTS:
 * - INV-REVIEW-01: Decision = hash signed
 * - INV-REVIEW-02: History complete
 * - INV-REVIEW-03: No silent review
 */

import { hashJson } from '../util/hash.js';
import type { QueueEntry, ReviewDecision } from '../types/index.js';
import type { EscalationQueue } from '../queue/types.js';
import type { ReviewInterface, ReviewInterfaceOptions, ReviewAction } from './types.js';
import { isValidReviewerId, isTerminalAction } from './commands.js';

/**
 * Generates a review decision ID.
 */
function generateReviewId(clock: () => number): string {
  const timestamp = clock();
  const random = Math.floor(Math.random() * 1e9).toString(36);
  return `rev_${timestamp}_${random}`;
}

/**
 * Computes hash for a review decision.
 * INV-REVIEW-01: Decision hash computation.
 * @param decision - Decision without hash
 * @returns SHA-256 hash
 */
function computeReviewHash(decision: Omit<ReviewDecision, 'hash'>): string {
  return hashJson({
    id: decision.id,
    entryId: decision.entryId,
    action: decision.action,
    reviewerId: decision.reviewerId,
    comment: decision.comment,
    timestamp: decision.timestamp,
  });
}

/**
 * Default ReviewInterface implementation.
 * Provides human review API with hash-signed decisions.
 */
export class DefaultReviewInterface implements ReviewInterface {
  private readonly clock: () => number;
  private readonly idGenerator: () => string;
  private readonly queue: EscalationQueue;
  private readonly decisions: ReviewDecision[] = [];
  private readonly decisionsByEntry: Map<string, ReviewDecision[]> = new Map();

  constructor(options: ReviewInterfaceOptions) {
    this.clock = options.clock ?? (() => Date.now());
    this.idGenerator = options.idGenerator ?? (() => generateReviewId(this.clock));
    this.queue = options.queue;
  }

  /**
   * Approves a queue entry.
   */
  approve(entryId: string, reviewerId: string, comment?: string): ReviewDecision {
    return this.processReview(entryId, reviewerId, 'APPROVE', comment);
  }

  /**
   * Rejects a queue entry.
   */
  reject(entryId: string, reviewerId: string, comment?: string): ReviewDecision {
    return this.processReview(entryId, reviewerId, 'REJECT', comment);
  }

  /**
   * Defers a queue entry.
   */
  defer(entryId: string, reviewerId: string, reason: string): ReviewDecision {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Defer requires a reason');
    }
    return this.processReview(entryId, reviewerId, 'DEFER', reason);
  }

  /**
   * Processes a review action.
   * INV-REVIEW-01: Creates hash-signed decision.
   * INV-REVIEW-02: Records in history.
   * INV-REVIEW-03: Updates queue status.
   */
  private processReview(
    entryId: string,
    reviewerId: string,
    action: ReviewAction,
    comment?: string
  ): ReviewDecision {
    // Validate inputs
    if (!isValidReviewerId(reviewerId)) {
      throw new Error('Invalid reviewer ID');
    }

    // Get queue entry
    const entry = this.queue.getById(entryId);
    if (!entry) {
      throw new Error(`Queue entry not found: ${entryId}`);
    }

    // Check entry is reviewable
    if (entry.status === 'RESOLVED') {
      throw new Error(`Entry already resolved: ${entryId}`);
    }

    const id = this.idGenerator();
    const timestamp = this.clock();

    const decisionWithoutHash: Omit<ReviewDecision, 'hash'> = {
      id,
      entryId,
      action,
      reviewerId,
      comment,
      timestamp,
    };

    // INV-REVIEW-01: Compute hash
    const hash = computeReviewHash(decisionWithoutHash);

    const decision: ReviewDecision = Object.freeze({
      ...decisionWithoutHash,
      hash,
    });

    // INV-REVIEW-02: Record in history
    this.decisions.push(decision);
    const entryHistory = this.decisionsByEntry.get(entryId) ?? [];
    entryHistory.push(decision);
    this.decisionsByEntry.set(entryId, entryHistory);

    // INV-REVIEW-03: Update queue status
    if (isTerminalAction(action)) {
      this.queue.updateStatus(entryId, 'RESOLVED');
    } else {
      // DEFER keeps it pending
      this.queue.updateStatus(entryId, 'PENDING');
    }

    return decision;
  }

  /**
   * Gets pending reviews.
   */
  getPendingReviews(): readonly QueueEntry[] {
    const all = this.queue.getAll();
    return Object.freeze(
      all.filter(e => e.status === 'PENDING' || e.status === 'REVIEWING')
    );
  }

  /**
   * Gets review history for an entry.
   * INV-REVIEW-02: Complete history.
   */
  getReviewHistory(entryId: string): readonly ReviewDecision[] {
    const history = this.decisionsByEntry.get(entryId);
    return Object.freeze(history ? [...history] : []);
  }

  /**
   * Gets all review decisions.
   */
  getAllDecisions(): readonly ReviewDecision[] {
    return Object.freeze([...this.decisions]);
  }

  /**
   * Verifies decision integrity.
   * INV-REVIEW-01: Hash verification.
   */
  verifyDecision(decision: ReviewDecision): boolean {
    const expectedHash = computeReviewHash({
      id: decision.id,
      entryId: decision.entryId,
      action: decision.action,
      reviewerId: decision.reviewerId,
      comment: decision.comment,
      timestamp: decision.timestamp,
    });
    return decision.hash === expectedHash;
  }

  /**
   * Gets decision count.
   */
  getDecisionCount(): number {
    return this.decisions.length;
  }

  /**
   * Gets decision by ID.
   */
  getDecisionById(id: string): ReviewDecision | null {
    return this.decisions.find(d => d.id === id) ?? null;
  }
}

/**
 * Creates a new ReviewInterface instance.
 * @param options - Configuration options
 * @returns ReviewInterface instance
 */
export function createReviewInterface(options: ReviewInterfaceOptions): ReviewInterface {
  return new DefaultReviewInterface(options);
}
