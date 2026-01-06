/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Adversarial Grammar - Module Index
 * 
 * Phase 23 - Sprint 23.1
 */

// Types
export {
  AttackId,
  TestCaseId,
  AttackCategory,
  Severity,
  ExpectedResponse,
  Exploitability,
  AttackVector,
  EnvelopeAttack,
  EnvelopeAttackType,
  ReplayAttack,
  ReplayAttackType,
  BypassAttack,
  BypassAttackType,
  ResourceAttack,
  ResourceAttackType,
  TimingAttack,
  TimingAttackType,
  InjectionAttack,
  InjectionAttackType,
  CorruptionAttack,
  CorruptionAttackType,
  ProtocolAttack,
  ProtocolAttackType,
  MutationType,
  AttackTestCase,
  TestOutcome,
  AnyAttack,
  attackId,
  testCaseId,
  isEnvelopeAttack,
  isReplayAttack,
  isBypassAttack,
  isResourceAttack,
  isTimingAttack,
  isInjectionAttack,
  isCorruptionAttack,
  isProtocolAttack,
  ALL_CATEGORIES,
  ALL_SEVERITIES,
  ALL_RESPONSES,
  ALL_EXPLOITABILITIES,
  SEVERITY_ORDER,
  EXPLOITABILITY_ORDER,
} from './types.js';

// Grammar
export {
  ADVERSARIAL_GRAMMAR,
  type AdversarialGrammar,
  type GrammarRule,
  type Production,
} from './grammar.js';

// Generator
export {
  generateTestCases,
  generateAllTestCases,
  generateTestCasesForCategory,
  generateTestCasesForSeverity,
  getTotalTestCaseCount,
  serializeTestCases,
  deserializeTestCases,
} from './generator.js';

// Coverage
export {
  TestExecutionResult,
  CoverageStats,
  CategoryStats,
  SeverityStats,
  CoverageTracker,
  CoverageMatrix,
  CoverageCell,
  generateCoverageMatrix,
  renderCoverageMatrix,
  getGlobalTracker,
  resetGlobalTracker,
} from './coverage.js';
