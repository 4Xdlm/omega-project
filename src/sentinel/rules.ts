/**
 * OMEGA Sentinel Rules v1.0
 * Phase C - NASA-Grade L4
 *
 * INVARIANTS:
 * - INV-C-01: Default DENY if no rule matches
 * - INV-C-04: Bijection rule <-> test
 * - INV-C-05: Zero heuristics/ML
 */

import { RuleId, SentinelOperation, SentinelContext, SentinelVerdict, createRuleId } from './types.js';

export interface RuleMatch {
  readonly verdict: SentinelVerdict;
  readonly justification: string;
}

export interface Rule {
  readonly id: RuleId;
  readonly description: string;
  readonly operations: readonly SentinelOperation[];
  readonly evaluate: (
    op: SentinelOperation,
    payload: unknown,
    ctx: SentinelContext
  ) => RuleMatch | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RULES CATALOG PHASE C
// ─────────────────────────────────────────────────────────────────────────────

export const RULES_PHASE_C: readonly Rule[] = [
  // RULE-C-003: Deny empty payloads (checked first for all phases)
  {
    id: createRuleId('003'),
    description: 'Deny null/undefined/empty payloads',
    operations: ['APPEND_FACT', 'APPEND_DECISION', 'APPEND_NOTE'],
    evaluate: (op, payload, ctx) => {
      if (payload === null || payload === undefined) {
        return { verdict: 'DENY', justification: 'Payload cannot be null/undefined' };
      }
      if (typeof payload === 'object' && Object.keys(payload as object).length === 0) {
        return { verdict: 'DENY', justification: 'Payload cannot be empty object' };
      }
      return null;
    },
  },

  // RULE-C-001: Block all writes during Phase C
  {
    id: createRuleId('001'),
    description: 'Deny canonical writes during Phase C (before integration)',
    operations: ['APPEND_FACT', 'APPEND_DECISION', 'APPEND_NOTE'],
    evaluate: (op, payload, ctx) => {
      if (ctx.phase === 'C') {
        return { verdict: 'DENY', justification: 'Writes blocked during Phase C' };
      }
      return null;
    },
  },

  // RULE-C-002: Allow writes during CD with valid context
  {
    id: createRuleId('002'),
    description: 'Allow writes during CD with valid actor and reason',
    operations: ['APPEND_FACT', 'APPEND_DECISION', 'APPEND_NOTE'],
    evaluate: (op, payload, ctx) => {
      if (ctx.phase !== 'CD') return null;
      if (!ctx.actor_id || ctx.actor_id.length < 1) {
        return { verdict: 'DENY', justification: 'actor_id required' };
      }
      if (!ctx.reason || ctx.reason.length < 10) {
        return { verdict: 'DENY', justification: 'reason must be >=10 chars' };
      }
      return { verdict: 'ALLOW', justification: 'Valid CD write' };
    },
  },
];

// DEFAULT DENY (INV-C-01)
export const DEFAULT_DENY_RULE: Rule = {
  id: createRuleId('DEFAULT'),
  description: 'Default deny - no rule matched',
  operations: ['APPEND_FACT', 'APPEND_DECISION', 'APPEND_NOTE'],
  evaluate: () => ({ verdict: 'DENY', justification: 'No rule matched - default deny' }),
};
