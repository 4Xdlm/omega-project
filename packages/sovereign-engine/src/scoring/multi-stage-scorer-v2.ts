/**
 * OMEGA Multi-Stage Scorer V2
 * Phase R-5 — Refondation Métrologique
 *
 * Built from R-4 audit + R-5 Ridge regression on 571 classified works.
 * Key differences from V1:
 * - 11 DISCRIMINANT features with positive weights (empirically validated)
 * - 5 INVERTED features (penalize commercial patterns that fooled V1)
 * - 3 combination bonuses (rhythmic mastery, controlled breathing, narrative depth)
 * - 1 penalty (excessive knife sentences)
 * - Weights from Ridge regression (lambda=1.0) on corpus S/A/B/C/D
 *
 * STANDALONE — no dependency on engine.ts, config.ts, or V1 scorer.
 *
 * Usage:
 *   const scorer = new MultiStageScorerV2();
 *   const result = scorer.score(features, { wordCount: 500 });
 */

import { detectPassageType } from './passage-type-detector.js';
import type { PassageType, ScoringOptions } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface V2Score {
  /** Raw linear score from Ridge regression */
  raw: number;
  /** Score normalized to 0-100 scale */
  score100: number;
  /** Bonuses applied */
  bonuses: BonusDetail[];
  /** Penalties applied */
  penalties: PenaltyDetail[];
  /** Score after bonuses/penalties (0-100) */
  final: number;
  /** Confidence: proportion of available features */
  confidence: number;
  /** Detected passage type */
  passage_type: PassageType;
  /** Feature contributions (sorted by |contribution|) */
  contributions: FeatureContribution[];
}

interface BonusDetail {
  name: string;
  value: number;
  triggered: boolean;
}

interface PenaltyDetail {
  name: string;
  value: number;
  triggered: boolean;
}

interface FeatureContribution {
  feature: string;
  value: number;
  weight: number;
  contribution: number;
  direction: 'POSITIVE' | 'INVERTED';
}

// ═══════════════════════════════════════════════════════════════════════
// WEIGHTS (from R-5 Ridge regression, lambda=1.0, n=571)
// ═══════════════════════════════════════════════════════════════════════

interface FeatureSpec {
  weight: number;
  mean: number;
  std: number;
  direction: 'POSITIVE' | 'INVERTED';
}

const FEATURES: Record<string, FeatureSpec> = {
  // ── 11 DISCRIMINANT features (higher = better literature) ──
  f26b_long_sent_rate:   { weight: +2.477073, mean: 0.101058, std: 0.113316, direction: 'POSITIVE' },
  f1a_rhythm_variance:   { weight: -0.000958, mean: 15.16225, std: 9.110609, direction: 'POSITIVE' },
  f1_mean:               { weight: -0.008319, mean: 21.31118, std: 16.876992, direction: 'POSITIVE' },
  f24c_contrast_delta:   { weight: +0.019955, mean: 29.73988, std: 10.616403, direction: 'POSITIVE' },
  f26c_period_score:     { weight: -0.341986, mean: 0.112024, std: 0.094465, direction: 'POSITIVE' },
  f9a_contradiction_rate:{ weight: -0.283392, mean: 0.908396, std: 0.827332, direction: 'POSITIVE' },
  f28b_irony_density:    { weight: +0.044889, mean: 0.098729, std: 0.860079, direction: 'POSITIVE' },
  f27a_epistemic_rate:   { weight: +0.009519, mean: 10.40291, std: 18.438138, direction: 'POSITIVE' },
  f27d_modal_score:      { weight: +0.548484, mean: 0.244406, std: 0.130501, direction: 'POSITIVE' },
  f27c_negation_rate:    { weight: +0.022057, mean: 3.346695, std: 6.325455, direction: 'POSITIVE' },
  f19a_approx_entropy:   { weight: +1.583185, mean: 0.732618, std: 0.127587, direction: 'POSITIVE' },

  // ── 5 INVERTED features (higher = worse, commercial patterns) ──
  f17_knife_count:       { weight: -0.001071, mean: 6.683712, std: 7.731891, direction: 'INVERTED' },
  f29d_ttr_score:        { weight: -4.709168, mean: 0.711752, std: 0.025429, direction: 'INVERTED' },
  f35c_hook_score:       { weight: -1.514774, mean: 0.534285, std: 0.122222, direction: 'INVERTED' },
  f36c_cliff_score:      { weight: +0.846557, mean: 0.640491, std: 0.059466, direction: 'INVERTED' },
  f33c_dot_comma_ratio:  { weight: +0.000480, mean: 1.185637, std: 1.539099, direction: 'INVERTED' },
};

