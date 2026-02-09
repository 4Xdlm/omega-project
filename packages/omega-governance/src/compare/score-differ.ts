/**
 * OMEGA Governance — Score Differ
 * Phase D.2 — Compare ForgeScore metrics between runs
 *
 * INV-GOV-08: All scores are extracted from ForgeReport, never computed locally.
 */

import type { ForgeReport } from '../core/types.js';
import type { ScoreComparison } from './types.js';

/** M-score keys (M1 through M12) */
const M_SCORE_KEYS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'] as const;

/** Compare ForgeReport scores between two runs */
export function diffScores(
  left: ForgeReport,
  right: ForgeReport,
): ScoreComparison {
  const m_scores: Record<string, number> = {};

  for (const key of M_SCORE_KEYS) {
    const leftVal = left.metrics[key];
    const rightVal = right.metrics[key];
    m_scores[key] = rightVal - leftVal;
  }

  return {
    forge_score_delta: right.metrics.composite_score - left.metrics.composite_score,
    emotion_score_delta: right.metrics.emotion_score - left.metrics.emotion_score,
    quality_score_delta: right.metrics.quality_score - left.metrics.quality_score,
    m_scores,
  };
}

/** Check if any score delta exceeds a threshold */
export function hasSignificantScoreDelta(
  comparison: ScoreComparison,
  threshold: number,
): boolean {
  if (Math.abs(comparison.forge_score_delta) > threshold) return true;
  if (Math.abs(comparison.emotion_score_delta) > threshold) return true;
  if (Math.abs(comparison.quality_score_delta) > threshold) return true;
  for (const key of Object.keys(comparison.m_scores)) {
    if (Math.abs(comparison.m_scores[key]) > threshold) return true;
  }
  return false;
}
