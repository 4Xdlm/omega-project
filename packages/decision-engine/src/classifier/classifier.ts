/**
 * @fileoverview CLASSIFIER implementation - deterministic event classification.
 * @module @omega/decision-engine/classifier/classifier
 *
 * INVARIANTS:
 * - INV-CLASSIFIER-01: Determinism (same event → same result)
 * - INV-CLASSIFIER-02: Rules ordered by priority (desc)
 * - INV-CLASSIFIER-03: Score normalized [0, 1]
 * - INV-CLASSIFIER-04: Performance <50ms per event
 * - INV-CLASSIFIER-05: No event left unclassified
 */

import type {
  RuntimeEvent,
  ClassificationResult,
  ClassificationRule,
  Classification,
} from '../types/index.js';
import type { Classifier, ClassifierOptions } from './types.js';
import { sortRulesByPriority, isValidRule } from './rules.js';
import { computeFinalScore, normalizeScore } from './scoring.js';

/**
 * Default Classifier implementation.
 * Classifies events deterministically based on rules.
 */
export class DefaultClassifier implements Classifier {
  private readonly clock: () => number;
  private readonly defaultClassification: Classification;
  private rules: ClassificationRule[] = [];

  constructor(options: ClassifierOptions = {}) {
    this.clock = options.clock ?? (() => Date.now());
    this.defaultClassification = options.defaultClassification ?? 'ALERT';

    if (options.rules) {
      for (const rule of options.rules) {
        this.addRule(rule);
      }
    }
  }

  /**
   * Classifies a runtime event.
   * INV-CLASSIFIER-01: Deterministic - same input yields same output.
   * INV-CLASSIFIER-04: Must complete in <50ms.
   * INV-CLASSIFIER-05: Always returns a result.
   */
  classify(event: RuntimeEvent): ClassificationResult {
    const timestamp = this.clock();
    const matchedRules: ClassificationRule[] = [];
    const matchedRuleIds: string[] = [];
    const reasoningParts: string[] = [];

    // Evaluate rules in priority order (already sorted)
    for (const rule of this.rules) {
      try {
        if (rule.condition(event)) {
          matchedRules.push(rule);
          matchedRuleIds.push(rule.id);
          reasoningParts.push(
            `Rule '${rule.id}' matched with action ${rule.action} (weight: ${rule.weight})`
          );
        }
      } catch {
        // Rule evaluation failed - skip but log
        reasoningParts.push(`Rule '${rule.id}' evaluation failed`);
      }
    }

    // Determine classification from matched rules
    let classification: Classification;
    let score: number;

    if (matchedRules.length === 0) {
      // INV-CLASSIFIER-05: Default classification if no rules match
      classification = this.defaultClassification;
      score = 0.5;
      reasoningParts.push(`No rules matched, using default: ${classification}`);
    } else {
      // Use highest priority matched rule for classification
      const primaryRule = matchedRules[0];
      if (primaryRule) {
        classification = primaryRule.action;
      } else {
        classification = this.defaultClassification;
      }

      // Calculate score from all matched rules
      score = computeFinalScore(matchedRules);
    }

    // INV-CLASSIFIER-03: Ensure score is normalized
    const normalizedScore = normalizeScore(score);

    const reasoning = reasoningParts.length > 0
      ? reasoningParts.join('; ')
      : 'No reasoning available';

    return Object.freeze({
      event,
      classification,
      score: normalizedScore,
      matchedRules: Object.freeze(matchedRuleIds),
      reasoning,
      timestamp,
    });
  }

  /**
   * Adds a classification rule.
   * INV-CLASSIFIER-02: Maintains sorted order by priority.
   */
  addRule(rule: ClassificationRule): void {
    if (!isValidRule(rule)) {
      throw new Error(`Invalid rule: ${JSON.stringify(rule)}`);
    }

    // Check for duplicate ID
    if (this.rules.some(r => r.id === rule.id)) {
      throw new Error(`Rule with ID '${rule.id}' already exists`);
    }

    this.rules.push(rule);
    this.rules = sortRulesByPriority(this.rules);
  }

  /**
   * Removes a classification rule.
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      return false;
    }
    this.rules.splice(index, 1);
    return true;
  }

  /**
   * Gets all rules.
   * INV-CLASSIFIER-02: Returns rules in priority order.
   */
  getRules(): readonly ClassificationRule[] {
    return Object.freeze([...this.rules]);
  }

  /**
   * Clears all rules.
   */
  clearRules(): void {
    this.rules = [];
  }

  /**
   * Gets rule count.
   */
  getRuleCount(): number {
    return this.rules.length;
  }
}

/**
 * Creates a new Classifier instance.
 * @param options - Configuration options
 * @returns Classifier instance
 */
export function createClassifier(options: ClassifierOptions = {}): Classifier {
  return new DefaultClassifier(options);
}
