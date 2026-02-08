/**
 * OMEGA Forge — Necessity Metrics (M8 + M9)
 * Phase C.5 — Sentence necessity + semantic density
 */

import type { StyledParagraph, ScribeOutput } from '../types.js';

/**
 * M8: Sentence necessity (target >= 0.95)
 * Each sentence contributes unique information.
 * Measures ratio of non-redundant sentences.
 */
export function computeM8(
  paragraphs: readonly StyledParagraph[],
  _scribeOutput: ScribeOutput,
): number {
  if (paragraphs.length === 0) return 1;

  const allSentences: string[] = [];
  for (const p of paragraphs) {
    const sentences = p.text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    allSentences.push(...sentences.map((s: string) => s.trim().toLowerCase()));
  }

  if (allSentences.length === 0) return 1;

  const uniqueWords = new Set<string>();
  let necessarySentences = 0;

  for (const sentence of allSentences) {
    const words = sentence.split(/\s+/).filter((w) => w.length > 3);
    const newWords = words.filter((w) => !uniqueWords.has(w));

    if (newWords.length > 0) {
      necessarySentences++;
      for (const w of words) uniqueWords.add(w);
    }
  }

  return necessarySentences / allSentences.length;
}

/**
 * M9: Semantic density — ratio of content words to total words.
 * Higher = more information-dense.
 */
export function computeM9(paragraphs: readonly StyledParagraph[]): number {
  if (paragraphs.length === 0) return 0;

  const functionWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
    'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'only', 'same', 'than', 'too',
    'very', 'just', 'because', 'if', 'when', 'while', 'where', 'how',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'it', 'its', 'he', 'she', 'they', 'them', 'his', 'her', 'their',
    'my', 'your', 'our', 'me', 'him', 'us', 'you', 'i',
  ]);

  let totalWords = 0;
  let contentWords = 0;

  for (const p of paragraphs) {
    const words = p.text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 0);
    totalWords += words.length;
    for (const w of words) {
      const cleaned = w.replace(/[^a-z]/g, '');
      if (cleaned.length > 0 && !functionWords.has(cleaned)) {
        contentWords++;
      }
    }
  }

  return totalWords > 0 ? contentWords / totalWords : 0;
}
