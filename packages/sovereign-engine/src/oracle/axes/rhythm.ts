/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 6: RHYTHM V2
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/rhythm.ts
 * Version: 2.1.0 (P5C — K2 recalibration)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×1.0
 * Measures musical rhythm via coefficient of variation (CV), not mechanical patterns.
 * 100% CALC — 0 token — fully deterministic.
 *
 * INV-RHYTHM-CV-01: Rhythm score uses coefficient of variation, not pattern counting.
 *
 * P5C: Recalibrated for K2 2200w prose (bench P4 showed systematic undershoot).
 * Changes: CV peak 0.75→0.60, range threshold 15→12, breathing short ≤7→≤10.
 *
 * SCORING (max 100):
 * - Sentence length variance (CV) [0.30, 1.30] → 35 pts (peak at 0.60)
 * - Paragraph length variance (CV) [0.15, 1.20] → 15 pts (peak at 0.60)
 * - Length range (max - min) ≥ 12 words → 15 pts
 * - Monotony avoidance (0 sequences) → 15 pts
 * - Opening variety (<10% repetition) → 10 pts
 * - Breathing (1 long ≥25 + 1 short ≤10) → 10 pts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, AxisScore } from '../../types.js';
import { computeStyleDelta } from '../../delta/delta-style.js';
import { SOVEREIGN_CONFIG } from '../../config.js';

