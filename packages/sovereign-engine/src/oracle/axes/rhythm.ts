/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 6: RHYTHM V2
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/rhythm.ts
 * Version: 2.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×1.0
 * Measures musical rhythm via coefficient of variation (CV), not mechanical patterns.
 * 100% CALC — 0 token — fully deterministic.
 *
 * INV-RHYTHM-CV-01: Rhythm score uses coefficient of variation, not pattern counting.
 *
 * SCORING (max 100):
 * - Sentence length variance (CV) [0.35, 1.10] → 35 pts (peak at 0.65)
 * - Paragraph length variance (CV) [0.20, 1.00] → 15 pts
 * - Length range (max - min) ≥ 20 words → 15 pts
 * - Monotony avoidance (0 sequences) → 15 pts
 * - Opening variety (<10% repetition) → 10 pts
 * - Breathing (1 long + 1 short) → 10 pts
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
  // French literary prose with dramatic fragments ("Il respira.", "Silence.")
  // naturally produces high CV (0.8-1.2). Peak shifted to 0.75, range widened.
  // INV-RCI-RHYTHM-FR-01: Rhythm CV calibrated for French literary prose.
  const sentenceCV = computeCV(wordCounts);
  if (sentenceCV >= 0.30 && sentenceCV <= 1.30) {
    // Optimal range, peak at 0.75 (French literary: dramatic fragments + flowing descriptions)
    const distFromPeak = Math.abs(sentenceCV - 0.75);
    const maxDist = 0.55; // Distance from 0.75 to far edge (1.30)
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
  // INV-RCI-RHYTHM-FR-03: Length range threshold lowered for French (shorter avg sentence).
  if (wordCounts.length >= 2) {
    const minLen = Math.min(...wordCounts);
    const maxLen = Math.max(...wordCounts);
    const range = maxLen - minLen;

    if (range >= 15) {
      score += 15;
    } else if (range >= 7) {
      // Proportional: 7-14 words
      score += (range / 15) * 15;
    }
    // range < 7 → 0 pts
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
  const hasLong = wordCounts.some((wc) => wc >= 25);
  const hasShort = wordCounts.some((wc) => wc <= 7);

  if (hasLong && hasShort) {
    score += 10;
  } else if (hasLong || hasShort) {
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));

  const details = `CV_sent=${sentenceCV.toFixed(2)}, CV_para=${paragraphWordCounts.length >= 2 ? computeCV(paragraphWordCounts).toFixed(2) : 'N/A'}, range=${wordCounts.length >= 2 ? Math.max(...wordCounts) - Math.min(...wordCounts) : 0}, monotony=${styleDelta.monotony_sequences}, opening_rep=${(styleDelta.opening_repetition_rate * 100).toFixed(0)}%`;

  return {
    name: 'rhythm',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.rhythm,
    method: 'CALC',
    details,
  };
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
