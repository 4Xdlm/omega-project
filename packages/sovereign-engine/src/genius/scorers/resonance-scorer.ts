/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA GENIUS ENGINE — RESONANCE SCORER (R)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: genius/scorers/resonance-scorer.ts
 * Sprint: GENIUS-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * R = w1*motif_echo + w2*thematic_depth + w3*symbol_density
 *
 * Measures internal echoes and thematic cohesion:
 * - motif_echo: recurring phrases/images with variation
 * - thematic_depth: semantic field coherence across text
 * - symbol_density: presence and recurrence of symbolic elements
 *
 * ANTI-DOUBLON: R is self-contained, no external symbol-class creation (LINT-G05).
 * May consume symbolMapOutputs from input if provided.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { tokenize, semanticSimilarity } from '../embeddings/local-embedding-model.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SymbolMapOutput {
  readonly symbol: string;
  readonly occurrences: number;
  readonly positions: readonly number[]; // 0-1 relative positions
}

export interface ResonanceResult {
  readonly R: number;
  readonly motif_echo: number;
  readonly thematic_depth: number;
  readonly symbol_density: number;
  readonly diagnostics: {
    readonly motifs_found: number;
    readonly motif_variations: number;
    readonly thematic_clusters: number;
    readonly symbols_detected: number;
    readonly symbol_recurrence_rate: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const WEIGHTS = {
  motif_echo: 0.40,
  thematic_depth: 0.30,
  symbol_density: 0.30,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SENTENCE SPLITTING
// ═══════════════════════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIF ECHO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect recurring significant phrases (2-3 word n-grams) that appear
 * at different positions with variation.
 */
function computeMotifEcho(sentences: string[]): { score: number; motifs: number; variations: number } {
  if (sentences.length < 4) return { score: 30, motifs: 0, variations: 0 };

  // Extract 2-grams and 3-grams from each sentence
  const ngramsByPosition = new Map<string, number[]>(); // ngram → [sentence indices]

  for (let i = 0; i < sentences.length; i++) {
    const tokens = tokenize(sentences[i]);
    // 2-grams
    for (let j = 0; j < tokens.length - 1; j++) {
      const ngram = `${tokens[j]} ${tokens[j + 1]}`;
      if (!ngramsByPosition.has(ngram)) ngramsByPosition.set(ngram, []);
      ngramsByPosition.get(ngram)!.push(i);
    }
    // 3-grams
    for (let j = 0; j < tokens.length - 2; j++) {
      const ngram = `${tokens[j]} ${tokens[j + 1]} ${tokens[j + 2]}`;
      if (!ngramsByPosition.has(ngram)) ngramsByPosition.set(ngram, []);
      ngramsByPosition.get(ngram)!.push(i);
    }
  }

  // Motifs: n-grams appearing 2+ times at different positions
  let motifCount = 0;
  let variationCount = 0;

  for (const [_ngram, positions] of ngramsByPosition) {
    if (positions.length >= 2) {
      // Check that occurrences are spread (not consecutive)
      const spread = positions[positions.length - 1] - positions[0];
      if (spread >= 2) {
        motifCount++;
        // Check for variation: context around the motif differs
        const firstContext = sentences[positions[0]];
        const lastContext = sentences[positions[positions.length - 1]];
        const sim = semanticSimilarity(firstContext, lastContext);
        if (sim < 0.85) { // different enough = variation
          variationCount++;
        }
      }
    }
  }

  // Score: motifs with variation are worth more
  if (motifCount === 0) return { score: 20, motifs: 0, variations: 0 };

  const motifDensity = Math.min(1, motifCount / (sentences.length * 0.3));
  const variationRatio = variationCount / motifCount;
  const score = (motifDensity * 60 + variationRatio * 40);

  return {
    score: Math.min(100, Math.max(0, score)),
    motifs: motifCount,
    variations: variationCount,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEMATIC DEPTH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Measure thematic coherence: how well different parts of the text
 * relate to each other thematically (not repetition but cohesion).
 */
function computeThematicDepth(sentences: string[]): { score: number; clusters: number } {
  if (sentences.length < 3) return { score: 50, clusters: 1 };

  // Split into quartiles
  const qSize = Math.max(1, Math.floor(sentences.length / 4));
  const quartiles = [
    sentences.slice(0, qSize).join(' '),
    sentences.slice(qSize, qSize * 2).join(' '),
    sentences.slice(qSize * 2, qSize * 3).join(' '),
    sentences.slice(qSize * 3).join(' '),
  ].filter(q => q.trim().length > 0);

  if (quartiles.length < 2) return { score: 50, clusters: 1 };

  // Cross-quartile similarity: should be moderate (cohesive but not repetitive)
  let totalSim = 0;
  let pairCount = 0;

  for (let i = 0; i < quartiles.length; i++) {
    for (let j = i + 1; j < quartiles.length; j++) {
      totalSim += semanticSimilarity(quartiles[i], quartiles[j]);
      pairCount++;
    }
  }

  const avgSim = pairCount > 0 ? totalSim / pairCount : 0;

  // Ideal: 0.25-0.55 similarity (cohesive but not repetitive)
  // Too low = fragmented, too high = repetitive
  let score: number;
  if (avgSim < 0.15) {
    score = avgSim / 0.15 * 40; // fragmented
  } else if (avgSim <= 0.55) {
    score = 60 + ((avgSim - 0.15) / 0.40) * 40; // sweet spot
  } else {
    score = 100 - (avgSim - 0.55) / 0.45 * 60; // too repetitive
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    clusters: quartiles.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL DENSITY
// ═══════════════════════════════════════════════════════════════════════════════

// Common symbolic elements in French literature
const SYMBOL_PATTERNS = [
  // Nature symbols
  /\b(lune|soleil|étoile|ombre|lumière|nuit|aube|crépuscule)\b/i,
  /\b(mer|océan|fleuve|rivière|pluie|tempête|vent|orage)\b/i,
  /\b(arbre|forêt|racine|fleur|graine|feuille)\b/i,
  // Body/death symbols
  /\b(sang|os|cendres?|poussière|tombeau?|mort|fantôme)\b/i,
  // Object symbols
  /\b(miroir|porte|clé|mur|fenêtre|seuil|pont|chemin)\b/i,
  // Abstract symbols
  /\b(feu|glace|pierre|eau|terre|ciel)\b/i,
  // Animal symbols
  /\b(corbeau|loup|serpent|oiseau|papillon|araignée)\b/i,
];

function computeSymbolDensity(
  text: string,
  sentences: string[],
  symbolMaps?: readonly SymbolMapOutput[],
): { score: number; detected: number; recurrenceRate: number } {

  // If external symbol maps provided, use them
  if (symbolMaps && symbolMaps.length > 0) {
    const recurring = symbolMaps.filter(s => s.occurrences >= 2);
    const recurrenceRate = recurring.length / symbolMaps.length;
    const density = symbolMaps.length / Math.max(1, sentences.length) * 10;
    const score = Math.min(100, (density * 50 + recurrenceRate * 50));
    return { score, detected: symbolMaps.length, recurrenceRate };
  }

  // Otherwise, detect from text
  const symbolMatches = new Map<string, number>();

  for (const sentence of sentences) {
    for (const pattern of SYMBOL_PATTERNS) {
      const match = sentence.match(pattern);
      if (match) {
        const key = match[1].toLowerCase();
        symbolMatches.set(key, (symbolMatches.get(key) ?? 0) + 1);
      }
    }
  }

  const detected = symbolMatches.size;
  if (detected === 0) return { score: 15, detected: 0, recurrenceRate: 0 };

  // Recurrence: symbols appearing 2+ times
  let recurring = 0;
  for (const count of symbolMatches.values()) {
    if (count >= 2) recurring++;
  }

  const recurrenceRate = recurring / detected;
  const density = detected / Math.max(1, sentences.length);

  // Score: combination of variety and recurrence
  const varietyScore = Math.min(1, detected / 5) * 50;
  const recurrenceScore = recurrenceRate * 50;

  return {
    score: Math.min(100, Math.max(0, varietyScore + recurrenceScore)),
    detected,
    recurrenceRate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCORER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Resonance score R ∈ [0, 100].
 * Self-contained motif analysis, no external symbol-class instantiation (LINT-G05).
 */
export function computeResonance(
  text: string,
  symbolMaps?: readonly SymbolMapOutput[],
): ResonanceResult {
  if (!text || text.trim().length === 0) {
    return {
      R: 0, motif_echo: 0, thematic_depth: 0, symbol_density: 0,
      diagnostics: { motifs_found: 0, motif_variations: 0, thematic_clusters: 0,
        symbols_detected: 0, symbol_recurrence_rate: 0 },
    };
  }

  const sentences = splitSentences(text);
  const motif = computeMotifEcho(sentences);
  const thematic = computeThematicDepth(sentences);
  const symbol = computeSymbolDensity(text, sentences, symbolMaps);

  const raw = WEIGHTS.motif_echo * motif.score
            + WEIGHTS.thematic_depth * thematic.score
            + WEIGHTS.symbol_density * symbol.score;

  const R = Math.max(0, Math.min(100, raw));

  return {
    R,
    motif_echo: motif.score,
    thematic_depth: thematic.score,
    symbol_density: symbol.score,
    diagnostics: {
      motifs_found: motif.motifs,
      motif_variations: motif.variations,
      thematic_clusters: thematic.clusters,
      symbols_detected: symbol.detected,
      symbol_recurrence_rate: symbol.recurrenceRate,
    },
  };
}
