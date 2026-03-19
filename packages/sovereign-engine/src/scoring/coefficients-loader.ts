/**
 * OMEGA Coefficients Loader
 * Phase R4 — Loads and queries the R3 coefficients JSON.
 *
 * Provides interpolation for intermediate text sizes and
 * lookup methods for confidence, weights, modifiers.
 */

import { readFileSync } from 'fs';
import type {
  OmegaCoefficients,
  ConfidenceEntry,
  WeightEntry,
  PrelZone,
} from './types.js';

const STANDARD_WINDOWS = [30, 150, 300, 600, 1000, 1500, 2500, 5000, 10000, 20000];
const CONFIDENCE_DISABLE_THRESHOLD = 0.20;

/**
 * Determines the P_rel zone for a given relative position.
 */
export function getPrelZone(pRel: number): PrelZone {
  if (pRel < 0.10) return 'OPENING';
  if (pRel < 0.40) return 'SETUP';
  if (pRel < 0.60) return 'MIDDLE';
  if (pRel < 0.85) return 'TENSION';
  return 'CLOSING';
}

/**
 * Linearly interpolates between two values.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Finds the two bracketing standard windows for a given word count
 * and returns the interpolation factor.
 */
function bracketWindows(wordCount: number): { lo: number; hi: number; t: number } {
  if (wordCount <= STANDARD_WINDOWS[0]) {
    return { lo: STANDARD_WINDOWS[0], hi: STANDARD_WINDOWS[0], t: 0 };
  }
  if (wordCount >= STANDARD_WINDOWS[STANDARD_WINDOWS.length - 1]) {
    const last = STANDARD_WINDOWS[STANDARD_WINDOWS.length - 1];
    return { lo: last, hi: last, t: 0 };
  }
  for (let i = 0; i < STANDARD_WINDOWS.length - 1; i++) {
    if (wordCount >= STANDARD_WINDOWS[i] && wordCount < STANDARD_WINDOWS[i + 1]) {
      const lo = STANDARD_WINDOWS[i];
      const hi = STANDARD_WINDOWS[i + 1];
      const t = (wordCount - lo) / (hi - lo);
      return { lo, hi, t };
    }
  }
  const last = STANDARD_WINDOWS[STANDARD_WINDOWS.length - 1];
  return { lo: last, hi: last, t: 0 };
}

export class CoefficientsLoader {
  private data: OmegaCoefficients;

  constructor(jsonPath: string) {
    const raw = readFileSync(jsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    this.data = {
      confidence_table: parsed['confidence_table'] as OmegaCoefficients['confidence_table'],
      disabled_below: parsed['disabled_below'] as OmegaCoefficients['disabled_below'],
      never_active_features: parsed['never_active_features'] as string[],
      weight_table: parsed['weight_table'] as OmegaCoefficients['weight_table'],
      position_modifiers: parsed['position_modifiers'] as OmegaCoefficients['position_modifiers'],
      type_modifiers: parsed['type_modifiers'] as OmegaCoefficients['type_modifiers'],
      language_dependency: parsed['language_dependency'] as OmegaCoefficients['language_dependency'],
      scoring_formula: parsed['scoring_formula'] as OmegaCoefficients['scoring_formula'],
    };
  }

  /** Returns the raw coefficients data. */
  getRaw(): OmegaCoefficients {
    return this.data;
  }

  /**
   * Returns the confidence for a feature at a given word count.
   * Uses linear interpolation between bracketing standard windows.
   * Returns 0 for never-active features.
   */
  getConfidence(feature: string, wordCount: number): number {
    if (this.data.never_active_features.includes(feature)) {
      return 0;
    }
    const entry: ConfidenceEntry | undefined = this.data.confidence_table[feature];
    if (!entry) return 0;

    const { lo, hi, t } = bracketWindows(wordCount);
    const cLo = entry[String(lo)];
    const cHi = entry[String(hi)];

    if (cLo === null || cLo === undefined) return 0;
    if (cHi === null || cHi === undefined) return cLo;
    if (lo === hi) return cLo;

    return lerp(cLo, cHi, t);
  }

  /**
   * Returns whether a feature is active at a given word count.
   */
  isFeatureActive(feature: string, wordCount: number): boolean {
    return this.getConfidence(feature, wordCount) >= CONFIDENCE_DISABLE_THRESHOLD;
  }

  /**
   * Returns the weight table for a given stage.
   * The stage key is derived from the closest standard window.
   */
  getWeightTable(stage: 'LOCAL' | 'ARC'): Map<string, WeightEntry> {
    const stageKey = stage === 'LOCAL' ? 'LOCAL_600' : 'ARC_2500';
    const table = this.data.weight_table[stageKey];
    if (!table) return new Map();

    const result = new Map<string, WeightEntry>();
    for (const [feat, entry] of Object.entries(table)) {
      result.set(feat, entry);
    }
    return result;
  }

  /**
   * Returns the position modifier for a feature at a given P_rel.
   * Returns 1.0 for features without position modifiers (STABLE).
   */
  getPositionModifier(feature: string, pRel: number): number {
    const entry = this.data.position_modifiers[feature];
    if (!entry) return 1.0;

    const zone = getPrelZone(pRel);
    const mod = entry[zone];
    return mod ?? 1.0;
  }

  /**
   * Returns the type modifier for a feature given a passage type.
   * Returns 1.0 if no modifier exists for this feature/type combo.
   */
  getTypeModifier(feature: string, passageType: string): number {
    const typeMods = this.data.type_modifiers[passageType];
    if (!typeMods) return 1.0;

    const mod = typeMods[feature];
    return mod ?? 1.0;
  }

  /**
   * Returns alpha (LOCAL weight) and beta (ARC weight) for a given word count.
   * Uses interpolation between bracketing standard windows.
   */
  getAlphaBeta(wordCount: number): { alpha: number; beta: number } {
    const { lo, hi, t } = bracketWindows(wordCount);
    const fLo = this.data.scoring_formula[String(lo)];
    const fHi = this.data.scoring_formula[String(hi)];

    if (!fLo) return { alpha: 0.5, beta: 0.5 };
    if (!fHi || lo === hi) return { alpha: fLo.alpha_LOCAL, beta: fLo.beta_ARC };

    return {
      alpha: lerp(fLo.alpha_LOCAL, fHi.alpha_LOCAL, t),
      beta: lerp(fLo.beta_ARC, fHi.beta_ARC, t),
    };
  }

  /**
   * Returns the list of never-active features.
   */
  getNeverActive(): string[] {
    return this.data.never_active_features;
  }

  /**
   * Returns feature names available in the weight table for a stage.
   */
  getStageFeatures(stage: 'LOCAL' | 'ARC'): string[] {
    const table = this.getWeightTable(stage);
    return Array.from(table.keys());
  }
}
