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

import type { CorrectionPitch, PitchOracleResult, DeltaReport } from '../types.js';
import type { PitchStrategy } from './triple-pitch-engine.js';
import { isEmotionOp, isCraftOp } from './triple-pitch-engine.js';
import { sha256, canonicalize } from '@omega/canon-kernel';
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

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint S0-C — PitchStrategy Oracle (offline deterministic)
// Score = emotion_ops_count × 0.63 + craft_ops_count × 0.37
// ═══════════════════════════════════════════════════════════════════════════════

export interface OracleDecision {
  readonly selected_index: 0 | 1 | 2;
  readonly selected_strategy: PitchStrategy;
  readonly scores: readonly [number, number, number];
  readonly oracle_hash: string;
}

function scoreStrategy(strategy: PitchStrategy): number {
  let emotionCount = 0;
  let craftCount = 0;
  for (const op of strategy.op_sequence) {
    if (isEmotionOp(op)) {
      emotionCount++;
    } else {
      craftCount++;
    }
  }
  return emotionCount * 0.63 + craftCount * 0.37;
}

export function selectBestPitchStrategy(
  strategies: readonly [PitchStrategy, PitchStrategy, PitchStrategy],
  _delta: DeltaReport,
): OracleDecision {
  const scores: [number, number, number] = [
    scoreStrategy(strategies[0]),
    scoreStrategy(strategies[1]),
    scoreStrategy(strategies[2]),
  ];

  let bestIdx = 0;
  for (let i = 1; i < 3; i++) {
    if (scores[i] > scores[bestIdx]) {
      bestIdx = i;
    }
  }

  const hashable = {
    strategy_ids: strategies.map((s) => s.id),
    scores,
    selected_index: bestIdx,
  };

  return {
    selected_index: bestIdx as 0 | 1 | 2,
    selected_strategy: strategies[bestIdx],
    scores,
    oracle_hash: sha256(canonicalize(hashable)),
  };
}
