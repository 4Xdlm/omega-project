/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — ARC PROGRESSION EVALUATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/calc-judges/arc-progression-evaluator.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * INV-ARC-01: variance(q_scores) < 0.02 → {score:0, verdict:'FLAT'}
 * INV-ARC-02: polishRhythm reçoit arc_score obligatoirement — throw si absent
 *
 * Méthode: corrélation de Pearson quartiles vs courbe cible NarrativeShape.
 * CALC pur — zéro LLM.
 *
 * Source: IA-Ext v2 (doc 7) — OMEGA_CONVERGENCE_W0_LOCKED
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { NARRATIVE_SHAPES_SSOT, type NarrativeShapeKey } from '../../core/narrative-shapes-ssot.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MATH UTILS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateVariance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
}

function pearsonCorrelation(x: readonly number[], y: readonly number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  const num = x.reduce((a, b, i) => a + (b - meanX) * (y[i] - meanY), 0);
  const denX = Math.sqrt(x.reduce((a, b) => a + Math.pow(b - meanX, 2), 0));
  const denY = Math.sqrt(y.reduce((a, b) => a + Math.pow(b - meanY, 2), 0));

  if (denX === 0 || denY === 0) return 0;
  return num / (denX * denY);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ArcVerdict = 'FLAT' | 'INVERTED' | 'WEAK' | 'CONFORM';

export interface ArcScoreResult {
  readonly score: number;       // [0-100]
  readonly verdict: ArcVerdict;
  readonly correlation: number; // Pearson [-1, 1]
  readonly variance: number;    // variance des q_scores
}

// ═══════════════════════════════════════════════════════════════════════════════
// INV-ARC-01: calculateArcScore
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-ARC-01: Calcule le score d'arc dramatique par corrélation de Pearson.
 *
 * @param q_scores  Scores par quartile [Q1, Q2, Q3, Q4] ∈ [0, 1]
 * @param shape     NarrativeShape cible (SSOT)
 * @returns         { score, verdict, correlation, variance }
 *
 * Règle:
 *   variance(q_scores) < 0.02 → {score:0, verdict:'FLAT'}  [INV-ARC-01]
 *   correlation < 0           → {score:0, verdict:'INVERTED'}
 *   correlation < 0.3         → {score: r*100, verdict:'WEAK'}
 *   correlation >= 0.3        → {score: r*100, verdict:'CONFORM'}
 */
export function calculateArcScore(
  q_scores: readonly [number, number, number, number],
  shape: NarrativeShapeKey,
): ArcScoreResult {
  const variance = calculateVariance(q_scores);

  // INV-ARC-01: scène plate — variance trop faible → REJECT
  if (variance < 0.02) {
    return { score: 0, verdict: 'FLAT', correlation: 0, variance };
  }

  const target = [...NARRATIVE_SHAPES_SSOT[shape].target_curve] as number[];
  const correlation = pearsonCorrelation([...q_scores], target);

  if (correlation < 0) {
    return { score: 0, verdict: 'INVERTED', correlation, variance };
  }

  if (correlation < 0.3) {
    return { score: correlation * 100, verdict: 'WEAK', correlation, variance };
  }

  return { score: correlation * 100, verdict: 'CONFORM', correlation, variance };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INV-ARC-02: requiresArcBeforePolish
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * INV-ARC-02: Guard obligatoire avant tout appel à polishRhythm.
 * Throw immédiat si arc_score absent (undefined ou null).
 *
 * Usage: requiresArcBeforePolish(arc_score) // throw si non fourni
 */
export function requiresArcBeforePolish(arc_score: number | undefined | null): void {
  if (arc_score === undefined || arc_score === null) {
    throw new Error(
      'INV-ARC-02 VIOLATION: polishRhythm requires arc_score. Run arc evaluator first.',
    );
  }
}
