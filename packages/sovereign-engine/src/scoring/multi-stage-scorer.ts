/**
 * OMEGA Multi-Stage Scorer
 * Phase R4 — 2-stage scoring (LOCAL + ARC) with empirical coefficients.
 *
 * This module is STANDALONE — it does not depend on engine.ts or config.ts.
 * It takes pre-computed features as Record<string, number> and applies
 * the R3 coefficients to produce a multi-stage score.
 *
 * Usage:
 *   const scorer = new MultiStageScorer('/path/to/coefficients.json');
 *   const result = scorer.score(features, { wordCount: 600, pRel: 0.5 });
 */

import { CoefficientsLoader } from './coefficients-loader.js';
import { FeatureNormalizer } from './normalizer.js';
import { detectPassageType } from './passage-type-detector.js';
import { getProfile } from './quality-profiles.js';
import type {
  MultiStageScore,
  StageScore,
  ScoringOptions,
  PassageType,
} from './types.js';

const CONFIDENCE_DISABLE_THRESHOLD = 0.20;
const LOCAL_FAIL_THRESHOLD = 30.0;

export class MultiStageScorer {
  private loader: CoefficientsLoader;
  private normalizer: FeatureNormalizer | null = null;

  /**
   * @param coefficientsPath - Path to R3 coefficients JSON
   * @param metrologyPath - Optional path to R1 metrology JSON for 0-100 normalization
   */
  constructor(coefficientsPath: string, metrologyPath?: string) {
    this.loader = new CoefficientsLoader(coefficientsPath);
    if (metrologyPath) {
      this.normalizer = new FeatureNormalizer(metrologyPath);
    }
  }

  /**
   * Scores a text passage using the 2-stage LOCAL + ARC model.
   *
   * @param features - Pre-computed features as Record<feature_name, value>
   * @param options - Scoring options (wordCount required, pRel/profile/language optional)
   * @returns MultiStageScore with local, arc, composite, passage_type, seal_eligible
   */
  score(features: Record<string, number>, options: ScoringOptions): MultiStageScore {
    const { wordCount, pRel, profile: profileName, language: _language } = options;

    // 1. Detect passage type (on raw features, before normalization)
    const passageType = detectPassageType(features);

    // 1b. Normalize features to 0-100 if normalizer is available
    const scoringFeatures = this.normalizer
      ? this.normalizer.normalizeAll(features, wordCount)
      : features;

    // 2. Get profile
    const profile = getProfile(profileName ?? 'LITTERAIRE');

    // 3. Compute LOCAL stage
    const localScore = this.computeStage(
      'LOCAL',
      scoringFeatures,
      wordCount,
      pRel,
      passageType,
      profile.weight_overrides,
    );

    // 4. Compute ARC stage (skip if LOCAL fails — handshake)
    let arcScore: StageScore;
    if (localScore.score < LOCAL_FAIL_THRESHOLD) {
      arcScore = {
        score: localScore.score,
        confidence: 0,
        active_features: 0,
        total_features: 0,
      };
    } else {
      arcScore = this.computeStage(
        'ARC',
        scoringFeatures,
        wordCount,
        pRel,
        passageType,
        profile.weight_overrides,
      );
    }

    // 5. Compute composite
    const { alpha, beta } = this.loader.getAlphaBeta(wordCount);
    const compositeScore = alpha * localScore.score + beta * arcScore.score;
    const compositeConfidence =
      localScore.active_features + arcScore.active_features > 0
        ? (localScore.confidence * localScore.active_features +
            arcScore.confidence * arcScore.active_features) /
          (localScore.active_features + arcScore.active_features)
        : 0;

    // 6. SEAL eligibility
    const sealEligible =
      compositeScore >= profile.seal_threshold &&
      localScore.score >= profile.min_axis &&
      arcScore.score >= profile.min_axis;

    return {
      local: localScore,
      arc: arcScore,
      composite: {
        score: round(compositeScore, 4),
        alpha: round(alpha, 4),
        beta: round(beta, 4),
        confidence: round(compositeConfidence, 4),
      },
      passage_type: passageType,
      profile: profile.name,
      seal_eligible: sealEligible,
    };
  }

  /**
   * Computes a single stage score (LOCAL or ARC).
   */
  private computeStage(
    stage: 'LOCAL' | 'ARC',
    features: Record<string, number>,
    wordCount: number,
    pRel: number | undefined,
    passageType: PassageType,
    weightOverrides: Record<string, number>,
  ): StageScore {
    const weightTable = this.loader.getWeightTable(stage);
    let weightedSum = 0;
    let weightSum = 0;
    let confidenceSum = 0;
    let activeFeatures = 0;
    let totalFeatures = 0;

    for (const [feat] of weightTable) {
      totalFeatures++;

      // Get feature value
      const val = features[feat];
      if (val === undefined || val === null) continue;

      // Get confidence at this word count
      const confidence = this.loader.getConfidence(feat, wordCount);
      if (confidence < CONFIDENCE_DISABLE_THRESHOLD) continue;

      // Position modifier
      const posMod = pRel !== undefined ? this.loader.getPositionModifier(feat, pRel) : 1.0;

      // Type modifier
      const typeMod = this.loader.getTypeModifier(feat, passageType);

      // Profile weight override
      const profileMod = weightOverrides[feat] ?? 1.0;

      // Effective weight
      const weight = confidence * posMod * typeMod * profileMod;

      weightedSum += val * weight;
      weightSum += weight;
      confidenceSum += confidence;
      activeFeatures++;
    }

    if (weightSum === 0 || activeFeatures === 0) {
      return {
        score: 0,
        confidence: 0,
        active_features: 0,
        total_features: totalFeatures,
      };
    }

    return {
      score: round(weightedSum / weightSum, 4),
      confidence: round(confidenceSum / activeFeatures, 4),
      active_features: activeFeatures,
      total_features: totalFeatures,
    };
  }

  /**
   * Returns the underlying coefficients loader for advanced queries.
   */
  getLoader(): CoefficientsLoader {
    return this.loader;
  }

  /**
   * Returns whether normalization is active (metrology path was provided).
   */
  isNormalized(): boolean {
    return this.normalizer !== null;
  }
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
