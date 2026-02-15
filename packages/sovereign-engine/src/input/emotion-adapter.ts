/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — EMOTION ADAPTER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: input/emotion-adapter.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Maps between two 14-emotion systems:
 * - @omega/genome: joy, sadness, anger, fear, surprise, disgust, trust, anticipation, love, guilt, shame, pride, envy, hope
 * - @omega/omega-forge: joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love, submission, awe, disapproval, remorse, contempt
 *
 * EXACT matches: joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love (9/14)
 * SEMANTIC mappings: guilt→remorse, shame→remorse, pride→inverse(submission), envy→contempt, hope→anticipation
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION SYSTEM DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type GenomeEmotion14 =
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust'
  | 'trust' | 'anticipation' | 'love'
  | 'guilt' | 'shame' | 'pride' | 'envy' | 'hope';

export type ForgeEmotion14 =
  | 'joy' | 'trust' | 'fear' | 'surprise' | 'sadness' | 'disgust'
  | 'anger' | 'anticipation' | 'love'
  | 'submission' | 'awe' | 'disapproval' | 'remorse' | 'contempt';

export const GENOME_14: readonly GenomeEmotion14[] = [
  'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust',
  'trust', 'anticipation', 'love',
  'guilt', 'shame', 'pride', 'envy', 'hope',
] as const;

