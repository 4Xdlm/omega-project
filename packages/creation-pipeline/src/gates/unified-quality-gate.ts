/**
 * OMEGA Creation Pipeline — Unified Quality Gate
 * Phase C.4 — Information density, clarity, precision
 */

import type {
  StyledOutput, GenesisPlan, IntentPack, C4Config,
  UnifiedGateResult, UnifiedGateViolation,
} from '../types.js';

export function runUnifiedQualityGate(
  styleOutput: StyledOutput,
  _plan: GenesisPlan,
  _input: IntentPack,
  _config: C4Config,
  timestamp: string,
): UnifiedGateResult {
  const violations: UnifiedGateViolation[] = [];

  // 1. Information density: unique words / total words
  const allText = styleOutput.paragraphs.map((p: { text: string }) => p.text).join(' ');
  const words = allText.split(/\s+/).filter((w: string) => w.length > 0);
  const uniqueWords = new Set(words.map((w: string) => w.toLowerCase()));
  const density = words.length > 0 ? uniqueWords.size / words.length : 0;

  const MIN_DENSITY = 0.15;
  if (density < MIN_DENSITY) {
    violations.push({
      gate_id: 'U_QUALITY',
      invariant: 'C4-INV-06',
      location: 'density',
      message: `Information density ${density.toFixed(3)} below minimum ${MIN_DENSITY}`,
      severity: 'ERROR',
      source_phase: 'C4',
    });
  }

  // 2. Clarity: avg sentence length should not exceed 35 words
  const MAX_AVG_SENTENCE = 35;
  let totalSentences = 0;
  let totalWords = 0;
  for (const para of styleOutput.paragraphs) {
    const sentences = para.text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    totalSentences += sentences.length;
    totalWords += para.word_count;
  }
  const avgSentenceLength = totalSentences > 0 ? totalWords / totalSentences : 0;

  if (avgSentenceLength > MAX_AVG_SENTENCE) {
    violations.push({
      gate_id: 'U_QUALITY',
      invariant: 'C4-INV-06',
      location: 'clarity',
      message: `Avg sentence length ${avgSentenceLength.toFixed(1)} exceeds max ${MAX_AVG_SENTENCE}`,
      severity: 'ERROR',
      source_phase: 'C4',
    });
  }

  // 3. Precision: paragraphs must have non-trivial content
  const MIN_WORDS_PER_PARAGRAPH = 5;
  let emptyParagraphs = 0;
  for (const para of styleOutput.paragraphs) {
    if (para.word_count < MIN_WORDS_PER_PARAGRAPH) {
      emptyParagraphs++;
    }
  }
  if (emptyParagraphs > 0) {
    violations.push({
      gate_id: 'U_QUALITY',
      invariant: 'C4-INV-06',
      location: 'precision',
      message: `${emptyParagraphs} paragraph(s) have fewer than ${MIN_WORDS_PER_PARAGRAPH} words`,
      severity: 'ERROR',
      source_phase: 'C4',
    });
  }

  return {
    gate_id: 'U_QUALITY',
    verdict: violations.length === 0 ? 'PASS' : 'FAIL',
    violations,
    metrics: {
      information_density: density,
      avg_sentence_length: avgSentenceLength,
      empty_paragraphs: emptyParagraphs,
      total_words: words.length,
      unique_words: uniqueWords.size,
    },
    timestamp_deterministic: timestamp,
  };
}
