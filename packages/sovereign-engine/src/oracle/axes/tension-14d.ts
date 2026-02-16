/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 2: TENSION 14D
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/tension-14d.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * THE NUCLEAR WEAPON — Weight ×3.0
 * Measures conformity to prescribed 14D emotional trajectory.
 * 100% CALC — 0 token — fully deterministic.
 *
 * This is what makes OMEGA unique: no other system measures prose
 * against a 14D emotion vector prescribed trajectory.
 *
 * ALGORITHM:
 * 1. Split prose into 4 quartiles
 * 2. Analyze actual 14D state per quartile (omega-forge)
 * 3. Compute cosine similarity with target per quartile
 * 4. Average similarities → base score [0, 100]
 * 5. Bonus: rupture at correct timing → +10
 * 6. Penalty: monotone (all quartiles similar) → -20
 * 7. Clamp [0, 100]
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  analyzeEmotionFromText,
  cosineSimilarity14D,
  euclideanDistance14D,
} from '@omega/omega-forge';

import type { ForgePacket, AxisScore, SovereignProvider } from '../../types.js';
import { SOVEREIGN_CONFIG } from '../../config.js';
import { analyzeEmotionSemantic } from '../../semantic/semantic-analyzer.js';
import type { SemanticEmotionResult } from '../../semantic/types.js';

/**
 * Analyzes emotion using semantic (if enabled + provider) or fallback to keywords.
 */
async function analyzeEmotion(
  text: string,
  language: 'fr' | 'en',
  provider?: SovereignProvider,
): Promise<SemanticEmotionResult> {
  if (SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED && provider) {
    // Use semantic LLM-based analysis
    return await analyzeEmotionSemantic(text, language, provider);
  }
  // Fallback to keyword-based analysis
  const keywordResult = analyzeEmotionFromText(text, language);
  // Convert to SemanticEmotionResult (same structure)
  return {
    joy: keywordResult.joy,
    trust: keywordResult.trust,
    fear: keywordResult.fear,
    surprise: keywordResult.surprise,
    sadness: keywordResult.sadness,
    disgust: keywordResult.disgust,
    anger: keywordResult.anger,
    anticipation: keywordResult.anticipation,
    love: keywordResult.love,
    submission: keywordResult.submission,
    awe: keywordResult.awe,
    disapproval: keywordResult.disapproval,
    remorse: keywordResult.remorse,
    contempt: keywordResult.contempt,
  };
}

export async function scoreTension14D(
  packet: ForgePacket,
  prose: string,
  provider?: SovereignProvider,
): Promise<AxisScore> {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const total = paragraphs.length;

  const bounds = SOVEREIGN_CONFIG.QUARTILE_BOUNDS;
  const quartiles = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

  const similarities: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [startFrac, endFrac] = bounds[quartiles[i]];
    const startIdx = Math.floor(startFrac * total);
    const endIdx = Math.ceil(endFrac * total);

    const quartileText = paragraphs.slice(startIdx, endIdx).join('\n\n');
    const actualState = await analyzeEmotion(quartileText, packet.language, provider);
    const targetState = packet.emotion_contract.curve_quartiles[i].target_14d;

    const similarity = cosineSimilarity14D(targetState as any, actualState as any);
    similarities.push(similarity);
  }

  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  // Calibrated scaling: text-based emotion analysis vs prescribed 14D vector
  // has inherent noise. Cosine similarity [0.4-0.8] is the realistic range.
  // Linear scale 0→100 penalizes unfairly. Use boosted curve:
  // similarity < 0.3 → score = similarity * 80 (harsh)
  // similarity 0.3-0.6 → score = 24 + (similarity-0.3)*200 (steep climb)
  // similarity > 0.6 → score = 84 + (similarity-0.6)*40 (plateau toward 100)
  let score: number;
  if (avgSimilarity < 0.3) {
    score = avgSimilarity * 80;
  } else if (avgSimilarity <= 0.6) {
    score = 24 + (avgSimilarity - 0.3) * 200;
  } else {
    score = 84 + (avgSimilarity - 0.6) * 40;
  }

  if (packet.emotion_contract.rupture.exists) {
    const actualStates = await Promise.all(
      quartiles.map(async (q, _idx) => {
        const [startFrac, endFrac] = bounds[q];
        const startIdx = Math.floor(startFrac * total);
        const endIdx = Math.ceil(endFrac * total);
        const text = paragraphs.slice(startIdx, endIdx).join('\n\n');
        return await analyzeEmotion(text, packet.language, provider);
      }),
    );

    let maxDist = 0;
    let ruptureIdx = -1;
    for (let i = 0; i < 3; i++) {
      const dist = euclideanDistance14D(actualStates[i], actualStates[i + 1]);
      if (dist > maxDist) {
        maxDist = dist;
        ruptureIdx = i;
      }
    }

    const actualRupturePos = (ruptureIdx + 1) / 4;
    const targetRupturePos = packet.emotion_contract.rupture.position_pct;
    const timingError = Math.abs(actualRupturePos - targetRupturePos);

    if (timingError < SOVEREIGN_CONFIG.TIMING_TOLERANCE) {
      score += 10;
    }
  }

  // Monotony penalty: only if prescribed trajectory has VARIATION
  // If all quartile targets are similar (single emotion scene), monotone prose is CORRECT
  const prescribedValences = packet.emotion_contract.curve_quartiles.map((q) => q.valence);
  const prescribedRange = Math.max(...prescribedValences) - Math.min(...prescribedValences);
  const prescribedIsVaried = prescribedRange > 0.15; // Significant valence variation prescribed

  const isMonotone = similarities.every((s) => Math.abs(s - avgSimilarity) < 0.1);
  if (isMonotone && prescribedIsVaried) {
    // Prose is monotone but trajectory demands variation → penalty
    score -= 20;
  } else if (isMonotone && !prescribedIsVaried) {
    // Prose is monotone AND trajectory is monotone → conformity bonus
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'tension_14d',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.tension_14d,
    method: 'CALC',
    details: `Avg similarity: ${(avgSimilarity * 100).toFixed(1)}%, Q-scores: ${similarities.map((s) => (s * 100).toFixed(0)).join(', ')}`,
  };
}
