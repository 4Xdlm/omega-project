/**
 * OMEGA Typological Normalizer — Phase R-8.7
 *
 * Computes expected feature values for a given passage type composition.
 * Three-layer model from R-8:
 *   Layer 1 (ADDITIVE):  f_expected = Σ(pi × Ci,f)
 *   Layer 2 (LAMBDA):    f_expected = Σ(pi × λi,f × Ci,f)
 *   Layer 3 (GAMMA):     f_expected = Σ(pi × λi,f × Ci,f) + Σ(pi×pj × γij,f)
 *
 * Usage:
 *   import { TypologicalNormalizer } from './typological-normalizer.js';
 *   import { classifyPassage } from './passage-classifier.js';
 *
 *   const normalizer = new TypologicalNormalizer();
 *   const typeVec = classifyPassage(text);
 *   const expected = normalizer.getExpectedFeatures(typeVec);
 *   const deviation = normalizer.getDeviation(measured, typeVec);
 *
 * NASA-Grade L4 — all constants LEARNED, zero hand-tuning.
 */

import type { PassageClassification } from './passage-classifier.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface TypologicalExpectation {
  /** Expected value for each feature given this type composition */
  expected: Record<string, number>;
  /** Deviation: measured - expected (positive = above expectation) */
  deviation: Record<string, number>;
  /** Layer used per feature: 'additive' | 'lambda' | 'gamma' */
  layers: Record<string, string>;
}

export interface TippingPointResult {
  feature: string;
  value: number;
  threshold: number;
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
  above: boolean;
  delta: number;
  /** true if value is on the "master" side of the threshold */
  master_side: boolean;
}

export interface NormalizationReport {
  expectation: TypologicalExpectation;
  tipping_points: TippingPointResult[];
  /** Count of features where value is on master side of Tk */
  master_count: number;
  /** Total Tk evaluated */
  total_tk: number;
  /** Percentage of Tk on master side */
  master_pct: number;
}

// ═══════════════════════════════════════════════════════════════════════
// PASSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════

const TYPES = ['action', 'narration', 'description', 'dialogue', 'introspection'] as const;
type PassageType = typeof TYPES[number];

const INTERACTION_PAIRS: [PassageType, PassageType][] = [
  ['action', 'narration'], ['action', 'description'], ['action', 'dialogue'],
  ['action', 'introspection'], ['narration', 'description'], ['narration', 'dialogue'],
  ['narration', 'introspection'], ['description', 'dialogue'],
  ['description', 'introspection'], ['dialogue', 'introspection'],
];

// ═══════════════════════════════════════════════════════════════════════
// DATA INTERFACES (loaded from JSON)
// ═══════════════════════════════════════════════════════════════════════

interface FeatureConstants {
  cif: Record<string, number>;  // type -> Ci,f
  lambda?: Record<string, number>;  // type -> λi,f
  gamma?: Record<string, number>;  // "typeAxTypeB" -> γij,f
  class?: string;  // R-8.2 classification
  status?: string;  // R-8.3 lambda status
}

interface TypologicalData {
  _types: string[];
  _gamma_features: string[];
  features: Record<string, FeatureConstants>;
}

interface TippingPoint {
  feature: string;
  threshold: number;
  direction: string;
  delta: number;
  importance: number;
}

interface TippingPointsData {
  tipping_points: TippingPoint[];
  gb_spearman: number;
}

// ═══════════════════════════════════════════════════════════════════════
// NORMALIZER CLASS
// ═══════════════════════════════════════════════════════════════════════

export class TypologicalNormalizer {
  private data: TypologicalData;
  private tpData: TippingPointsData;
  private gammaFeatures: Set<string>;

  constructor(
    typologicalConstants: TypologicalData,
    tippingPoints: TippingPointsData,
  ) {
    this.data = typologicalConstants;
    this.tpData = tippingPoints;
    this.gammaFeatures = new Set(typologicalConstants._gamma_features || []);
  }