export function scoreRhythm(packet: ForgePacket, prose: string): AxisScore {
  const styleDelta = computeStyleDelta(packet, prose);

  // Parse sentences
  const sentences = prose.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  const wordCounts = sentences.map((s) => s.split(/\s+/).filter((w) => w.length > 0).length);

  // Parse paragraphs
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphWordCounts = paragraphs.map((p) =>
    p.split(/\s+/).filter((w) => w.length > 0).length,
  );

  let score = 0;

  // ═══ 1. SENTENCE LENGTH VARIANCE (35 pts) ═══
  // P5C: Peak recalibrated from 0.75 → 0.60 for K2 2200w prose.
  // Bench P4 shows: contemplation CV=0.32 → rhythm=39.5 (peak 0.75 too far).
  // French literary prose with K2 chunks naturally produces CV 0.50-0.70.
  // Peak 0.60 rewards moderate variety without requiring extreme fragments.
  // INV-RCI-RHYTHM-FR-01: Rhythm CV calibrated for French literary prose (K2).
  const sentenceCV = computeCV(wordCounts);
  if (sentenceCV >= 0.30 && sentenceCV <= 1.30) {
    // Optimal range, peak at 0.60 (K2 French literary: flowing prose + natural variation)
    const distFromPeak = Math.abs(sentenceCV - 0.60);
    const maxDist = 0.70; // Distance from 0.60 to far edge (1.30)
    const cvScore = 35 * (1 - distFromPeak / maxDist);
    score += Math.max(0, cvScore);
  } else if (sentenceCV < 0.30) {
    // Too uniform → linear falloff
    const falloff = (sentenceCV / 0.30) * 20;
    score += falloff;
  } else {
    // Extreme chaos (CV > 1.30) → linear falloff
    const excess = sentenceCV - 1.30;
    const falloff = Math.max(0, 15 - excess * 30);
    score += falloff;
  }

  // ═══ 2. PARAGRAPH LENGTH VARIANCE (15 pts) ═══
  // INV-RCI-RHYTHM-FR-02: Paragraph CV calibrated for French literary prose.
  if (paragraphWordCounts.length >= 2) {
    const paragraphCV = computeCV(paragraphWordCounts);
    if (paragraphCV >= 0.15 && paragraphCV <= 1.20) {
      // Wide optimal range — French literary uses dramatic 1-line paragraphs freely
      const distFromPeak = Math.abs(paragraphCV - 0.60);
      const maxDist = 0.60;
      const paraScore = 15 * (1 - distFromPeak / maxDist);
      score += Math.max(0, paraScore);
    } else if (paragraphCV < 0.15) {
      const falloff = (paragraphCV / 0.15) * 10;
      score += falloff;
    } else {
      const excess = paragraphCV - 1.20;
      const falloff = Math.max(0, 10 - excess * 20);
      score += falloff;
    }
  } else {
    // Single paragraph → neutral 7.5 pts
    score += 7.5;
  }

  // ═══ 3. LENGTH RANGE (15 pts) ═══
  // P5C: Full-points threshold lowered from 15 → 12 for K2 2200w prose.
  // K2 prose naturally has range 10-14; old threshold penalized realistic variation.
  // INV-RCI-RHYTHM-FR-03: Length range threshold calibrated for K2 French prose.
  if (wordCounts.length >= 2) {
    const minLen = Math.min(...wordCounts);
    const maxLen = Math.max(...wordCounts);
    const range = maxLen - minLen;

    if (range >= 12) {
      score += 15;
    } else if (range >= 5) {
      // Proportional: 5-11 words
      score += (range / 12) * 15;
    }
    // range < 5 → 0 pts
  }

  // ═══ 4. MONOTONY AVOIDANCE (15 pts) ═══
  if (styleDelta.monotony_sequences === 0) {
    score += 15;
  } else if (styleDelta.monotony_sequences <= 2) {
    score += 9; // Minor monotony
  } else if (styleDelta.monotony_sequences <= 4) {
    score += 4;
  }

  // ═══ 5. OPENING VARIETY (10 pts) ═══
  if (styleDelta.opening_repetition_rate < SOVEREIGN_CONFIG.OPENING_REPETITION_MAX) {
    score += 10;
  } else if (styleDelta.opening_repetition_rate < SOVEREIGN_CONFIG.OPENING_REPETITION_MAX * 2) {
    score += 5;
  }

  // ═══ 6. BREATHING (10 pts) ═══
  // P5C: Short threshold widened from ≤7 → ≤10 for K2 prose.
  // French literary K2 prose uses short phrases of 8-10 words as natural punctuation,
  // not just 3-7 word fragments. Old threshold missed these legitimate breaks.
  const hasLong = wordCounts.some((wc) => wc >= 25);
  const hasShort = wordCounts.some((wc) => wc <= 10);

  if (hasLong && hasShort) {
    score += 10;
  } else if (hasLong || hasShort) {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));

  // R3 Confidence — computed for traceability, applied as WEIGHT in computeRCI (macro-axes.ts)
  // NOT applied to the raw score here (Correction B: faible confiance = faible AUTORITÉ, pas retour à la moyenne)
  const totalWordCount = prose.split(/\s+/).filter(w => w.length > 0).length;
  const conf = rhythmConfidence(totalWordCount);

  const details = `CV_sent=${sentenceCV.toFixed(2)}, CV_para=${paragraphWordCounts.length >= 2 ? computeCV(paragraphWordCounts).toFixed(2) : 'N/A'}, range=${wordCounts.length >= 2 ? Math.max(...wordCounts) - Math.min(...wordCounts) : 0}, monotony=${styleDelta.monotony_sequences}, opening_rep=${(styleDelta.opening_repetition_rate * 100).toFixed(0)}%, conf_r3=${conf.toFixed(2)}`;

  return {
    name: 'rhythm',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.rhythm,
    method: 'CALC',
    details,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// R3 CONFIDENCE SCALING — INV-RCI-CONF-01
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Confidence factor for rhythm scoring based on text length.
 *
 * Data from Phase R3 (181 works, OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json):
 * confidence(f1a_rhythm_variance, n_words) measured empirically.
 *
 * On short bricks (400-600w), sentence length CV is statistically volatile —
 * the scorer would punish volatility instead of quality. This function
 * returns a confidence in [0.30, 1.0] that attenuates the raw score
 * toward NEUTRAL_RHYTHM for short texts.
 */
export function rhythmConfidence(wordCount: number): number {
  if (wordCount >= 3000) return 1.0;
  if (wordCount <= 100) return 0.30;

  // Anchor points from R3 empirical measurement
  const points: [number, number][] = [
    [100, 0.30],
    [300, 0.65],
    [600, 0.80],
    [1500, 0.95],
    [3000, 1.0],
  ];

  // Linear interpolation between nearest anchor points
  for (let i = 0; i < points.length - 1; i++) {
    const [w0, c0] = points[i];
    const [w1, c1] = points[i + 1];
    if (wordCount >= w0 && wordCount <= w1) {
      const t = (wordCount - w0) / (w1 - w0);
      return c0 + t * (c1 - c0);
    }
  }
  return 1.0;
}

/**
 * Compute coefficient of variation (CV = stddev / mean)
 * Measures relative variability independent of scale.
 */
function computeCV(values: readonly number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;

  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance);

  return stddev / mean;
}
