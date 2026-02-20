/**
 * OMEGA Sentinel Rule Engine v1.0
 * Phase C - NASA-Grade L4
 *
 * INVARIANTS:
 * - INV-C-01: Default DENY if no rule matches
 * - INV-C-05: Pure function, no side effects
 */

import { Rule, RuleMatch, RULES_PHASE_C, DEFAULT_DENY_RULE } from './rules.js';
import { SentinelOperation, SentinelContext, RuleId } from './types.js';

export interface RuleEngineResult {
  readonly rule_id: RuleId;
  readonly match: RuleMatch;
}

export class RuleEngine {
  constructor(private readonly rules: readonly Rule[] = RULES_PHASE_C) {}

  /**
   * First match wins. Default DENY if none.
   * Pure function, no side effects (INV-C-05).
   */
  evaluate(op: SentinelOperation, payload: unknown, ctx: SentinelContext): RuleEngineResult {
    for (const rule of this.rules) {
      if (!rule.operations.includes(op)) continue;
      const match = rule.evaluate(op, payload, ctx);
      if (match !== null) {
        return { rule_id: rule.id, match };
      }
    }
    const defaultMatch = DEFAULT_DENY_RULE.evaluate(op, payload, ctx);
    return {
      rule_id: DEFAULT_DENY_RULE.id,
      match: defaultMatch!,
    };
  }
}
