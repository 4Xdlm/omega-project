/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — BENCHMARK PROTOCOL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: benchmark/protocol.ts
 * Sprint: 17.2
 * Invariant: ART-BENCH-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Blind evaluation protocol:
 * - Same grid for OMEGA and human texts
 * - Anonymized (no source revealed)
 * - Random order
 * - 5 evaluation axes matching OMEGA's scoring system
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { BenchmarkSample } from './corpus.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evaluation grid: 5 axes scored 1-10 by human reader.
 * Maps directly to OMEGA macro-axes for correlation analysis.
 */
export interface HumanEvaluation {
  readonly sample_id: string;
  readonly evaluator_id: string;
  readonly timestamp: string;

  // 5 axes (1-10 scale)
  readonly emotion_impact: number;         // Maps to ECC
  readonly rhythm_musicality: number;      // Maps to RCI
  readonly sensory_immersion: number;      // Maps to IFI
  readonly originality: number;            // Maps to SII
  readonly authenticity: number;           // Maps to AAI (anti-IA)

  // Global
  readonly overall_quality: number;        // 1-10 global impression
  readonly would_read_more: boolean;       // Binary engagement signal
  readonly free_comment?: string;          // Optional qualitative feedback
}

/**
 * Anonymized sample for blind evaluation.
 * Source (omega/human) is hidden.
 */
export interface BlindSample {
  readonly blind_id: string;     // Anonymous ID: "SAMPLE-001" to "SAMPLE-020"
  readonly prose: string;
  readonly genre: string;
  readonly word_count: number;
  // NO source field — blind evaluation
}

/**
 * Mapping from blind IDs back to original sample IDs.
 * Revealed AFTER evaluation is complete.
 */
export interface BlindMapping {
  readonly blind_id: string;
  readonly original_id: string;
  readonly source: 'omega' | 'human';
}

/**
 * Complete benchmark session.
 */
export interface BenchmarkSession {
  readonly session_id: string;
  readonly date: string;
  readonly samples: readonly BlindSample[];
  readonly mappings: readonly BlindMapping[];     // sealed until evaluation done
  readonly evaluations: readonly HumanEvaluation[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATION GRID
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The official evaluation grid definition.
 * Used to generate evaluation forms.
 */
export const EVALUATION_GRID = {
  version: '1.0',
  axes: [
    {
      id: 'emotion_impact',
      label_fr: 'Impact émotionnel',
      description_fr: 'Le texte provoque-t-il une réaction émotionnelle ? Les émotions sont-elles montrées (pas nommées) ?',
      scale: '1 = aucun impact, 10 = bouleversant',
      maps_to: 'ECC',
    },
    {
      id: 'rhythm_musicality',
      label_fr: 'Rythme et musicalité',
      description_fr: 'Les phrases varient-elles en longueur ? Y a-t-il du souffle, des ruptures, un tempo ?',
      scale: '1 = monotone, 10 = musical',
      maps_to: 'RCI',
    },
    {
      id: 'sensory_immersion',
      label_fr: 'Immersion sensorielle',
      description_fr: 'Voit-on, sent-on, touche-t-on ce que le texte décrit ? Le corps du personnage est-il présent ?',
      scale: '1 = abstrait, 10 = on y est',
      maps_to: 'IFI',
    },
    {
      id: 'originality',
      label_fr: 'Originalité',
      description_fr: 'Le texte évite-t-il les clichés ? Les images sont-elles fraîches ? La voix est-elle distinctive ?',
      scale: '1 = générique, 10 = unique',
      maps_to: 'SII',
    },
    {
      id: 'authenticity',
      label_fr: 'Authenticité',
      description_fr: 'Le texte semble-t-il écrit par un humain avec une intention ? Ou semble-t-il généré, lisse, artificiel ?',
      scale: '1 = artificiel, 10 = profondément humain',
      maps_to: 'AAI',
    },
  ],
  global: {
    id: 'overall_quality',
    label_fr: 'Qualité globale',
    description_fr: 'Impression générale du texte.',
    scale: '1 = mauvais, 10 = excellent',
  },
  engagement: {
    id: 'would_read_more',
    label_fr: 'Envie de lire la suite',
    description_fr: 'Si ce texte était le début d\'un roman, voudriez-vous continuer ?',
    type: 'boolean',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ANONYMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deterministic shuffle using a seed.
 * Ensures same seed = same order = reproducible.
 */
function seededShuffle<T>(array: readonly T[], seed: number): T[] {
  const result = [...array];
  let s = seed;

  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff; // LCG
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Create a blind benchmark session from a corpus.
 * Anonymizes and randomizes order.
 *
 * @param samples - Full corpus (OMEGA + human)
 * @param seed - Random seed for reproducible shuffle
 * @returns BenchmarkSession with blind samples and sealed mappings
 */
export function createBlindSession(
  samples: readonly BenchmarkSample[],
  seed: number = 42,
): BenchmarkSession {
  const shuffled = seededShuffle(samples, seed);

  const blindSamples: BlindSample[] = [];
  const mappings: BlindMapping[] = [];

  for (let i = 0; i < shuffled.length; i++) {
    const sample = shuffled[i];
    const blindId = `SAMPLE-${String(i + 1).padStart(3, '0')}`;

    blindSamples.push({
      blind_id: blindId,
      prose: sample.prose,
      genre: sample.genre,
      word_count: sample.word_count,
    });

    mappings.push({
      blind_id: blindId,
      original_id: sample.id,
      source: sample.source,
    });
  }

  return {
    session_id: `BENCH-${Date.now()}`,
    date: new Date().toISOString(),
    samples: blindSamples,
    mappings,
    evaluations: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a human evaluation (all scores in range, required fields).
 */
export function validateEvaluation(eval_: HumanEvaluation): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const axes = ['emotion_impact', 'rhythm_musicality', 'sensory_immersion', 'originality', 'authenticity', 'overall_quality'] as const;

  for (const axis of axes) {
    const val = eval_[axis];
    if (val < 1 || val > 10 || !Number.isInteger(val)) {
      errors.push(`${axis} must be integer 1-10, got ${val}`);
    }
  }

  if (!eval_.sample_id) errors.push('sample_id required');
  if (!eval_.evaluator_id) errors.push('evaluator_id required');

  return { valid: errors.length === 0, errors };
}
