/**
 * @fileoverview Review command utilities.
 * @module @omega/decision-engine/review/commands
 *
 * INV-REVIEW-03: No silent review
 */

import type { ReviewAction, ReviewRequest } from './types.js';

/**
 * Validates a reviewer ID.
 * @param reviewerId - Reviewer ID to validate
 * @returns True if valid
 */
export function isValidReviewerId(reviewerId: unknown): reviewerId is string {
  return (
    typeof reviewerId === 'string' &&
    reviewerId.length > 0 &&
    reviewerId.length <= 256
  );
}

/**
 * Validates a review action.
 * @param action - Action to validate
 * @returns True if valid
 */
export function isValidReviewAction(action: unknown): action is ReviewAction {
  return action === 'APPROVE' || action === 'REJECT' || action === 'DEFER';
}

/**
 * Validates a review request.
 * @param request - Request to validate
 * @returns True if valid
 */
export function isValidReviewRequest(request: unknown): request is ReviewRequest {
  if (typeof request !== 'object' || request === null) {
    return false;
  }

  const r = request as Record<string, unknown>;

  return (
    typeof r['entryId'] === 'string' &&
    r['entryId'].length > 0 &&
    isValidReviewerId(r['reviewerId']) &&
    isValidReviewAction(r['action']) &&
    (r['comment'] === undefined || typeof r['comment'] === 'string')
  );
}

/**
 * Creates an approve request.
 * @param entryId - Queue entry ID
 * @param reviewerId - Reviewer ID
 * @param comment - Optional comment
 * @returns Review request
 */
export function createApproveRequest(
  entryId: string,
  reviewerId: string,
  comment?: string
): ReviewRequest {
  return {
    entryId,
    reviewerId,
    action: 'APPROVE',
    comment,
  };
}

/**
 * Creates a reject request.
 * @param entryId - Queue entry ID
 * @param reviewerId - Reviewer ID
 * @param comment - Optional comment
 * @returns Review request
 */
export function createRejectRequest(
  entryId: string,
  reviewerId: string,
  comment?: string
): ReviewRequest {
  return {
    entryId,
    reviewerId,
    action: 'REJECT',
    comment,
  };
}

/**
 * Creates a defer request.
 * @param entryId - Queue entry ID
 * @param reviewerId - Reviewer ID
 * @param reason - Reason for deferral
 * @returns Review request
 */
export function createDeferRequest(
  entryId: string,
  reviewerId: string,
  reason: string
): ReviewRequest {
  return {
    entryId,
    reviewerId,
    action: 'DEFER',
    comment: reason,
  };
}

/**
 * Gets display name for review action.
 * @param action - Review action
 * @returns Display name
 */
export function getActionDisplayName(action: ReviewAction): string {
  switch (action) {
    case 'APPROVE':
      return 'Approved';
    case 'REJECT':
      return 'Rejected';
    case 'DEFER':
      return 'Deferred';
  }
}

/**
 * Determines if an action is terminal (ends review).
 * @param action - Review action
 * @returns True if terminal
 */
export function isTerminalAction(action: ReviewAction): boolean {
  return action === 'APPROVE' || action === 'REJECT';
}
