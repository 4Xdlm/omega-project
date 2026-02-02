/**
 * @fileoverview Verdict type definitions for OMEGA Decision Engine.
 * @module @omega/decision-engine/types/verdicts
 */

/**
 * Source of a build verdict.
 */
export type VerdictSource = 'ORACLE' | 'DECISION_ENGINE';

/**
 * Possible verdict outcomes.
 */
export type VerdictOutcome = 'ACCEPT' | 'REJECT' | 'CONDITIONAL';

/**
 * Build verdict from ORACLE or DECISION_ENGINE.
 * Immutable record of a decision made during build process.
 */
export interface BuildVerdict {
  /** Unique identifier for this verdict */
  readonly id: string;
  /** Unix timestamp (ms) when verdict was issued */
  readonly timestamp: number;
  /** System that issued the verdict */
  readonly source: VerdictSource;
  /** The actual verdict decision */
  readonly verdict: VerdictOutcome;
  /** Arbitrary payload data associated with verdict */
  readonly payload: unknown;
  /** SHA-256 hash of verdict content for integrity */
  readonly hash: string;
}

/**
 * Classification categories for events.
 */
export type Classification = 'ACCEPT' | 'ALERT' | 'BLOCK';

/**
 * Final outcome after processing.
 */
export type DecisionOutcome = 'ACCEPTED' | 'ALERTED' | 'BLOCKED';

/**
 * Creates a classification from an outcome.
 */
export function classificationFromOutcome(outcome: DecisionOutcome): Classification {
  switch (outcome) {
    case 'ACCEPTED':
      return 'ACCEPT';
    case 'ALERTED':
      return 'ALERT';
    case 'BLOCKED':
      return 'BLOCK';
  }
}

/**
 * Creates an outcome from a classification.
 */
export function outcomeFromClassification(classification: Classification): DecisionOutcome {
  switch (classification) {
    case 'ACCEPT':
      return 'ACCEPTED';
    case 'ALERT':
      return 'ALERTED';
    case 'BLOCK':
      return 'BLOCKED';
  }
}
