/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — MUSICAL ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: polish/musical-engine.ts
 * Version: 2.0.0 (Sprint 10 Commit 10.6)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-POL-04
 *
 * Final rhythm polish: analyze + micro-corrections via surgeonPass().
 * Detects monotony (3+ consecutive sentences of similar length).
 * Applies bounded corrections with reScoreGuard validation.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider } from '../types.js';
import { computeStyleDelta } from '../delta/delta-style.js';
import { surgeonPass, DEFAULT_SURGEON_CONFIG } from './sentence-surgeon.js';
import { judgeAestheticV3 } from '../oracle/aesthetic-oracle.js';

/**
 * Polish prose rhythm by detecting and correcting monotony.
 * ART-POL-04: Corrections validated via reScoreGuard.
 *
 * @param packet - Forge packet with constraints
 * @param prose - Input prose to polish
 * @param provider - SovereignProvider for LLM operations
 * @returns Polished prose (or original if no corrections accepted)
 *
 * @remarks
 * Algorithm:
 * 1. Detect monotony: 3+ consecutive sentences of similar length (±10%)
 * 2. If monotony detected → call surgeonPass() with reason='rhythm'
 * 3. surgeonPass() uses reScoreGuard internally → no regression possible
 * 4. Return modified prose (or original if no corrections accepted)
 */
export async function polishRhythm(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<string> {
  const styleDelta = computeStyleDelta(packet, prose);

  // If no monotony detected, return prose unchanged
  if (styleDelta.monotony_sequences === 0) {
    return prose;
  }

  // Split into sentences for analysis
  const sentences = prose.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  // Detect monotonous sequences (3+ consecutive sentences of similar length ±10%)
  const monotonousIndices = detectMonotony(sentences);

  if (monotonousIndices.length === 0) {
    return prose;
  }

  // Create scorer for surgeonPass
  const scorer = async (p: string): Promise<number> => {
    const result = await judgeAestheticV3(packet, p, provider, {}, null);
    return result.composite;
  };

  // Apply surgeonPass to correct monotony
  const config = {
    ...DEFAULT_SURGEON_CONFIG,
    max_corrections_per_pass: 5, // Limit corrections
    min_improvement: 2.0,
  };

  const result = await surgeonPass(prose, packet, provider, scorer, config);

  return result.prose_after;
}

/**
 * Detect monotonous sentence sequences.
 * Returns indices of sentences that are part of monotonous sequences.
 *
 * @param sentences - Array of sentences
 * @returns Array of sentence indices that need variation
 */
function detectMonotony(sentences: string[]): number[] {
  const indices: number[] = [];

  for (let i = 0; i < sentences.length - 2; i++) {
    const len1 = sentences[i].length;
    const len2 = sentences[i + 1].length;
    const len3 = sentences[i + 2].length;

    // Check if 3 consecutive sentences have similar length (±10%)
    const threshold = 0.1;
    const min = Math.min(len1, len2, len3);
    const max = Math.max(len1, len2, len3);

    if (max - min <= min * threshold) {
      // Monotony detected: add all 3 indices
      if (!indices.includes(i)) indices.push(i);
      if (!indices.includes(i + 1)) indices.push(i + 1);
      if (!indices.includes(i + 2)) indices.push(i + 2);
    }
  }

  return indices;
}
