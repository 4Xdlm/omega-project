/**
 * @fileoverview CLASSIFIER module public exports.
 * @module @omega/decision-engine/classifier
 */

export type {
  Classifier,
  ClassifierOptions,
  ScoreBreakdown,
  RuleScoreContribution,
} from './types.js';

export { DefaultClassifier, createClassifier } from './classifier.js';

export {
  sortRulesByPriority,
  isValidRule,
  createMatchAllRule,
  createSourceRule,
  createVerdictRule,
  createAndRule,
  createOrRule,
  createNotRule,
  createDefaultRules,
} from './rules.js';

export {
  computeScoreBreakdown,
  normalizeScore,
  computeFinalScore,
  classificationFromScore,
  getBaseScore,
} from './scoring.js';
