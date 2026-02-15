/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — DELTA STYLE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: delta/delta-style.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Measures style compliance: Gini, sensory density, abstraction, signature.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, StyleDelta } from '../types.js';
import { SOVEREIGN_CONFIG } from '../config.js';
import sensoryLexicon from '../data/sensory-lexicon.json';

export function computeStyleDelta(packet: ForgePacket, prose: string): StyleDelta {
  const sentences = splitIntoSentences(prose);
  const wordLengths = sentences.map((s) => countWords(s));

  const gini_actual = computeGini(wordLengths);
  const gini_target = packet.style_genome.rhythm.gini_target;
  const gini_delta = Math.abs(gini_actual - gini_target);

  const totalWords = wordLengths.reduce((a, b) => a + b, 0);
  const sensoryCount = countSensoryMarkers(prose.toLowerCase());
  const sensory_density_actual = (sensoryCount / totalWords) * 100;
  const sensory_density_target = packet.style_genome.imagery.density_target_per_100_words;

  const abstractionRatio = estimateAbstractionRatio(prose);
  const abstraction_ratio_actual = abstractionRatio;
  const abstraction_ratio_target = packet.style_genome.lexicon.abstraction_max_ratio;

  const signatureHits = countSignatureWords(prose.toLowerCase(), packet.style_genome.lexicon.signature_words);
  const signature_hit_rate = packet.style_genome.lexicon.signature_words.length > 0
    ? signatureHits / packet.style_genome.lexicon.signature_words.length
    : 0;

  const monotony_sequences = detectMonotonySequences(wordLengths);
  const opening_repetition_rate = detectOpeningRepetition(sentences);

  return {
    gini_actual,
    gini_target,
    gini_delta,
    sensory_density_actual,
    sensory_density_target,
    abstraction_ratio_actual,
    abstraction_ratio_target,
    signature_hit_rate,
    monotony_sequences,
    opening_repetition_rate,
  };
}

function splitIntoSentences(prose: string): string[] {
  return prose.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function countWords(sentence: string): number {
  return sentence.split(/\s+/).filter((w) => w.length > 0).length;
}

function computeGini(lengths: number[]): number {
  if (lengths.length === 0) return 0;
  const n = lengths.length;
  const sorted = [...lengths].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sum += Math.abs(sorted[i] - sorted[j]);
    }
  }
  return sum / (2 * n * n * mean);
}

/** Strip diacritics for Unicode-safe matching: "lumière" → "lumiere", "brûlure" → "brulure" */
function normalizeForMatch(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function countSensoryMarkers(prose: string): number {
  // Build normalized token set from lexicon
  // Multi-word entries ("gorge serrée") are split into individual tokens
  const lexiconSet = new Set<string>();
  for (const category of Object.values(sensoryLexicon.categories)) {
    for (const subcategory of Object.values(category)) {
      if (Array.isArray(subcategory)) {
        for (const w of subcategory) {
          const normalized = normalizeForMatch(String(w));
          // Split multi-word entries into individual tokens
          for (const token of normalized.split(/[^a-z]+/)) {
            if (token.length > 1) lexiconSet.add(token);
          }
        }
      }
    }
  }

  // Tokenize prose with normalization
  const tokens = normalizeForMatch(prose).split(/[^a-z]+/).filter(t => t.length > 1);
  let count = 0;
  for (const token of tokens) {
    if (lexiconSet.has(token)) {
      count++;
    }
  }
  return count;
}

function estimateAbstractionRatio(prose: string): number {
  const abstractWords = ['pensée', 'idée', 'concept', 'notion', 'sentiment', 'émotion', 'thought', 'idea', 'concept', 'feeling', 'emotion'];
  const words = prose.toLowerCase().split(/\s+/);
  const abstractCount = words.filter((w) => abstractWords.some((aw) => w.includes(aw))).length;
  return words.length > 0 ? abstractCount / words.length : 0;
}

function countSignatureWords(prose: string, signatureWords: readonly string[]): number {
  const normalizedProse = normalizeForMatch(prose);
  const tokens = normalizedProse.split(/[^a-z]+/).filter(t => t.length > 1);
  const tokenSet = new Set(tokens);
  let count = 0;
  for (const word of signatureWords) {
    const normalized = normalizeForMatch(word);
    // Exact match or any prose token starts with the signature stem
    if (tokenSet.has(normalized) || tokens.some(t => t.startsWith(normalized) || normalized.startsWith(t))) {
      count++;
    }
  }
  return count;
}

function detectMonotonySequences(wordLengths: number[]): number {
  let sequences = 0;
  let currentStreak = 1;

  for (let i = 1; i < wordLengths.length; i++) {
    const prev = wordLengths[i - 1];
    const curr = wordLengths[i];
    const similar = Math.abs(curr - prev) / prev < SOVEREIGN_CONFIG.SIMILAR_LENGTH_TOLERANCE;

    if (similar) {
      currentStreak++;
      if (currentStreak === SOVEREIGN_CONFIG.MAX_CONSECUTIVE_SIMILAR) {
        sequences++;
      }
    } else {
      currentStreak = 1;
    }
  }

  return sequences;
}

function detectOpeningRepetition(sentences: string[]): number {
  if (sentences.length === 0) return 0;

  const firstWords = sentences.map((s) => {
    const words = s.trim().split(/\s+/);
    return words[0]?.toLowerCase() ?? '';
  }).filter((w) => w.length > 0);

  const wordCounts: Record<string, number> = {};
  for (const word of firstWords) {
    wordCounts[word] = (wordCounts[word] ?? 0) + 1;
  }

  const maxCount = Math.max(...Object.values(wordCounts));
  return maxCount / firstWords.length;
}
