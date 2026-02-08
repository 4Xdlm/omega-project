/**
 * OMEGA Scribe Engine -- Quality Gate
 * Density >= 0.7, no long sentences without punctuation, no vague words
 */

import type { ProseDoc, GateResult, GateViolation, SConfig } from '../types.js';

const VAGUE_WORDS = ['thing', 'stuff', 'something', 'somehow', 'somewhere', 'kind of', 'sort of'];

function computeInformationDensity(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 1;

  // Information density: ratio of content words to total words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'and', 'but', 'or', 'not', 'no',
    'if', 'then', 'than', 'that', 'this', 'it', 'its',
  ]);

  let contentWords = 0;
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.length > 0 && !stopWords.has(lower)) {
      contentWords++;
    }
  }

  return words.length > 0 ? contentWords / words.length : 1;
}

function findLongSentences(text: string, maxWords: number): readonly { sentence: string; wordCount: number }[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const long: { sentence: string; wordCount: number }[] = [];

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter((w) => w.length > 0);
    // Check if sentence has intermediate punctuation (commas, semicolons, dashes)
    const hasIntermediatePunct = /[,;:\u2014\u2013-]/.test(sentence);
    if (words.length > maxWords && !hasIntermediatePunct) {
      long.push({ sentence: sentence.trim(), wordCount: words.length });
    }
  }

  return long;
}

function findVagueWords(text: string): readonly string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const vague of VAGUE_WORDS) {
    if (lower.includes(vague)) {
      found.push(vague);
    }
  }
  return found;
}

export function runQualityGate(
  prose: ProseDoc,
  config: SConfig,
  timestamp: string,
): GateResult {
  const violations: GateViolation[] = [];
  const minDensity = config.QUALITY_MIN_DENSITY.value as number;

  let totalDensity = 0;
  let paraCount = 0;

  for (const para of prose.paragraphs) {
    // Check density
    const density = computeInformationDensity(para.text);
    totalDensity += density;
    paraCount++;

    if (density < minDensity) {
      violations.push({
        gate_id: 'QUALITY_GATE',
        invariant: 'S-INV-04' as 'S-INV-04',
        paragraph_id: para.paragraph_id,
        message: `Information density ${density.toFixed(3)} below minimum ${minDensity}`,
        severity: 'ERROR',
        details: `text: "${para.text.slice(0, 80)}..."`,
      });
    }

    // Check long sentences
    const longSents = findLongSentences(para.text, 50);
    for (const ls of longSents) {
      violations.push({
        gate_id: 'QUALITY_GATE',
        invariant: 'S-INV-04' as 'S-INV-04',
        paragraph_id: para.paragraph_id,
        message: `Sentence exceeds 50 words without intermediate punctuation (${ls.wordCount} words)`,
        severity: 'ERROR',
        details: `sentence: "${ls.sentence.slice(0, 80)}..."`,
      });
    }

    // Check vague words
    const vague = findVagueWords(para.text);
    for (const v of vague) {
      violations.push({
        gate_id: 'QUALITY_GATE',
        invariant: 'S-INV-04' as 'S-INV-04',
        paragraph_id: para.paragraph_id,
        message: `Vague word found: "${v}"`,
        severity: 'ERROR',
        details: `Vague language degrades quality`,
      });
    }
  }

  const avgDensity = paraCount > 0 ? totalDensity / paraCount : 1;
  const verdict = violations.length === 0 ? 'PASS' : 'FAIL';

  return {
    gate_id: 'QUALITY_GATE',
    verdict,
    violations,
    metrics: {
      avg_density: avgDensity,
      min_density_threshold: minDensity,
      total_paragraphs: paraCount,
      vague_word_violations: violations.filter((v) => v.message.startsWith('Vague')).length,
      long_sentence_violations: violations.filter((v) => v.message.startsWith('Sentence')).length,
    },
    timestamp_deterministic: timestamp,
  };
}
