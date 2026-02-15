/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — DELTA EMOTION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: delta/delta-emotion.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures emotional distance between target and actual prose.
 * Uses omega-forge 14D functions for precision measurement.
 *
 * ALGORITHM:
 * 1. Split prose into paragraphs
 * 2. Group paragraphs into 4 quartiles
 * 3. For each quartile: analyze emotion from text (omega-forge)
 * 4. Compute euclidean distance and cosine similarity vs target
 * 5. Detect rupture timing error
 * 6. Compute curve correlation (Pearson)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  analyzeEmotionFromText,
  euclideanDistance14D,
  cosineSimilarity14D,
  computeValence,
  computeArousal,
  dominantEmotion,
} from '@omega/omega-forge';

import type { ForgePacket, EmotionDelta, QuartileDistance } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function computeEmotionDelta(packet: ForgePacket, prose: string): EmotionDelta {
  const paragraphs = splitIntoParagraphs(prose);
  const quartileGroups = groupIntoQuartiles(paragraphs);

  const quartile_distances: QuartileDistance[] = [];

  for (let i = 0; i < 4; i++) {
    const qKey = ['Q1', 'Q2', 'Q3', 'Q4'][i] as 'Q1' | 'Q2' | 'Q3' | 'Q4';
    const target = packet.emotion_contract.curve_quartiles[i];
    const actualText = quartileGroups[i];

    // Analyze actual emotion from text
    const actualState = analyzeEmotionFromText(actualText);

    // Distance metrics
    const euclidean_distance = euclideanDistance14D(target.target_14d as any, actualState);
    const cosine_similarity = cosineSimilarity14D(target.target_14d as any, actualState);

    // Valence and arousal
    const actualValence = computeValence(actualState);
    const actualArousal = computeArousal(actualState);
    const valence_delta = actualValence - target.valence;
    const arousal_delta = actualArousal - target.arousal;

    // Dominant emotion match
    const actualDominant = dominantEmotion(actualState);
    const dominant_match = actualDominant === target.dominant;

    quartile_distances.push({
      quartile: qKey,
      euclidean_distance,
      cosine_similarity,
      valence_delta,
      arousal_delta,
      dominant_match,
    });
  }

  // Curve correlation
  const targetArousals = packet.emotion_contract.curve_quartiles.map((q) => q.arousal);
  const actualArousals = quartile_distances.map((q) => {
    const target = packet.emotion_contract.curve_quartiles.find((t) => t.quartile === q.quartile);
    return target ? target.arousal + q.arousal_delta : 0;
  });
  const curve_correlation = pearsonCorrelation(targetArousals, actualArousals);

  // Terminal distance
  const terminalTarget = packet.emotion_contract.terminal_state;
  const terminalActual = analyzeEmotionFromText(quartileGroups[3]);
  const terminal_distance = euclideanDistance14D(terminalTarget.target_14d as any, terminalActual);

  // Rupture detection
  const { rupture_detected, rupture_timing_error } = detectRupture(
    packet,
    quartile_distances,
  );

  return {
    quartile_distances,
    curve_correlation,
    terminal_distance,
    rupture_detected,
    rupture_timing_error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function splitIntoParagraphs(prose: string): string[] {
  return prose
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function groupIntoQuartiles(paragraphs: string[]): [string, string, string, string] {
  const total = paragraphs.length;
  const bounds = SOVEREIGN_CONFIG.QUARTILE_BOUNDS;

  const q1 = paragraphs
    .slice(
      Math.floor(bounds.Q1[0] * total),
      Math.ceil(bounds.Q1[1] * total),
    )
    .join('\n\n');
  const q2 = paragraphs
    .slice(
      Math.floor(bounds.Q2[0] * total),
      Math.ceil(bounds.Q2[1] * total),
    )
    .join('\n\n');
  const q3 = paragraphs
    .slice(
      Math.floor(bounds.Q3[0] * total),
      Math.ceil(bounds.Q3[1] * total),
    )
    .join('\n\n');
  const q4 = paragraphs
    .slice(
      Math.floor(bounds.Q4[0] * total),
      Math.ceil(bounds.Q4[1] * total),
    )
    .join('\n\n');

  return [q1, q2, q3, q4];
}

function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

function detectRupture(
  packet: ForgePacket,
  quartile_distances: QuartileDistance[],
): { readonly rupture_detected: boolean; readonly rupture_timing_error: number } {
  if (!packet.emotion_contract.rupture.exists) {
    return { rupture_detected: false, rupture_timing_error: 0 };
  }

  const targetRupturePos = packet.emotion_contract.rupture.position_pct;

  // Find largest valence delta between adjacent quartiles in actual
  let maxDelta = 0;
  let actualRupturePos = 0;

  for (let i = 0; i < 3; i++) {
    const targetI = packet.emotion_contract.curve_quartiles[i];
    const targetIPlus1 = packet.emotion_contract.curve_quartiles[i + 1];

    const actualValenceI = targetI.valence + quartile_distances[i].valence_delta;
    const actualValenceIPlus1 =
      targetIPlus1.valence + quartile_distances[i + 1].valence_delta;

    const delta = Math.abs(actualValenceIPlus1 - actualValenceI);

    if (delta > maxDelta) {
      maxDelta = delta;
      actualRupturePos = (i + 1) / 4;
    }
  }

  const rupture_detected = maxDelta > 0.3;
  const rupture_timing_error = rupture_detected
    ? Math.abs(actualRupturePos - targetRupturePos)
    : 1.0;

  return { rupture_detected, rupture_timing_error };
}
