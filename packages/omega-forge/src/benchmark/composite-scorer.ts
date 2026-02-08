/**
 * OMEGA Forge — Composite Scorer
 * Phase C.5 — M12 = sum(wi * normalize(Mi)) / sum(wi)
 * F5-INV-14: 0.6 * emotion + 0.4 * quality
 */

import type { QualityMetrics, ForgeScore, F5Config } from '../types.js';
import { resolveF5ConfigValue } from '../config.js';

/** Weights for M1-M11 in the M12 composite */
const METRIC_WEIGHTS: readonly number[] = [
  2.0,  // M1: contradictions (inverse — high weight for compliance)
  1.5,  // M2: canon compliance
  0.5,  // M3: coherence span
  0.5,  // M4: arc maintenance
  0.5,  // M5: memory integrity
  1.0,  // M6: style emergence
  0.5,  // M7: author fingerprint
  1.5,  // M8: necessity
  0.5,  // M9: semantic density
  0.5,  // M10: reading levels
  1.0,  // M11: discomfort
];

/** Normalize a metric to [0, 1] range */
function normalizeMetric(value: number, index: number): number {
  switch (index) {
    case 0: return value === 0 ? 1 : 0;           // M1: 0 contradictions = 1
    case 1: return Math.min(1, value);              // M2: ratio
    case 2: return Math.min(1, value / 200);        // M3: span in words, normalized to 200
    case 3: return Math.min(1, value / 5);          // M4: arcs, normalized to 5
    case 4: return Math.min(1, value);              // M5: ratio
    case 5: return Math.min(1, value);              // M6: ratio
    case 6: return Math.min(1, value);              // M7: ratio
    case 7: return Math.min(1, value);              // M8: ratio
    case 8: return Math.min(1, value / 0.6);        // M9: density normalized to 0.6
    case 9: return Math.min(1, value / 4);          // M10: layers normalized to 4
    case 10: {                                       // M11: [0.3, 0.7] range
      if (value >= 0.3 && value <= 0.7) return 1;
      if (value < 0.3) return value / 0.3;
      return Math.max(0, 1 - (value - 0.7) / 0.3);
    }
    default: return 0;
  }
}

/** Compute M12: weighted composite of M1-M11 */
export function computeM12(metrics: QualityMetrics): number {
  const values = [
    metrics.M1_contradiction_rate,
    metrics.M2_canon_compliance,
    metrics.M3_coherence_span,
    metrics.M4_arc_maintenance,
    metrics.M5_memory_integrity,
    metrics.M6_style_emergence,
    metrics.M7_author_fingerprint,
    metrics.M8_sentence_necessity,
    metrics.M9_semantic_density,
    metrics.M10_reading_levels,
    metrics.M11_discomfort_index,
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < values.length; i++) {
    const normalized = normalizeMetric(values[i], i);
    weightedSum += METRIC_WEIGHTS[i] * normalized;
    totalWeight += METRIC_WEIGHTS[i];
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/** Compute ForgeScore: 0.6 * emotion + 0.4 * quality */
export function computeForgeScore(
  emotion_compliance: number,
  quality_score: number,
  config: F5Config,
): ForgeScore {
  const wEmo = resolveF5ConfigValue(config.WEIGHT_EMOTION);
  const wQual = resolveF5ConfigValue(config.WEIGHT_QUALITY);
  const composite = wEmo * emotion_compliance + wQual * quality_score;

  return {
    emotion_compliance,
    quality_score,
    composite,
  };
}
