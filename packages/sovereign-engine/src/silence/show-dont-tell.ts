/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SHOW DON'T TELL DETECTOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: silence/show-dont-tell.ts
 * Version: 1.0.0 (Sprint 11)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SDT-01
 *
 * Détecte les violations "telling" (narration directe d'émotion)
 * vs "showing" (description comportementale et sensorielle).
 *
 * Algorithme CALC déterministe (pas de LLM).
 * Score [0..100] : 100 = excellent showing, 0 = telling massif.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { TELLING_PATTERNS_FR, isNotFalsePositive } from './telling-patterns.js';
import type { TellingPattern } from './telling-patterns.js';

export interface TellingViolation {
  readonly sentence_index: number;
  readonly sentence: string;
  readonly pattern_id: string;
  readonly severity: 'critical' | 'high' | 'medium';
  readonly suggested_show: string;
}

export interface TellingResult {
  readonly violations: readonly TellingViolation[];
  readonly show_ratio: number; // 0-1 (1 = tout showing, 0 = tout telling)
  readonly telling_count: number;
  readonly total_emotional_expressions: number;
  readonly worst_violations: readonly TellingViolation[]; // Top 5 pires
  readonly score: number; // 0-100 (100 = très show, 0 = très telling)
}

/**
 * Calcule le score show-dont-tell à partir d'un TellingResult.
 * Fonction pure, déterministe.
 *
 * Algorithme :
 * - 0 violations critical → score 100
 * - 1 violation critical → 75
 * - 2 violations critical → 50
 * - 3+ → max(0, 100 - violations_critical × 20)
 * - ajustement high (-5 chaque, max -20)
 * - ajustement medium (-2 chaque, max -10)
 * Clamp [0, 100]
 *
 * @param result - TellingResult avec violations
 * @returns Score [0, 100]
 */
export function scoreShowDontTell(result: TellingResult): number {
  const critical_count = result.violations.filter((v) => v.severity === 'critical').length;
  const high_count = result.violations.filter((v) => v.severity === 'high').length;
  const medium_count = result.violations.filter((v) => v.severity === 'medium').length;

  let score = 100;

  if (critical_count === 0) {
    score = 100;
  } else if (critical_count === 1) {
    score = 75;
  } else if (critical_count === 2) {
    score = 50;
  } else {
    score = Math.max(0, 100 - critical_count * 20);
  }

  // Ajustements pour high et medium
  score = Math.max(0, score - Math.min(high_count * 5, 20));
  score = Math.max(0, score - Math.min(medium_count * 2, 10));

  return score;
}

/**
 * Détecte les violations "telling" dans une prose.
 * ART-SDT-01: 80%+ précision avec false positive guards.
 *
 * @param prose - Texte à analyser
 * @returns Résultat avec violations, score, et prescriptions
 */
export function detectTelling(prose: string): TellingResult {
  // Split prose into sentences
  const sentences = prose
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const violations: TellingViolation[] = [];

  // Scan each sentence with all patterns
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    for (const pattern of TELLING_PATTERNS_FR) {
      // Reset regex lastIndex to avoid issues with global flag
      pattern.regex.lastIndex = 0;

      if (pattern.regex.test(sentence)) {
        // Check false positive guards
        if (isNotFalsePositive(sentence, pattern)) {
          violations.push({
            sentence_index: i,
            sentence,
            pattern_id: pattern.id,
            severity: pattern.severity,
            suggested_show: pattern.suggested_show,
          });
        }
      }
    }
  }

  // Compute metrics
  const telling_count = violations.length;
  const total_emotional_expressions = telling_count; // Approximation: violations = expressions

  const show_ratio =
    total_emotional_expressions > 0
      ? Math.max(0, 1 - telling_count / total_emotional_expressions)
      : 1.0; // Pas d'expression émotionnelle = showing par défaut

  // Compute score via standalone function
  const score = scoreShowDontTell({
    violations,
    show_ratio,
    telling_count,
    total_emotional_expressions,
    worst_violations: [],
    score: 0,
  });

  // Worst violations (top 5 by severity then pattern weight)
  const sorted = [...violations].sort((a, b) => {
    const severityOrder = { critical: 3, high: 2, medium: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;

    // If same severity, sort by pattern weight
    const patternA = TELLING_PATTERNS_FR.find((p) => p.id === a.pattern_id);
    const patternB = TELLING_PATTERNS_FR.find((p) => p.id === b.pattern_id);
    return (patternB?.weight || 0) - (patternA?.weight || 0);
  });

  const worst_violations = sorted.slice(0, 5);

  return {
    violations,
    show_ratio,
    telling_count,
    total_emotional_expressions,
    worst_violations,
    score,
  };
}
