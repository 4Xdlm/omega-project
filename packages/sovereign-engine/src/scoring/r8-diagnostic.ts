/**
 * OMEGA R-8 Diagnostic Module — Phase P1
 * Date: 2026-03-22
 * Role: Combines GB V1 (Layer 1 Judge) + Passage Classifier + Typological
 *       Normalizer (Layer 2 Physicist) into a unified diagnostic report.
 *
 * Does NOT replace the judge — provides EXPLANATORY diagnostics.
 */

import { scoreText } from './gb-scorer.js';
import { classifyPassage, type PassageClassification } from './passage-classifier.js';
import {
  TypologicalNormalizer,
  type TypologicalData,
  type TippingPointsData,
  type NormalizationReport,
  type TippingPointResult,
} from './typological-normalizer.js';
import tippingPointsData from './data/R8_TIPPING_POINTS.json' with { type: 'json' };
import typologicalData from './data/R8_TYPOLOGICAL_CONSTANTS.json' with { type: 'json' };

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface R8DiagnosticReport {
  /** GB V1 score (1-5 scale) */
  gb_score: number;
  /** Tier interpretation */
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  /** Type composition vector (sum = 1.0) */
  type_composition: PassageClassification;
  /** Dominant type */
  dominant_type: string;
  /** Tipping points audit */
  tipping_points: TippingPointResult[];
  /** Count of Tk on master side */
  tk_master_count: number;
  tk_total: number;
  /** Key features (top 10 by GB importance) */
  key_features: Array<{ name: string; value: number; importance: number }>;
  /** Word count */
  word_count: number;
  /** Full normalization report (optional, for detailed analysis) */
  normalization?: NormalizationReport;
}

// ═══════════════════════════════════════════════════════════════════════
// NORMALIZER INSTANCE
// ═══════════════════════════════════════════════════════════════════════

let normalizer: TypologicalNormalizer | null = null;

function getNormalizer(): TypologicalNormalizer {
  if (!normalizer) {
    normalizer = new TypologicalNormalizer(
      typologicalData as unknown as TypologicalData,
      tippingPointsData as unknown as TippingPointsData,
    );
  }
  return normalizer;
}

/**
 * Extract pure numeric type proportions from PassageClassification.
 * Strips dominant_type (string) to produce a clean Record<string, number>
 * compatible with TypologicalNormalizer.normalize().
 */
function toTypeVector(pc: PassageClassification): Record<string, number> {
  return {
    action: pc.action,
    narration: pc.narration,
    description: pc.description,
    dialogue: pc.dialogue,
    introspection: pc.introspection,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN DIAGNOSTIC FUNCTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Produce a complete R-8 diagnostic report for a text passage.
 *
 * @param text - Raw text to analyze (typically 500-2000 words)
 * @returns Complete diagnostic with GB score, type, Tk audit, key features
 */
export function diagnose(text: string): R8DiagnosticReport {
  // 1. Score with GB V1
  const gbResult = scoreText(text);

  // 2. Classify passage type
  const typeVec = classifyPassage(text);

  // 3. Evaluate tipping points
  const norm = getNormalizer();
  const tippingPoints = norm.evaluateTippingPoints(gbResult.features);
  const tkMasterCount = tippingPoints.filter(tp => tp.master_side).length;

  // 4. Full normalization (if normalizer supports it)
  let normReport: NormalizationReport | undefined;
  try {
    normReport = norm.normalize(gbResult.features, toTypeVector(typeVec));
  } catch {
    // Normalization may fail if feature names don't match — non-blocking
  }

  return {
    gb_score: gbResult.score,
    tier: gbResult.tier,
    type_composition: typeVec,
    dominant_type: typeVec.dominant_type,
    tipping_points: tippingPoints,
    tk_master_count: tkMasterCount,
    tk_total: tippingPoints.length,
    key_features: gbResult.topFeatures,
    word_count: text.split(/\s+/).length,
    normalization: normReport,
  };
}

/**
 * Quick diagnostic: just GB score + tier + Tk count.
 * Faster than full diagnose() — skips normalization.
 */
export function quickDiagnose(text: string): {
  gb_score: number;
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  tk_master_count: number;
  tk_total: number;
  dominant_type: string;
} {
  const gbResult = scoreText(text);
  const typeVec = classifyPassage(text);
  const tippingPoints = getNormalizer().evaluateTippingPoints(gbResult.features);
  const tkMasterCount = tippingPoints.filter(tp => tp.master_side).length;

  return {
    gb_score: gbResult.score,
    tier: gbResult.tier,
    tk_master_count: tkMasterCount,
    tk_total: tippingPoints.length,
    dominant_type: typeVec.dominant_type,
  };
}
