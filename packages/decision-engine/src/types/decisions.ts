/**
 * @fileoverview Decision type definitions for OMEGA Decision Engine.
 * @module @omega/decision-engine/types/decisions
 */

import type { RuntimeEvent } from './events.js';
import type { Classification, DecisionOutcome } from './verdicts.js';

/**
 * Result of classifying a runtime event.
 */
export interface ClassificationResult {
  /** The event that was classified */
  readonly event: RuntimeEvent;
  /** Assigned classification */
  readonly classification: Classification;
  /** Confidence score [0, 1] */
  readonly score: number;
  /** IDs of rules that matched */
  readonly matchedRules: readonly string[];
  /** Human-readable reasoning */
  readonly reasoning: string;
  /** Unix timestamp (ms) of classification */
  readonly timestamp: number;
}

/**
 * A classification rule definition.
 */
export interface ClassificationRule {
  /** Unique rule identifier */
  readonly id: string;
  /** Priority (higher = evaluated first) */
  readonly priority: number;
  /** Condition function to evaluate */
  readonly condition: (event: RuntimeEvent) => boolean;
  /** Action to take if condition matches */
  readonly action: Classification;
  /** Weight for scoring [0, 1] */
  readonly weight: number;
  /** Optional description */
  readonly description?: string;
}

/**
 * Entry in the escalation queue.
 */
export interface QueueEntry {
  /** Unique identifier */
  readonly id: string;
  /** The escalated event */
  readonly event: RuntimeEvent;
  /** Priority (higher = more urgent) */
  readonly priority: number;
  /** Unix timestamp (ms) when enqueued */
  readonly enqueuedAt: number;
  /** Current status */
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED';
}

/**
 * Entry in the incident log.
 */
export interface IncidentEntry {
  /** Unique identifier */
  readonly id: string;
  /** The blocked event */
  readonly event: RuntimeEvent;
  /** Reason for blocking */
  readonly reason: string;
  /** Unix timestamp (ms) when logged */
  readonly loggedAt: number;
  /** SHA-256 hash of entry */
  readonly hash: string;
}

/**
 * Filter for querying incidents.
 */
export interface IncidentFilter {
  /** Only incidents after this timestamp */
  readonly since?: number;
  /** Only incidents before this timestamp */
  readonly until?: number;
  /** Filter by verdict source type */
  readonly sourceType?: string;
}

/**
 * A complete decision record.
 */
export interface Decision {
  /** Unique identifier */
  readonly id: string;
  /** The event that was decided */
  readonly event: RuntimeEvent;
  /** Classification result */
  readonly classification: ClassificationResult;
  /** Final outcome */
  readonly outcome: DecisionOutcome;
  /** Unix timestamp (ms) of decision */
  readonly timestamp: number;
}

/**
 * Entry in the decision trace.
 */
export interface TraceEntry {
  /** Unique identifier */
  readonly id: string;
  /** The decision being traced */
  readonly decision: Decision;
  /** Unix timestamp (ms) when traced */
  readonly tracedAt: number;
  /** SHA-256 hash of entry */
  readonly hash: string;
  /** Previous entry hash (for chain) */
  readonly previousHash: string | null;
  /** Additional metadata */
  readonly metadata: Record<string, unknown>;
}

/**
 * Filter for querying traces.
 */
export interface TraceFilter {
  /** Only traces after this timestamp */
  readonly since?: number;
  /** Only traces before this timestamp */
  readonly until?: number;
  /** Filter by outcome */
  readonly outcome?: DecisionOutcome;
  /** Limit number of results */
  readonly limit?: number;
}

/**
 * Review decision made by human reviewer.
 */
export interface ReviewDecision {
  /** Unique identifier */
  readonly id: string;
  /** Queue entry ID being reviewed */
  readonly entryId: string;
  /** Action taken */
  readonly action: 'APPROVE' | 'REJECT' | 'DEFER';
  /** Reviewer identifier */
  readonly reviewerId: string;
  /** Optional comment */
  readonly comment?: string;
  /** Unix timestamp (ms) of review */
  readonly timestamp: number;
  /** SHA-256 hash of decision */
  readonly hash: string;
}
