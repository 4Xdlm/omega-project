/**
 * DRIFT DETECTOR
 * Phase E.1 — Minimal detector implementation
 *
 * INV-DRIFT-001: Read-only (never modifies BUILD artifacts)
 * INV-DRIFT-002: Policy-driven thresholds
 * INV-DRIFT-003: Deterministic detection
 * INV-DRIFT-004: Chain breaks escalate to HALT
 * INV-DRIFT-005: All events include manifest_ref
 */

import * as crypto from 'crypto';
import type {
  DriftEvent,
  DriftPolicy,
  DriftType,
  EscalationLevel,
  DetectionResult
} from './DRIFT_TYPES.spec';
import { ESCALATION_MATRIX, ESCALATION_ORDER } from './ESCALATION.spec';
import { HASH_PATTERN } from './VALIDATION.spec';

// ─────────────────────────────────────────────────────────────
// HASH UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Compute SHA256 hash of content
 * INV-DRIFT-003: Deterministic
 */
export function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').toUpperCase();
}

/**
 * Validate hash format (64 hex characters)
 */
export function validateHash(hash: unknown): boolean {
  if (typeof hash !== 'string') return false;
  return HASH_PATTERN.test(hash);
}

/**
 * Compare hashes case-insensitively
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1.toUpperCase() === hash2.toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// DRIFT DETECTOR
// ─────────────────────────────────────────────────────────────

export class DriftDetector {
  private readonly policy: DriftPolicy;
  private eventCounter = 0;

  constructor(policy: DriftPolicy) {
    this.policy = policy;
  }

  /**
   * Get policy (INV-DRIFT-002: thresholds from policy)
   */
  getPolicy(): DriftPolicy {
    return this.policy;
  }

  /**
   * Detect drift in single artifact
   * INV-DRIFT-001: Read-only
   * INV-DRIFT-003: Deterministic
   */
  detectSingle(
    content: string,
    expectedHash: string,
    filePath: string,
    manifestRef: { tag: string; manifest_sha256: string }
  ): DriftEvent | null {
    const actualHash = computeHash(content);

    if (compareHashes(actualHash, expectedHash)) {
      return null; // No drift
    }

    // INV-DRIFT-005: Include manifest_ref
    return this.createDriftEvent(
      'HASH_DEVIATION',
      filePath,
      expectedHash,
      actualHash,
      manifestRef,
      `Hash mismatch: expected ${expectedHash.slice(0, 8)}..., got ${actualHash.slice(0, 8)}...`
    );
  }

  /**
   * Detect drift across multiple artifacts
   */
  detectBatch(
    artifacts: Array<{ content: string; path: string; expectedHash: string }>,
    manifestRef: { tag: string; manifest_sha256: string }
  ): DetectionResult {
    const events: DriftEvent[] = [];

    for (const artifact of artifacts) {
      const event = this.detectSingle(
        artifact.content,
        artifact.expectedHash,
        artifact.path,
        manifestRef
      );
      if (event) {
        events.push(event);
      }
    }

    return {
      detected: events.length > 0,
      events,
      summary: {
        total_checks: artifacts.length,
        drifts_found: events.length,
        max_escalation: this.getMaxEscalation(events)
      }
    };
  }

  /**
   * Validate hash chain integrity
   * INV-DRIFT-004: Chain breaks escalate to HALT
   */
  validateChain(events: DriftEvent[]): DriftEvent | null {
    if (events.length === 0) return null;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if (i === 0) {
        // First event must have null prev_hash
        if (event.log_chain_prev_hash !== null) {
          return this.createChainBreakEvent(event, 'First event has non-null prev_hash');
        }
      } else {
        // Subsequent events must chain to previous
        const prevEvent = events[i - 1];
        const expectedPrevHash = this.computeEventHash(prevEvent);

        if (!compareHashes(event.log_chain_prev_hash || '', expectedPrevHash)) {
          return this.createChainBreakEvent(
            event,
            `Chain break at event ${i}: expected prev_hash ${expectedPrevHash.slice(0, 8)}...`
          );
        }
      }
    }

    return null; // Chain valid
  }

  /**
   * Compute hash of event for chain validation
   * Excludes log_chain_prev_hash from hash computation
   */
  private computeEventHash(event: DriftEvent): string {
    const eventCopy = { ...event };
    delete (eventCopy as Record<string, unknown>).log_chain_prev_hash;
    const sorted = JSON.stringify(eventCopy, Object.keys(eventCopy).sort());
    return computeHash(sorted);
  }

  /**
   * Create drift event
   * INV-DRIFT-005: Always includes manifest_ref
   */
  private createDriftEvent(
    driftType: DriftType,
    filePath: string,
    expectedHash: string,
    actualHash: string,
    manifestRef: { tag: string; manifest_sha256: string },
    details: string
  ): DriftEvent {
    this.eventCounter++;

    return {
      event_type: 'drift_event',
      schema_version: '1.0.0',
      event_id: `drift-${String(this.eventCounter).padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
      drift_type: driftType,
      escalation: ESCALATION_MATRIX[driftType],
      source: {
        file_path: filePath,
        expected_hash: expectedHash,
        actual_hash: actualHash
      },
      manifest_ref: manifestRef,
      details,
      log_chain_prev_hash: null // Will be set when appending to log
    };
  }

  /**
   * Create chain break event
   * INV-DRIFT-004: Always HALT
   */
  private createChainBreakEvent(
    brokenEvent: DriftEvent,
    details: string
  ): DriftEvent {
    this.eventCounter++;

    return {
      event_type: 'drift_event',
      schema_version: '1.0.0',
      event_id: `drift-${String(this.eventCounter).padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
      drift_type: 'CHAIN_BREAK',
      escalation: 'HALT', // INV-DRIFT-004
      source: {
        file_path: brokenEvent.source.file_path
      },
      manifest_ref: brokenEvent.manifest_ref,
      details,
      log_chain_prev_hash: null
    };
  }

  /**
   * Get maximum escalation level from events
   */
  private getMaxEscalation(events: DriftEvent[]): EscalationLevel | null {
    if (events.length === 0) return null;

    let maxLevel: EscalationLevel = 'INFO';
    let maxOrder = ESCALATION_ORDER['INFO'];

    for (const event of events) {
      const order = ESCALATION_ORDER[event.escalation];
      if (order > maxOrder) {
        maxOrder = order;
        maxLevel = event.escalation;
      }
    }

    return maxLevel;
  }
}
