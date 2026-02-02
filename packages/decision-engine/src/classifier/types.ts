/**
 * @fileoverview CLASSIFIER module type definitions.
 * @module @omega/decision-engine/classifier/types
 */

import type {
  RuntimeEvent,
  ClassificationResult,
  ClassificationRule,
  Classification,
} from '../types/index.js';

/**
 * CLASSIFIER interface - classifies events deterministically.
 * INV-CLASSIFIER-01: Deterministic (same event → same result).
 */
export interface Classifier {
  /**
   * Classifies a runtime event.
   * @param event - Event to classify
   * @returns Classification result
   */
  classify(event: RuntimeEvent): ClassificationResult;

  /**
   * Adds a classification rule.
   * @param rule - Rule to add
   */
  addRule(rule: ClassificationRule): void;

  /**
   * Removes a classification rule.
   * @param ruleId - ID of rule to remove
   * @returns True if removed
   */
  removeRule(ruleId: string): boolean;

  /**
   * Gets all rules.
   * @returns Array of rules
   */
  getRules(): readonly ClassificationRule[];

  /**
   * Clears all rules.
   */
  clearRules(): void;
}

/**
 * Options for creating a Classifier instance.
 */
export interface ClassifierOptions {
  /** Clock function for timestamps */
  readonly clock?: () => number;
  /** Default classification if no rules match */
  readonly defaultClassification?: Classification;
  /** Initial rules */
  readonly rules?: readonly ClassificationRule[];
}

/**
 * Score breakdown for a classification.
 */
export interface ScoreBreakdown {
  /** Base score from rules */
  readonly baseScore: number;
  /** Weight adjustments */
  readonly weightedScore: number;
  /** Final normalized score */
  readonly finalScore: number;
  /** Contributing rule scores */
  readonly ruleScores: readonly RuleScoreContribution[];
}

/**
 * Individual rule contribution to score.
 */
export interface RuleScoreContribution {
  /** Rule ID */
  readonly ruleId: string;
  /** Whether rule matched */
  readonly matched: boolean;
  /** Rule weight */
  readonly weight: number;
  /** Contribution to final score */
  readonly contribution: number;
}