  /**
   * Compute expected feature value for a single feature given type proportions.
   *
   * @param featureName - Feature identifier (e.g., 'f26b_long_sent_rate')
   * @param typeVec - Type proportions {action, narration, description, dialogue, introspection}
   * @returns Expected value, or null if feature not in constants
   */
  getExpectedValue(
    featureName: string,
    typeVec: Record<string, number>,
  ): number | null {
    const fc = this.data.features[featureName];
    if (!fc) return null;

    const hasLambda = fc.lambda !== undefined;
    const hasGamma = this.gammaFeatures.has(featureName) && fc.gamma !== undefined;

    // Layer 1 or 2: Σ(pi × [λi] × Ci,f)
    let expected = 0;
    for (const t of TYPES) {
      const pi = typeVec[t] ?? 0;
      const ci = fc.cif[t] ?? 0;
      const li = (hasLambda && fc.lambda![t] !== undefined) ? fc.lambda![t] : 1.0;
      expected += pi * li * ci;
    }

    // Layer 3 (gamma): + Σ(pi×pj × γij,f)
    if (hasGamma) {
      for (const [ti, tj] of INTERACTION_PAIRS) {
        const key = `${ti}x${tj}`;
        const gamma = fc.gamma![key];
        if (gamma !== undefined && gamma !== 0) {
          const pi = typeVec[ti] ?? 0;
          const pj = typeVec[tj] ?? 0;
          expected += pi * pj * gamma;
        }
      }
    }

    return expected;
  }

  /**
   * Get layer used for a feature.
   */
  getLayer(featureName: string): 'additive' | 'lambda' | 'gamma' | 'unknown' {
    const fc = this.data.features[featureName];
    if (!fc) return 'unknown';
    if (this.gammaFeatures.has(featureName) && fc.gamma) return 'gamma';
    if (fc.lambda) return 'lambda';
    return 'additive';
  }

  /**
   * Compute expected values for all known features.
   */
  getExpectedFeatures(
    typeVec: Record<string, number>,
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const fk of Object.keys(this.data.features)) {
      const val = this.getExpectedValue(fk, typeVec);
      if (val !== null) result[fk] = val;
    }
    return result;
  }

  /**
   * Compute deviations: measured - expected.
   * Positive = above what a master would produce for this type mix.
   */
  getDeviation(
    measured: Record<string, number>,
    typeVec: Record<string, number>,
  ): TypologicalExpectation {
    const expected: Record<string, number> = {};
    const deviation: Record<string, number> = {};
    const layers: Record<string, string> = {};

    for (const fk of Object.keys(this.data.features)) {
      const exp = this.getExpectedValue(fk, typeVec);
      if (exp === null) continue;

      expected[fk] = exp;
      layers[fk] = this.getLayer(fk);

      if (fk in measured) {
        deviation[fk] = measured[fk] - exp;
      }
    }

    return { expected, deviation, layers };
  }

  /**
   * Evaluate measured features against the 10 tipping points.
   */
  evaluateTippingPoints(
    measured: Record<string, number>,
  ): TippingPointResult[] {
    const results: TippingPointResult[] = [];

    for (const tp of this.tpData.tipping_points) {
      const value = measured[tp.feature];
      if (value === undefined) continue;

      const above = value > tp.threshold;
      const isHigherBetter = tp.direction === 'HIGHER_IS_BETTER';
      const masterSide = isHigherBetter ? above : !above;

      results.push({
        feature: tp.feature,
        value,
        threshold: tp.threshold,
        direction: tp.direction as 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER',
        above,
        delta: tp.delta,
        master_side: masterSide,
      });
    }

    return results;
  }

  /**
   * Full normalization report: expected values + deviations + tipping points.
   */
  normalize(
    measured: Record<string, number>,
    typeVec: Record<string, number>,
  ): NormalizationReport {
    const expectation = this.getDeviation(measured, typeVec);
    const tipping_points = this.evaluateTippingPoints(measured);
    const master_count = tipping_points.filter(tp => tp.master_side).length;

    return {
      expectation,
      tipping_points,
      master_count,
      total_tk: tipping_points.length,
      master_pct: tipping_points.length > 0
        ? Math.round(master_count / tipping_points.length * 100)
        : 0,
    };
  }

  /**
   * List all known features.
   */
  getFeatureNames(): string[] {
    return Object.keys(this.data.features);
  }

  /**
   * Get the number of gamma features.
   */
  get gammaFeatureCount(): number {
    return this.gammaFeatures.size;
  }
}
