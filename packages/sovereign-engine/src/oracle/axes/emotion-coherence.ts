/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AXE 9: EMOTION COHERENCE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/axes/emotion-coherence.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Weight ×2.5
 * Measures smoothness of emotional transitions between paragraphs.
 * Detects brutal jumps (distance >2.0 in 14D space).
 * 100% CALC — 0 token — fully deterministic.
 *
 * SCORING (max 100):
 * - 0 brutal jumps → 100
 * - 1 brutal jump → 70
 * - 2 brutal jumps → 50
 * - 3+ brutal jumps → 0
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  analyzeEmotionFromText,
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

export async function scoreEmotionCoherence(
  packet: ForgePacket,
  prose: string,
  provider?: SovereignProvider,
): Promise<AxisScore> {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  if (paragraphs.length < 2) {
    return {
      name: 'emotion_coherence',
      score: 100,
      weight: SOVEREIGN_CONFIG.WEIGHTS.emotion_coherence,
      method: 'CALC',
      details: 'Single paragraph, no transitions to measure',
    };
  }

  const states = await Promise.all(
    paragraphs.map((p) => analyzeEmotion(p, packet.language, provider)),
  );

  const distances: number[] = [];
  for (let i = 0; i < states.length - 1; i++) {
    const dist = euclideanDistance14D(states[i], states[i + 1]);
    distances.push(dist);
  }

  const brutalJumps = distances.filter((d) => d > SOVEREIGN_CONFIG.MAX_PARAGRAPH_DISTANCE).length;

  let score: number;
  if (brutalJumps === 0) {
    score = 100;
  } else if (brutalJumps === 1) {
    score = 70;
  } else if (brutalJumps === 2) {
    score = 50;
  } else {
    score = 0;
  }

  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  const maxDistance = Math.max(...distances);

  const details = `Brutal jumps: ${brutalJumps}/${distances.length}, avg dist: ${avgDistance.toFixed(2)}, max dist: ${maxDistance.toFixed(2)}`;

  return {
    name: 'emotion_coherence',
    score,
    weight: SOVEREIGN_CONFIG.WEIGHTS.emotion_coherence,
    method: 'CALC',
    details,
  };
}