export const FORGE_14: readonly ForgeEmotion14[] = [
  'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
  'anger', 'anticipation', 'love',
  'submission', 'awe', 'disapproval', 'remorse', 'contempt',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING TABLES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genome → Forge mapping with weights.
 * Some genome emotions map to multiple forge emotions (distribution).
 */
const GENOME_TO_FORGE_MAP: Readonly<Record<GenomeEmotion14, readonly { readonly emotion: ForgeEmotion14; readonly weight: number }[]>> = {
  // Exact matches (weight = 1.0)
  joy: [{ emotion: 'joy', weight: 1.0 }],
  trust: [{ emotion: 'trust', weight: 1.0 }],
  fear: [{ emotion: 'fear', weight: 1.0 }],
  surprise: [{ emotion: 'surprise', weight: 1.0 }],
  sadness: [{ emotion: 'sadness', weight: 1.0 }],
  disgust: [{ emotion: 'disgust', weight: 1.0 }],
  anger: [{ emotion: 'anger', weight: 1.0 }],
  anticipation: [{ emotion: 'anticipation', weight: 1.0 }],
  love: [{ emotion: 'love', weight: 1.0 }],

  // Semantic mappings (may distribute across multiple forge emotions)
  guilt: [{ emotion: 'remorse', weight: 1.0 }],
  shame: [{ emotion: 'remorse', weight: 0.7 }, { emotion: 'fear', weight: 0.3 }],
  pride: [{ emotion: 'joy', weight: 0.6 }, { emotion: 'contempt', weight: 0.4 }],
  envy: [{ emotion: 'contempt', weight: 0.6 }, { emotion: 'sadness', weight: 0.4 }],
  hope: [{ emotion: 'anticipation', weight: 0.7 }, { emotion: 'joy', weight: 0.3 }],
} as const;

/**
 * Forge → Genome reverse mapping (best-effort).
 * Not all forge emotions have clear genome equivalents.
 */
const FORGE_TO_GENOME_MAP: Readonly<Record<ForgeEmotion14, readonly { readonly emotion: GenomeEmotion14; readonly weight: number }[]>> = {
  // Exact matches
  joy: [{ emotion: 'joy', weight: 1.0 }],
  trust: [{ emotion: 'trust', weight: 1.0 }],
  fear: [{ emotion: 'fear', weight: 1.0 }],
  surprise: [{ emotion: 'surprise', weight: 1.0 }],
  sadness: [{ emotion: 'sadness', weight: 1.0 }],
  disgust: [{ emotion: 'disgust', weight: 1.0 }],
  anger: [{ emotion: 'anger', weight: 1.0 }],
  anticipation: [{ emotion: 'anticipation', weight: 1.0 }],
  love: [{ emotion: 'love', weight: 1.0 }],

  // Forge-specific (no direct genome equivalent)
  remorse: [{ emotion: 'guilt', weight: 0.7 }, { emotion: 'shame', weight: 0.3 }],
  submission: [{ emotion: 'fear', weight: 0.5 }, { emotion: 'sadness', weight: 0.5 }],
  awe: [{ emotion: 'surprise', weight: 0.6 }, { emotion: 'fear', weight: 0.4 }],
  disapproval: [{ emotion: 'anger', weight: 0.5 }, { emotion: 'disgust', weight: 0.5 }],
  contempt: [{ emotion: 'disgust', weight: 0.5 }, { emotion: 'anger', weight: 0.3 }, { emotion: 'pride', weight: 0.2 }],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert a Genome emotion distribution to Forge 14D.
 * Distributes weights according to semantic mappings.
 */
export function genomeToForge14D(genome: Record<string, number>): Record<string, number> {
  const forge: Record<string, number> = {};

  // Initialize all forge emotions to 0
  for (const emotion of FORGE_14) {
    forge[emotion] = 0;
  }

  // Map each genome emotion
  for (const genomeEmotion of GENOME_14) {
    const intensity = genome[genomeEmotion] ?? 0;
    if (intensity === 0) continue;

    const mapping = GENOME_TO_FORGE_MAP[genomeEmotion];
    for (const { emotion, weight } of mapping) {
      forge[emotion] += intensity * weight;
    }
  }

  // Normalize to [0, 1]
  const sum = Object.values(forge).reduce((acc, v) => acc + v, 0);
  if (sum > 0) {
    for (const emotion of FORGE_14) {
      forge[emotion] /= sum;
    }
  }

  return forge;
}

/**
 * Convert a Forge 14D state to Genome distribution.
 * Best-effort reverse mapping.
 */
export function forgeToGenome14D(forge: Record<string, number>): Record<string, number> {
  const genome: Record<string, number> = {};

  // Initialize all genome emotions to 0
  for (const emotion of GENOME_14) {
    genome[emotion] = 0;
  }

  // Map each forge emotion
  for (const forgeEmotion of FORGE_14) {
    const intensity = forge[forgeEmotion] ?? 0;
    if (intensity === 0) continue;

    const mapping = FORGE_TO_GENOME_MAP[forgeEmotion];
    for (const { emotion, weight } of mapping) {
      genome[emotion] += intensity * weight;
    }
  }

  // Normalize to [0, 1]
  const sum = Object.values(genome).reduce((acc, v) => acc + v, 0);
  if (sum > 0) {
    for (const emotion of GENOME_14) {
      genome[emotion] /= sum;
    }
  }

  return genome;
}

/**
 * Convert a single Genome emotion to its Forge equivalent(s).
 * Returns array of {emotion, weight} pairs.
 */
export function mapGenomeEmotionToForge(emotion: GenomeEmotion14): readonly { readonly emotion: ForgeEmotion14; readonly weight: number }[] {
  return GENOME_TO_FORGE_MAP[emotion];
}

/**
 * Convert a single Forge emotion to its Genome equivalent(s).
 * Returns array of {emotion, weight} pairs.
 */
export function mapForgeEmotionToGenome(emotion: ForgeEmotion14): readonly { readonly emotion: GenomeEmotion14; readonly weight: number }[] {
  return FORGE_TO_GENOME_MAP[emotion];
}

/**
 * Check if an emotion name exists in Genome system.
 */
export function isGenomeEmotion(emotion: string): emotion is GenomeEmotion14 {
  return GENOME_14.includes(emotion as GenomeEmotion14);
}

/**
 * Check if an emotion name exists in Forge system.
 */
export function isForgeEmotion(emotion: string): emotion is ForgeEmotion14 {
  return FORGE_14.includes(emotion as ForgeEmotion14);
}

/**
 * Validate a Genome distribution (all keys valid, sum ~1.0).
 */
export function validateGenomeDistribution(dist: Record<string, number>): { readonly valid: boolean; readonly error?: string } {
  for (const key of Object.keys(dist)) {
    if (!isGenomeEmotion(key)) {
      return { valid: false, error: `Invalid genome emotion: ${key}` };
    }
  }

  const sum = Object.values(dist).reduce((acc, v) => acc + v, 0);
  if (Math.abs(sum - 1.0) > 0.01 && sum > 0) {
    return { valid: false, error: `Distribution sum ${sum} != 1.0` };
  }

  return { valid: true };
}

/**
 * Validate a Forge 14D state (all keys valid, sum ~1.0).
 */
export function validateForge14D(state: Record<string, number>): { readonly valid: boolean; readonly error?: string } {
  for (const key of Object.keys(state)) {
    if (!isForgeEmotion(key)) {
      return { valid: false, error: `Invalid forge emotion: ${key}` };
    }
  }

  const sum = Object.values(state).reduce((acc, v) => acc + v, 0);
  if (Math.abs(sum - 1.0) > 0.01 && sum > 0) {
    return { valid: false, error: `State sum ${sum} != 1.0` };
  }

  return { valid: true };
}
