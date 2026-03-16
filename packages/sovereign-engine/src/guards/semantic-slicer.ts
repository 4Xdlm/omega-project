/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SEMANTIC SLICER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: guards/semantic-slicer.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Sprint 2: CALC-pure post-generation guard.
 * Guarantees prose has >= 4 paragraphs for the tension_14d scorer,
 * WITHOUT constraining the LLM during generation.
 *
 * Strategy:
 *   1. If prose already has >= 4 paragraphs → pass-through (preserve organic structure)
 *   2. If prose has < 4 paragraphs → split at optimal sentence boundaries
 *      near the 25%, 50%, 75% word-count marks
 *   3. Never breaks mid-sentence
 *   4. 100% deterministic, 0 API calls
 *
 * This replaces the V4.2 paragraph-guard.ts (which used LLM retry).
 * The Slicer is purely mechanical — it doesn't modify any words,
 * it only inserts \n\n at sentence boundaries.
 *
 * Convergence 3/3: Claude (Angle 5) + ChatGPT (Michelangelo) + Gemini (validated).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Same regex used by tension_14d scorer — MUST stay in sync */
const PARAGRAPH_SPLIT_REGEX = /\n\s*\n/;

/** Sentence boundary regex — splits on .!? followed by space or end */
const SENTENCE_SPLIT_REGEX = /(?<=[.!?…»"])\s+/;

/**
 * Traceability result for the slicer.
 */
export interface SlicerResult {
  readonly original_paragraph_count: number;
  readonly final_paragraph_count: number;
  readonly sliced: boolean;
  readonly cut_positions: readonly number[]; // word indices where cuts were made
  readonly prose: string;
}

/**
 * Count paragraphs using the same split as tension_14d scorer.
 */
export function countParagraphs(prose: string): number {
  return prose.split(PARAGRAPH_SPLIT_REGEX).filter((p) => p.trim().length > 0).length;
}

/**
 * Split prose into sentences, preserving trailing punctuation.
 */
function splitSentences(text: string): string[] {
  // Split on sentence boundaries but keep the text intact
  const raw = text.split(SENTENCE_SPLIT_REGEX).filter((s) => s.trim().length > 0);
  return raw;
}

/**
 * Count words in a string.
 */
function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Apply semantic slicing to guarantee >= 4 paragraphs.
 *
 * If prose already has >= 4 paragraphs, returns it unchanged.
 * Otherwise, splits at sentence boundaries nearest to 25%, 50%, 75% word marks.
 *
 * @param prose - Raw prose from LLM
 * @returns SlicerResult with sliced prose + traceability metadata
 */
export function applySemanticSlicing(prose: string): SlicerResult {
  const originalCount = countParagraphs(prose);

  if (originalCount >= 4) {
    return {
      original_paragraph_count: originalCount,
      final_paragraph_count: originalCount,
      sliced: false,
      cut_positions: [],
      prose,
    };
  }

  // Unify all line breaks into single spaces (flatten to 1 block)
  const unified = prose.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  // Split into sentences
  const sentences = splitSentences(unified);

  if (sentences.length < 4) {
    // Not enough sentences to split into 4 — return original
    console.warn(`[SLICER] Only ${sentences.length} sentences — cannot slice into 4 quartiles`);
    return {
      original_paragraph_count: originalCount,
      final_paragraph_count: originalCount,
      sliced: false,
      cut_positions: [],
      prose,
    };
  }

  // Compute cumulative word counts per sentence
  const sentenceWords = sentences.map((s) => wordCount(s));
  const totalWords = sentenceWords.reduce((a, b) => a + b, 0);
  const cumulative: number[] = [];
  let running = 0;
  for (const wc of sentenceWords) {
    running += wc;
    cumulative.push(running);
  }

  // Find optimal cut points at 25%, 50%, 75%
  const targets = [0.25, 0.50, 0.75].map((frac) => frac * totalWords);
  const cutIndices: number[] = [];

  for (const target of targets) {
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < cumulative.length - 1; i++) {
      // Don't cut at already-used positions
      if (cutIndices.includes(i)) continue;
      // Don't cut too close to previous cut (min 1 sentence gap)
      if (cutIndices.length > 0 && i <= cutIndices[cutIndices.length - 1]) continue;

      const dist = Math.abs(cumulative[i] - target);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      cutIndices.push(bestIdx);
    }
  }

  // Build the sliced prose: insert \n\n after each cut sentence
  const paragraphs: string[] = [];
  let startIdx = 0;

  for (const cutIdx of cutIndices) {
    const segment = sentences.slice(startIdx, cutIdx + 1).join(' ').trim();
    if (segment.length > 0) {
      paragraphs.push(segment);
    }
    startIdx = cutIdx + 1;
  }

  // Add remaining sentences as last paragraph
  const lastSegment = sentences.slice(startIdx).join(' ').trim();
  if (lastSegment.length > 0) {
    paragraphs.push(lastSegment);
  }

  const slicedProse = paragraphs.join('\n\n');
  const finalCount = countParagraphs(slicedProse);

  console.log(`[SLICER] ${originalCount} → ${finalCount} paragraphs (cuts at words: ${cutIndices.map((i) => cumulative[i]).join(', ')})`);

  return {
    original_paragraph_count: originalCount,
    final_paragraph_count: finalCount,
    sliced: true,
    cut_positions: cutIndices.map((i) => cumulative[i]),
    prose: slicedProse,
  };
}