const INTERCEPT = 5.857100;

// Raw score range observed on corpus (for 0-100 mapping)
// S mean pred = 4.156, D mean pred = 3.616, theoretical range ~1-6
const RAW_MIN = 1.5;
const RAW_MAX = 6.0;

// ═══════════════════════════════════════════════════════════════════════
// SCORER CLASS
// ═══════════════════════════════════════════════════════════════════════

export class MultiStageScorerV2 {
  /**
   * Score a text passage using the V2 model.
   *
   * @param features - Pre-computed features from computeTextFeatures()
   * @param options - Scoring options (wordCount required)
   * @returns V2Score with raw, normalized, bonuses, penalties, final
   */
  score(features: Record<string, number>, options: ScoringOptions): V2Score {
    const contributions: FeatureContribution[] = [];
    let rawScore = INTERCEPT;
    let availableCount = 0;
    let totalCount = 0;

    for (const [featName, spec] of Object.entries(FEATURES)) {
      totalCount++;
      const value = features[featName];
      if (value === undefined || value === null || !Number.isFinite(value)) {
        continue;
      }
      availableCount++;

      const contribution = spec.weight * value;
      rawScore += contribution;

      contributions.push({
        feature: featName,
        value: r4(value),
        weight: spec.weight,
        contribution: r4(contribution),
        direction: spec.direction,
      });
    }

    // Sort by absolute contribution (most impactful first)
    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    // Normalize to 0-100
    const score100 = r4(clamp((rawScore - RAW_MIN) / (RAW_MAX - RAW_MIN) * 100, 0, 100));

    // Confidence
    const confidence = r4(availableCount / totalCount);

    // Passage type detection
    const passageType = options.text
      ? detectPassageType(options.text)
      : ('INTROSPECTION' as PassageType);

    // ── Bonuses ──
    const bonuses: BonusDetail[] = [];

    // Bonus 1: Rhythmic mastery
    const f1Mean = features.f1_mean ?? 0;
    const f1aVar = features.f1a_rhythm_variance ?? 0;
    const rhythmicMastery = f1Mean > 18 && f1aVar > 12;
    bonuses.push({
      name: 'rhythmic_mastery',
      value: rhythmicMastery ? 15 : 0,
      triggered: rhythmicMastery,
    });

    // Bonus 2: Controlled breathing
    const f26b = features.f26b_long_sent_rate ?? 0;
    const f24c = features.f24c_contrast_delta ?? 0;
    const controlledBreathing = f26b > 0.08 && f24c > 25;
    bonuses.push({
      name: 'controlled_breathing',
      value: controlledBreathing ? 12 : 0,
      triggered: controlledBreathing,
    });

    // Bonus 3: Narrative depth
    const f28b = features.f28b_irony_density ?? 0;
    const f27a = features.f27a_epistemic_rate ?? 0;
    const narrativeDepth = f28b > 0.05 && f27a > 8;
    bonuses.push({
      name: 'narrative_depth',
      value: narrativeDepth ? 10 : 0,
      triggered: narrativeDepth,
    });

    // ── Penalties ──
    const penalties: PenaltyDetail[] = [];

    // Penalty: Knife excess
    const knifeCount = features.f17_knife_count ?? 0;
    const sentCount = features.f1_sentence_count ?? features.f19_sentences_analyzed ?? 1;
    const knifeRate = sentCount > 0 ? knifeCount / sentCount : 0;
    const knifeExcess = knifeRate > 0.15;
    penalties.push({
      name: 'knife_excess',
      value: knifeExcess ? -10 : 0,
      triggered: knifeExcess,
    });

    // Final score
    const bonusTotal = bonuses.reduce((s, b) => s + b.value, 0);
    const penaltyTotal = penalties.reduce((s, p) => s + p.value, 0);
    const finalScore = r4(clamp(score100 + bonusTotal + penaltyTotal, 0, 100));

    return {
      raw: r4(rawScore),
      score100,
      bonuses,
      penalties,
      final: finalScore,
      confidence,
      passage_type: passageType,
      contributions,
    };
  }
}

function r4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
