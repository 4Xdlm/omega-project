/**
 * OMEGA V2.1 — Grid Search Calibration Framework
 *
 * Tests 125 combinations (w1, w2, w3) ∈ {0.1, 0.3, 0.5, 0.7, 0.9}³ on text corpus.
 * For each combination, measures avg cost score across all texts.
 * Returns sorted combinations (lower cost = better).
 *
 * REAL CALIBRATION : pass full corpus 1334 texts to gridSearch().
 * SMOKE TEST : generate synthetic texts via generateSyntheticCorpus().
 *
 * Architecte runs this script with real corpus to find optimal hyperparams.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Sprint V2.1 calibration framework 2026-05-26
 */

import type { Chunk, ChunkWeights } from '../types.js';
import { DEFAULT_ADAPTIVE_CONFIG } from '../types.js';
import { chunkAdaptive } from '../adaptive.js';

export const GRID_VALUES = [0.1, 0.3, 0.5, 0.7, 0.9] as const;

export interface GridSearchSample {
  readonly id: string;
  readonly text: string;
}

export interface GridSearchResult {
  readonly weights: ChunkWeights;
  readonly avg_cost: number;
  readonly avg_chunks: number;
  readonly avg_word_count: number;
  readonly samples_count: number;
  readonly errors_count: number;
}

export interface GridSearchProgress {
  readonly current: number;
  readonly total: number;
  readonly weights: ChunkWeights;
  readonly elapsed_ms: number;
}

/**
 * Generate all 125 weight combinations from grid values.
 */
export function generateGridCombinations(): ChunkWeights[] {
  const combos: ChunkWeights[] = [];
  for (const w1 of GRID_VALUES) {
    for (const w2 of GRID_VALUES) {
      for (const w3 of GRID_VALUES) {
        combos.push({
          arc_breakage: w1,
          length_variance: w2,
          discontinuity: w3,
        });
      }
    }
  }
  return combos;
}

/**
 * Run grid search across corpus samples.
 *
 * @param samples - Text samples (corpus)
 * @param target_size - Target words per chunk (default 750)
 * @param onProgress - Optional progress callback
 * @returns Sorted results (best first = lowest avg cost)
 */
export async function gridSearch(
  samples: readonly GridSearchSample[],
  target_size: number = DEFAULT_ADAPTIVE_CONFIG.target_size,
  onProgress?: (p: GridSearchProgress) => void
): Promise<GridSearchResult[]> {
  if (samples.length === 0) {
    throw new Error('gridSearch: samples must be non-empty');
  }

  const combos = generateGridCombinations();
  const results: GridSearchResult[] = [];
  const startTime = Date.now();

  for (let i = 0; i < combos.length; i++) {
    const weights = combos[i];
    if (!weights) continue;

    let totalCost = 0;
    let totalChunks = 0;
    let totalWords = 0;
    let errors = 0;
    let processed = 0;

    for (const sample of samples) {
      try {
        const chunks: readonly Chunk[] = chunkAdaptive(sample.text, {
          ...DEFAULT_ADAPTIVE_CONFIG,
          weights,
          target_size,
        });
        const avgChunkCost =
          chunks.reduce((sum, c) => sum + c.metadata.cost_score, 0) / Math.max(1, chunks.length);
        totalCost += avgChunkCost;
        totalChunks += chunks.length;
        totalWords += chunks.reduce((sum, c) => sum + c.metadata.word_count, 0);
        processed++;
      } catch {
        errors++;
      }
    }

    const valid = processed > 0 ? processed : 1;
    results.push({
      weights,
      avg_cost: totalCost / valid,
      avg_chunks: totalChunks / valid,
      avg_word_count: totalWords / valid,
      samples_count: processed,
      errors_count: errors,
    });

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: combos.length,
        weights,
        elapsed_ms: Date.now() - startTime,
      });
    }
  }

  // Sort by avg_cost ascending (lower = better)
  return results.sort((a, b) => a.avg_cost - b.avg_cost);
}

