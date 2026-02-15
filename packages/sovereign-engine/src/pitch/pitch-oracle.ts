/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — PITCH ORACLE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: pitch/pitch-oracle.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Selects best pitch from 3 candidates.
 * Scoring = Σ(item.expected_gain.delta × gravity[item.expected_gain.axe])
 * Gravity = axis weight from S-ORACLE.
 * 100% deterministic. 0 token.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { CorrectionPitch, PitchOracleResult } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';

export function selectBestPitch(
  pitches: readonly [CorrectionPitch, CorrectionPitch, CorrectionPitch],
): PitchOracleResult {
  const gravity = SOVEREIGN_CONFIG.WEIGHTS;

  const scores = pitches.map((pitch) => {
    let score = 0;
    for (const item of pitch.items) {
      const axisWeight = (gravity as Record<string, number>)[item.expected_gain.axe] ?? 1.0;
      score += item.expected_gain.delta * axisWeight;
    }
    return score;
  });

  const maxScore = Math.max(...scores);
  const bestIdx = scores.indexOf(maxScore);
  const bestPitch = pitches[bestIdx];

  const selection_reason = `Pitch ${String.fromCharCode(65 + bestIdx)} selected: weighted score ${maxScore.toFixed(1)} (strategy: ${bestPitch.strategy})`;

  return {
    pitches: [...pitches],
    selected_pitch_id: bestPitch.pitch_id,
    selection_score: maxScore,
    selection_reason,
  };
}
