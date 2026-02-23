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
// ═══════════════════════════════════════════════════════════════════════════════
// Sprint S2 — Offline Musical Polish (deterministic, 0 LLM) [INV-S-MUSICAL-01]
// ═══════════════════════════════════════════════════════════════════════════════

export interface CorrectionLogEntry {
  readonly sentence_index: number;
  readonly reason: string;
}

export interface MusicalPolishResult {
  readonly polished_prose: string;
  readonly corrections_applied: number; // max 1 [INV-S-MUSICAL-01]
  readonly correction_log: readonly CorrectionLogEntry[];
}

/**
 * OFFLINE deterministic musical polish.
 * Detects phrase too long (> 40 words) OR too short (< 3 words) → split/merge suggestion.
 * Max 1 correction per call [INV-S-MUSICAL-01].
 *
 * OFFLINE-HEURISTIC: No LLM involved.
 */
export function applyMusicalPolishOffline(
  prose: string,
  _packet: ForgePacket,
): MusicalPolishResult {
  const sentences = prose.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const wordCounts = sentences.map((s) => s.split(/\s+/).filter((w) => w.length > 0).length);

  const log: CorrectionLogEntry[] = [];
  let correctedProse = prose;

  // Find first problematic sentence (max 1 correction)
  for (let i = 0; i < wordCounts.length && log.length === 0; i++) {
    if (wordCounts[i] > 40) {
      // Too long — split at mid-point comma or semicolon
      const sentence = sentences[i];
      const midPoint = Math.floor(sentence.length / 2);
      const splitCandidates = [', ', '; ', ' — ', ' – '];
      let bestSplit = -1;
      let bestDist = Infinity;

      for (const delim of splitCandidates) {
        let idx = sentence.indexOf(delim, midPoint - 30);
        if (idx === -1) idx = sentence.lastIndexOf(delim, midPoint + 30);
        if (idx !== -1) {
          const dist = Math.abs(idx - midPoint);
          if (dist < bestDist) {
            bestDist = dist;
            bestSplit = idx;
          }
        }
      }

      if (bestSplit !== -1) {
        const splitDelim = sentence.substring(bestSplit, bestSplit + 2);
        const part1 = sentence.substring(0, bestSplit).trim() + '.';
        const part2 = sentence.substring(bestSplit + splitDelim.length).trim();
        correctedProse = correctedProse.replace(sentence, `${part1} ${part2}`);
        log.push({ sentence_index: i, reason: `too_long (${wordCounts[i]} words) — split` });
      }
    } else if (wordCounts[i] < 3 && i < wordCounts.length - 1 && wordCounts[i + 1] < 3) {
      // Two consecutive very short sentences — merge
      const merged = sentences[i].replace(/[.!?]$/, '') + ' ' + sentences[i + 1];
      correctedProse = correctedProse.replace(
        sentences[i] + /\s+/.source + sentences[i + 1],
        merged,
      );
      log.push({ sentence_index: i, reason: `too_short (${wordCounts[i]} words) — merge candidate` });
    }
  }

  return {
    polished_prose: correctedProse,
    corrections_applied: log.length,
    correction_log: log,
  };
}

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
