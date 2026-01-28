/**
 * OMEGA Sentinel Module - Barrel Export
 * Phase C - NASA-Grade L4
 */

export * from './types.js';
export { Rule, RuleMatch, RULES_PHASE_C, DEFAULT_DENY_RULE } from './rules.js';
export { RuleEngine, RuleEngineResult } from './rule-engine.js';
export { TraceManager } from './trace.js';
export {
  Sentinel,
  SentinelConfig,
  AuthorizeResult,
  getSentinel,
  resetSentinel,
} from './sentinel.js';
