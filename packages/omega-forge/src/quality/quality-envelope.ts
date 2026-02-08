/**
 * OMEGA Forge — Quality Envelope
 * Phase C.5 — Aggregate M1-M12 into quality score (40% weight)
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import type {
  QualityMetrics, QualityEnvelope, F5Config,
  StyledOutput, GenesisPlan, ScribeOutput, Canon,
} from '../types.js';
import { computeM1, computeM2 } from './canon-compliance.js';
import { computeM3, computeM4, computeM5 } from './structure-metrics.js';
import { computeM6, computeM7 } from './style-metrics.js';
import { computeM8, computeM9 } from './necessity-metrics.js';
import { computeM10, computeM11 } from './complexity-metrics.js';
import { computeM12 } from '../benchmark/composite-scorer.js';
import { resolveF5ConfigValue } from '../config.js';

/** Compute all quality metrics M1-M12 */
export function computeQualityMetrics(
  styleOutput: StyledOutput,
  plan: GenesisPlan,
  scribeOutput: ScribeOutput,
  canon: Canon,
  _config: F5Config,
): QualityMetrics {
  const paragraphs = styleOutput.paragraphs;

  const M1 = computeM1(paragraphs, canon);
  const M2 = computeM2(paragraphs, canon);
  const M3 = computeM3(paragraphs);
  const M4 = computeM4(paragraphs, plan);
  const M5 = computeM5(paragraphs);
  const M6 = computeM6(styleOutput);
  const M7 = computeM7(styleOutput);
  const M8 = computeM8(paragraphs, scribeOutput);
  const M9 = computeM9(paragraphs);
  const M10 = computeM10(paragraphs);
  const M11 = computeM11(paragraphs, styleOutput);

  const partial: Omit<QualityMetrics, 'M12_superiority_index'> = {
    M1_contradiction_rate: M1,
    M2_canon_compliance: M2,
    M3_coherence_span: M3,
    M4_arc_maintenance: M4,
    M5_memory_integrity: M5,
    M6_style_emergence: M6,
    M7_author_fingerprint: M7,
    M8_sentence_necessity: M8,
    M9_semantic_density: M9,
    M10_reading_levels: M10,
    M11_discomfort_index: M11,
  };

  const M12 = computeM12({
    ...partial,
    M12_superiority_index: 0,
  });

  return {
    ...partial,
    M12_superiority_index: M12,
  };
}

/** Aggregate quality metrics into a single score */
export function computeQualityScore(metrics: QualityMetrics, config: F5Config): number {
  const tauNec = resolveF5ConfigValue(config.TAU_NECESSITY);
  const tauDisMin = resolveF5ConfigValue(config.TAU_DISCOMFORT_MIN);
  const tauDisMax = resolveF5ConfigValue(config.TAU_DISCOMFORT_MAX);

  const scores: number[] = [];

  scores.push(metrics.M1_contradiction_rate === 0 ? 1 : 0);
  scores.push(metrics.M2_canon_compliance);
  scores.push(Math.min(1, metrics.M3_coherence_span / 100));
  scores.push(Math.min(1, metrics.M4_arc_maintenance / 3));
  scores.push(metrics.M5_memory_integrity);
  scores.push(metrics.M6_style_emergence);
  scores.push(Math.min(1, metrics.M7_author_fingerprint));
  scores.push(metrics.M8_sentence_necessity >= tauNec ? 1 : metrics.M8_sentence_necessity / tauNec);
  scores.push(Math.min(1, metrics.M9_semantic_density / 0.5));
  scores.push(Math.min(1, metrics.M10_reading_levels / 4));

  const discomfort = metrics.M11_discomfort_index;
  const discomfortScore = (discomfort >= tauDisMin && discomfort <= tauDisMax) ? 1
    : discomfort < tauDisMin ? discomfort / tauDisMin
    : 1 - (discomfort - tauDisMax) / (1 - tauDisMax);
  scores.push(Math.max(0, discomfortScore));

  scores.push(Math.min(1, metrics.M12_superiority_index));

  const total = scores.reduce((sum, s) => sum + s, 0);
  return total / scores.length;
}

/** Build complete quality envelope */
export function buildQualityEnvelope(
  styleOutput: StyledOutput,
  plan: GenesisPlan,
  scribeOutput: ScribeOutput,
  canon: Canon,
  config: F5Config,
): QualityEnvelope {
  const metrics = computeQualityMetrics(styleOutput, plan, scribeOutput, canon, config);
  const quality_score = computeQualityScore(metrics, config);

  return {
    metrics,
    quality_score,
    quality_hash: sha256(canonicalize({
      score: quality_score,
      M1: metrics.M1_contradiction_rate,
      M2: metrics.M2_canon_compliance,
      M8: metrics.M8_sentence_necessity,
    })),
  };
}
