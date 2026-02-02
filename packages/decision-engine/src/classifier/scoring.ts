/**
 * @fileoverview Scoring system for CLASSIFIER.
 * @module @omega/decision-engine/classifier/scoring
 *
 * INV-CLASSIFIER-03: Score normalized [0, 1]
 */

import type { ClassificationRule, RuntimeEvent, Classification } from '../types/index.js';
import type { ScoreBreakdown, RuleScoreContribution } from './types.js';

/**
 * Classification weights for base scoring.
 */
const CLASSIFICATION_BASE_SCORES: Record<Classification, number> = {
  ACCEPT: 1.0,
  ALERT: 0.5,
  BLOCK: 0.0,
};

/**
 * Computes score breakdown for an event against rules.
 * @param event - Event to score
 * @param rules - Rules to apply (must be pre-sorted by priority)
 * @returns Score breakdown
 */
export function computeScoreBreakdown(
  event: RuntimeEvent,
  rules: readonly ClassificationRule[]
): ScoreBreakdown {
  const ruleScores: RuleScoreContribution[] = [];
  let totalWeight = 0;
  let weightedSum = 0;

  for (const rule of rules) {
    const matched = rule.condition(event);
    const baseScore = CLASSIFICATION_BASE_SCORES[rule.action];
    const contribution = matched ? baseScore * rule.weight : 0;

    ruleScores.push({
      ruleId: rule.id,
      matched,
      weight: rule.weight,
      contribution,
    });

    if (matched) {
      totalWeight += rule.weight;
      weightedSum += contribution;
    }
  }

  // Calculate base score (average of matching rule base scores)
  const matchingRules = ruleScores.filter(r => r.matched);
  const baseScore = matchingRules.length > 0
    ? matchingRules.reduce((sum, r) => sum + CLASSIFICATION_BASE_SCORES[rules.find(rule => rule.id === r.ruleId)?.action ?? 'ACCEPT'], 0) / matchingRules.length
    : 0.5; // Default neutral score

  // Calculate weighted score
  const weightedScore = totalWeight > 0
    ? weightedSum / totalWeight
    : 0.5;

  // Final score is the weighted score, already in [0, 1]
  const finalScore = normalizeScore(weightedScore);

  return {
    baseScore,
    weightedScore,
    finalScore,
    ruleScores,
  };
}

/**
 * Normalizes a score to [0, 1] range.
 * INV-CLASSIFIER-03: Ensures score is always valid.
 * @param score - Raw score
 * @returns Normalized score
 */
export function normalizeScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0.5; // Default neutral
  }
  return Math.max(0, Math.min(1, score));
}

/**
 * Computes final score from matched rules.
 * @param matchedRules - Rules that matched
 * @returns Final score [0, 1]
 */
export function computeFinalScore(matchedRules: readonly ClassificationRule[]): number {
  if (matchedRules.length === 0) {
    return 0.5; // Neutral default
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const rule of matchedRules) {
    const baseScore = CLASSIFICATION_BASE_SCORES[rule.action];
    weightedSum += baseScore * rule.weight;
    totalWeight += rule.weight;
  }

  if (totalWeight === 0) {
    return 0.5;
  }

  return normalizeScore(weightedSum / totalWeight);
}

/**
 * Determines classification from score.
 * @param score - Normalized score [0, 1]
 * @returns Classification
 */
export function classificationFromScore(score: number): Classification {
  const normalized = normalizeScore(score);

  if (normalized >= 0.7) {
    return 'ACCEPT';
  } else if (normalized >= 0.3) {
    return 'ALERT';
  } else {
    return 'BLOCK';
  }
}

/**
 * Gets the base score for a classification.
 * @param classification - The classification
 * @returns Base score
 */
export function getBaseScore(classification: Classification): number {
  return CLASSIFICATION_BASE_SCORES[classification];
}
