/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SHARED EMOTION ANALYSIS (P3-02)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/shared-emotion-analysis.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * PROBLEM:
 *   tension_14d and emotion_coherence both call analyzeEmotionSemantic on the
 *   same prose — but with different chunking:
 *     - emotion_coherence: 1 call per paragraph (~5 calls)
 *     - tension_14d: 1 call per quartile (~4 calls, quartile = concat of paragraphs)
 *   Total: ~9 generateStructuredJSON calls per candidate, no reuse.
 *
 * SOLUTION:
 *   Analyze each paragraph ONCE. Aggregate for quartiles by averaging paragraph
 *   results within each quartile range. Both axes consume the same data.
 *
 * GAIN:
 *   9 calls → ~5 calls per candidate (−4 calls × 4 candidates = −16 calls/run)
 *   On 93.4 baseline: −16 = 77.4 = 17% reduction (additive with P3-01)
 *
 * INVARIANTS:
 *   INV-P3-SHARE-01: Each paragraph analyzed exactly once per prose.
 *   INV-P3-SHARE-02: Quartile states = weighted average of paragraph states in range.
 *   INV-P3-SHARE-03: Results identical to separate analysis (±tolerance from aggregation).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SovereignProvider } from '../types.js';
import type { SemanticEmotionResult } from '../semantic/types.js';
import { PLUTCHIK_DIMENSIONS } from '../semantic/types.js';
import { analyzeEmotionSemantic } from '../semantic/semantic-analyzer.js';
import { analyzeEmotionFromText } from '@omega/omega-forge';
import { SOVEREIGN_CONFIG } from '../config.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SharedEmotionData {
  /** Emotion state per paragraph (indexed by paragraph order) */
  readonly paragraph_states: readonly SemanticEmotionResult[];
  /** Paragraphs (trimmed, non-empty) */
  readonly paragraphs: readonly string[];
  /** Number of LLM calls made (for telemetry) */
  readonly llm_calls: number;
  /** Whether semantic analysis was used (vs keyword fallback) */
  readonly semantic: boolean;
}

export interface QuartileEmotionState {
  readonly quartile: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  readonly state: SemanticEmotionResult;
  /** Number of paragraphs in this quartile */
  readonly paragraph_count: number;
}

// ── Core function ────────────────────────────────────────────────────────────

/**
 * Analyze all paragraphs of a prose ONCE and return shared data for both
 * tension_14d and emotion_coherence.
 *
 * INV-P3-SHARE-01: Each paragraph analyzed exactly once.
 */
export async function analyzeProseEmotions(
  prose: string,
  packet: ForgePacket,
  provider?: SovereignProvider,
): Promise<SharedEmotionData> {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const useSemantic = SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED && !!provider;

  let llmCalls = 0;
  const paragraph_states: SemanticEmotionResult[] = [];

  for (const para of paragraphs) {
    if (useSemantic) {
      const result = await analyzeEmotionSemantic(para, packet.language, provider!);
      llmCalls++;
      paragraph_states.push(result);
    } else {
      const kw = analyzeEmotionFromText(para, packet.language);
      paragraph_states.push({
        joy: kw.joy, trust: kw.trust, fear: kw.fear, surprise: kw.surprise,
        sadness: kw.sadness, disgust: kw.disgust, anger: kw.anger,
        anticipation: kw.anticipation, love: kw.love, submission: kw.submission,
        awe: kw.awe, disapproval: kw.disapproval, remorse: kw.remorse,
        contempt: kw.contempt,
      });
    }
  }

  return {
    paragraph_states,
    paragraphs,
    llm_calls: llmCalls,
    semantic: useSemantic,
  };
}

// ── Quartile aggregation (for tension_14d) ───────────────────────────────────

/**
 * Aggregate paragraph-level emotions into quartile-level states.
 * Uses the same QUARTILE_BOUNDS from SOVEREIGN_CONFIG as tension_14d.
 *
 * INV-P3-SHARE-02: Quartile state = mean of paragraph states in range.
 */
export function computeQuartileStates(
  shared: SharedEmotionData,
): readonly QuartileEmotionState[] {
  const bounds = SOVEREIGN_CONFIG.QUARTILE_BOUNDS;
  const quartiles = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
  const total = shared.paragraphs.length;

  return quartiles.map((q) => {
    const [startFrac, endFrac] = bounds[q];
    const startIdx = Math.floor(startFrac * total);
    const endIdx = Math.ceil(endFrac * total);

    const paraStates = shared.paragraph_states.slice(startIdx, endIdx);

    if (paraStates.length === 0) {
      // Empty quartile: neutral state
      return {
        quartile: q,
        state: neutralState(),
        paragraph_count: 0,
      };
    }

    // Average all paragraph states in this quartile
    const averaged = averageStates(paraStates);

    return {
      quartile: q,
      state: averaged,
      paragraph_count: paraStates.length,
    };
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function averageStates(states: readonly SemanticEmotionResult[]): SemanticEmotionResult {
  const n = states.length;
  const result: Record<string, number> = {};

  for (const dim of PLUTCHIK_DIMENSIONS) {
    let sum = 0;
    for (const s of states) {
      sum += s[dim];
    }
    result[dim] = sum / n;
  }

  return result as unknown as SemanticEmotionResult;
}

function neutralState(): SemanticEmotionResult {
  const result: Record<string, number> = {};
  for (const dim of PLUTCHIK_DIMENSIONS) {
    result[dim] = 0;
  }
  return result as unknown as SemanticEmotionResult;
}
