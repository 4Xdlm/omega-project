/**
 * OMEGA Style Emergence Engine -- Cadence Analyzer
 * Phase C.3 -- Sentence length distribution analysis
 *
 * MIGRATION 2026-07-30 : le découpage local (split `(?<=[.!?])\s+` + comptage de
 * tokens bruts) comptait « : » et « — » comme des mots et ratait des découpages
 * (phrase de 746 mots observée sur epub). Remplacé par le découpeur CANONIQUE
 * (@omega/phonetic-stack, dépendance déclarée) — import par chemin source,
 * pattern repo, le dist du paquet n'incluant pas encore ce module.
 */

import type { ProseParagraph } from '../types.js';
import type { CadenceProfile } from '../types.js';
import { sentenceLengthsFr } from '../../../omega-p0/src/phonetic/sentence-splitter-fr.js';

export function analyzeCadence(paragraphs: readonly ProseParagraph[]): CadenceProfile {
  const allSentenceLengths: number[] = [];

  for (const para of paragraphs) {
    allSentenceLengths.push(...sentenceLengthsFr(para.text));
  }

  if (allSentenceLengths.length === 0) {
    return {
      avg_sentence_length: 0,
      sentence_length_stddev: 0,
      coefficient_of_variation: 0,
      short_ratio: 0,
      long_ratio: 0,
      sentence_count: 0,
    };
  }

  const total = allSentenceLengths.reduce((a, b) => a + b, 0);
  const avg = total / allSentenceLengths.length;

  const variance = allSentenceLengths.reduce((acc, v) => acc + (v - avg) ** 2, 0) / allSentenceLengths.length;
  const stddev = Math.sqrt(variance);
  const cv = avg > 0 ? stddev / avg : 0;

  const shortCount = allSentenceLengths.filter((l) => l < 8).length;
  const longCount = allSentenceLengths.filter((l) => l > 25).length;

  return {
    avg_sentence_length: avg,
    sentence_length_stddev: stddev,
    coefficient_of_variation: cv,
    short_ratio: shortCount / allSentenceLengths.length,
    long_ratio: longCount / allSentenceLengths.length,
    sentence_count: allSentenceLengths.length,
  };
}
