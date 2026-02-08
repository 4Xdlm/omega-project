/**
 * OMEGA Phase Q — Public API
 *
 * Triple-Oracle Evaluation System: Justesse / Precision / Necessite
 *
 * @packageDocumentation
 */

// Types
export type {
  QVerdict,
  OracleId,
  QInvariantId,
  QCaseCategory,
  AdversarialStrategy,
  QTestCaseInput,
  QTestCaseExpected,
  QTestCase,
  QEvidenceStep,
  QEvidenceChain,
  QOracleMetrics,
  QViolation,
  QOracleResult,
  QCaseResult,
  QCategoryScore,
  QInvariantScore,
  QAggregateScores,
  QReport,
  QConfigSymbol,
  QConfig,
  QSegment,
  QAblationResult,
  QAdversarialVariant,
  QBaseline,
  QCrossRefResult,
  QRuleCheckType,
  QOracleRule,
} from './types.js';

// Config
export {
  createDefaultConfig,
  resolveConfigRef,
  validateConfig,
  hashConfig,
} from './config.js';

// Normalizer
export {
  normalize,
  normalizeLF,
  normalizeWhitespace,
  normalizeJSON,
  isIdempotent,
} from './normalizer.js';

// Evidence
export {
  createEvidenceChainBuilder,
  verifyEvidenceChain,
  mergeEvidenceChains,
} from './evidence.js';
export type { EvidenceChainBuilder } from './evidence.js';

// Ablation
export {
  segmentOutput,
  generateAblations,
  evaluateNecessity,
  checkNecessityRatio,
} from './ablation.js';

// Adversarial
export {
  generateNegation,
  generatePermutation,
  generateInjection,
  generateTruncation,
  generateSubstitution,
  generateAllVariants,
} from './adversarial.js';

// Oracles
export { evaluateOracleA, checkPrecision, checkPatterns, checkContradictions } from './oracle-a.js';
export { evaluateOracleB, checkNecessity, checkStability } from './oracle-b.js';
export { evaluateOracleC, checkFormat, checkBaselines } from './oracle-c.js';

// Evaluator
export {
  parseTestset,
  evaluateCase,
  evaluateAll,
  aggregateScores,
  computeMinVerdict,
} from './evaluator.js';

// Report
export {
  generateReport,
  renderReportJSON,
  renderReportMarkdown,
  verifyReportHash,
} from './report.js';
