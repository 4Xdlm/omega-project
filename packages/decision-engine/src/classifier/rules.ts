/**
 * @fileoverview Classification rules management.
 * @module @omega/decision-engine/classifier/rules
 *
 * INV-CLASSIFIER-02: Rules ordered by priority (desc)
 */

import type { ClassificationRule, RuntimeEvent, Classification } from '../types/index.js';

/**
 * Sorts rules by priority (descending).
 * INV-CLASSIFIER-02: Maintains priority order.
 * @param rules - Rules to sort
 * @returns Sorted rules
 */
export function sortRulesByPriority(rules: readonly ClassificationRule[]): ClassificationRule[] {
  return [...rules].sort((a, b) => b.priority - a.priority);
}

/**
 * Validates a classification rule.
 * @param rule - Rule to validate
 * @returns True if valid
 */
export function isValidRule(rule: unknown): rule is ClassificationRule {
  if (typeof rule !== 'object' || rule === null) {
    return false;
  }

  const r = rule as Record<string, unknown>;

  return (
    typeof r['id'] === 'string' &&
    r['id'].length > 0 &&
    typeof r['priority'] === 'number' &&
    Number.isFinite(r['priority']) &&
    typeof r['condition'] === 'function' &&
    (r['action'] === 'ACCEPT' || r['action'] === 'ALERT' || r['action'] === 'BLOCK') &&
    typeof r['weight'] === 'number' &&
    r['weight'] >= 0 &&
    r['weight'] <= 1
  );
}

/**
 * Creates a rule that matches all events.
 * @param id - Rule ID
 * @param action - Classification action
 * @param priority - Priority level
 * @param weight - Rule weight
 * @returns Classification rule
 */
export function createMatchAllRule(
  id: string,
  action: Classification,
  priority: number = 0,
  weight: number = 1.0
): ClassificationRule {
  return {
    id,
    priority,
    condition: () => true,
    action,
    weight,
    description: 'Matches all events',
  };
}

/**
 * Creates a rule that matches events by source.
 * @param id - Rule ID
 * @param source - Source to match
 * @param action - Classification action
 * @param priority - Priority level
 * @param weight - Rule weight
 * @returns Classification rule
 */
export function createSourceRule(
  id: string,
  source: 'ORACLE' | 'DECISION_ENGINE',
  action: Classification,
  priority: number = 10,
  weight: number = 1.0
): ClassificationRule {
  return {
    id,
    priority,
    condition: (event: RuntimeEvent) => event.verdict.source === source,
    action,
    weight,
    description: `Matches events from ${source}`,
  };
}

/**
 * Creates a rule that matches events by verdict outcome.
 * @param id - Rule ID
 * @param verdict - Verdict to match
 * @param action - Classification action
 * @param priority - Priority level
 * @param weight - Rule weight
 * @returns Classification rule
 */
export function createVerdictRule(
  id: string,
  verdict: 'ACCEPT' | 'REJECT' | 'CONDITIONAL',
  action: Classification,
  priority: number = 20,
  weight: number = 1.0
): ClassificationRule {
  return {
    id,
    priority,
    condition: (event: RuntimeEvent) => event.verdict.verdict === verdict,
    action,
    weight,
    description: `Matches ${verdict} verdicts`,
  };
}

/**
 * Creates a compound rule with AND logic.
 * @param id - Rule ID
 * @param rules - Rules to combine
 * @param action - Classification action
 * @param priority - Priority level
 * @param weight - Rule weight
 * @returns Classification rule
 */
export function createAndRule(
  id: string,
  conditions: readonly ((event: RuntimeEvent) => boolean)[],
  action: Classification,
  priority: number = 50,
  weight: number = 1.0
): ClassificationRule {
  return {
    id,
    priority,
    condition: (event: RuntimeEvent) => conditions.every(c => c(event)),
    action,
    weight,
    description: 'Compound AND rule',
  };
}

/**
 * Creates a compound rule with OR logic.
 * @param id - Rule ID
 * @param conditions - Conditions to combine
 * @param action - Classification action
 * @param priority - Priority level
 * @param weight - Rule weight
 * @returns Classification rule
 */
export function createOrRule(
  id: string,
  conditions: readonly ((event: RuntimeEvent) => boolean)[],
  action: Classification,
  priority: number = 50,
  weight: number = 1.0
): ClassificationRule {
  return {
    id,
    priority,
    condition: (event: RuntimeEvent) => conditions.some(c => c(event)),
    action,
    weight,
    description: 'Compound OR rule',
  };
}

/**
 * Creates a negated rule.
 * @param id - Rule ID
 * @param condition - Condition to negate
 * @param action - Classification action
 * @param priority - Priority level
 * @param weight - Rule weight
 * @returns Classification rule
 */
export function createNotRule(
  id: string,
  condition: (event: RuntimeEvent) => boolean,
  action: Classification,
  priority: number = 50,
  weight: number = 1.0
): ClassificationRule {
  return {
    id,
    priority,
    condition: (event: RuntimeEvent) => !condition(event),
    action,
    weight,
    description: 'Negated rule',
  };
}

/**
 * Creates default rules for standard classification.
 * @returns Array of default rules
 */
export function createDefaultRules(): ClassificationRule[] {
  return [
    // REJECT verdicts should be blocked
    createVerdictRule('default-reject-block', 'REJECT', 'BLOCK', 100, 1.0),

    // CONDITIONAL verdicts need review
    createVerdictRule('default-conditional-alert', 'CONDITIONAL', 'ALERT', 90, 0.8),

    // ACCEPT verdicts are accepted
    createVerdictRule('default-accept-accept', 'ACCEPT', 'ACCEPT', 80, 1.0),

    // Fallback: alert on unknown
    createMatchAllRule('default-fallback-alert', 'ALERT', 0, 0.5),
  ];
}