/**
 * Generate synthetic corpus for smoke-testing the framework.
 *
 * NOT production data — use real corpus 1334 livres for real calibration.
 * Generated texts have varied emotional content + length distribution.
 */
export function generateSyntheticCorpus(count: number, seed: number = 42): GridSearchSample[] {
  let state = seed;
  const rand = (): number => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };

  // Building blocks varying emotional tone
  const happyPhrases = [
    'La joie illuminait son visage et le bonheur rayonnait.',
    'Le sourire tendre et l\'amour étaient partout.',
    'La beauté du paysage émerveillait son regard.',
    'Une douceur paisible enveloppait le moment.',
  ];
  const sadPhrases = [
    'La tristesse pesait dans la pièce sombre.',
    'Les larmes coulaient sur ses joues blêmes.',
    'La douleur le traversait comme une lame froide.',
    'Le désespoir l\'envahissait sans répit.',
  ];
  const actionPhrases = [
    'Il bondit vivement et saisit l\'arme.',
    'La porte claqua violemment derrière lui.',
    'Le cri perça le silence assourdissant.',
    'Le poing serré, il avança résolument.',
  ];
  const descriptivePhrases = [
    'Le ciel bleu s\'étendait à l\'horizon.',
    'Les arbres murmuraient dans le vent léger.',
    'La maison blanche dominait la colline verte.',
    'Le chemin de pierres serpentait entre les fleurs.',
  ];

  const allPools = [happyPhrases, sadPhrases, actionPhrases, descriptivePhrases];
  const samples: GridSearchSample[] = [];

  for (let i = 0; i < count; i++) {
    const sentenceCount = 20 + Math.floor(rand() * 80); // 20-100 sentences
    const sentences: string[] = [];
    let currentPool = Math.floor(rand() * allPools.length);
    let arcLength = 5 + Math.floor(rand() * 10);

    for (let j = 0; j < sentenceCount; j++) {
      if (j > 0 && j % arcLength === 0) {
        currentPool = (currentPool + 1 + Math.floor(rand() * (allPools.length - 1))) % allPools.length;
        arcLength = 5 + Math.floor(rand() * 10);
      }
      const pool = allPools[currentPool];
      if (pool) {
        const phrase = pool[Math.floor(rand() * pool.length)];
        if (phrase) sentences.push(phrase);
      }
    }

    samples.push({
      id: `synth_${i}`,
      text: sentences.join(' '),
    });
  }

  return samples;
}

/**
 * Pretty-print grid search results (top N).
 */
export function formatGridResults(results: readonly GridSearchResult[], topN: number = 10): string {
  const lines: string[] = [];
  lines.push('=== OMEGA V2.1 Grid Search Results ===');
  lines.push(`Total combinations evaluated: ${results.length}`);
  lines.push(`Top ${Math.min(topN, results.length)} (lowest avg_cost):`);
  lines.push('');
  lines.push('Rank | w1 (arc) | w2 (len) | w3 (disc) | avg_cost | avg_chunks | errors');
  lines.push('-----|----------|----------|-----------|----------|------------|-------');

  for (let i = 0; i < Math.min(topN, results.length); i++) {
    const r = results[i];
    if (!r) continue;
    lines.push(
      `${(i + 1).toString().padStart(4)} | ` +
        `${r.weights.arc_breakage.toFixed(2).padStart(8)} | ` +
        `${r.weights.length_variance.toFixed(2).padStart(8)} | ` +
        `${r.weights.discontinuity.toFixed(2).padStart(9)} | ` +
        `${r.avg_cost.toFixed(4).padStart(8)} | ` +
        `${r.avg_chunks.toFixed(2).padStart(10)} | ` +
        `${r.errors_count.toString().padStart(6)}`
    );
  }

  return lines.join('\n');
}
