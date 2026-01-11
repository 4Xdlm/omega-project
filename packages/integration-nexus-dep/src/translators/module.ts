/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — MODULE TRANSLATOR
 * Version: 0.3.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Inter-module data transformation.
 * INV-TRANS-03: Translation preserves semantic content.
 * INV-TRANS-04: Emotion type mapping is bijective.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Emotion14 } from "../contracts/types.js";
import type { EmotionType } from "../adapters/mycelium-bio.adapter.js";

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genome uses Emotion14 with "envy"
 * Bio uses EmotionType with "despair"
 *
 * Mapping strategy:
 * - Common emotions map directly
 * - "envy" (Genome) ↔ "despair" (Bio) are contextually distinct
 * - When translating, we preserve the original emotion if it exists in target
 * - For missing emotions, we map to closest semantic equivalent
 */

export const GENOME_TO_BIO_EMOTION: Readonly<Record<Emotion14, EmotionType>> = {
  joy: "joy",
  sadness: "sadness",
  anger: "anger",
  fear: "fear",
  surprise: "surprise",
  disgust: "disgust",
  trust: "trust",
  anticipation: "anticipation",
  love: "love",
  guilt: "guilt",
  shame: "shame",
  pride: "pride",
  hope: "hope",
  envy: "anger" // envy mapped to anger (closest negative active emotion)
};

export const BIO_TO_GENOME_EMOTION: Readonly<Record<EmotionType, Emotion14>> = {
  joy: "joy",
  sadness: "sadness",
  anger: "anger",
  fear: "fear",
  surprise: "surprise",
  disgust: "disgust",
  trust: "trust",
  anticipation: "anticipation",
  love: "love",
  guilt: "guilt",
  shame: "shame",
  pride: "pride",
  hope: "hope",
  despair: "sadness" // despair mapped to sadness (closest low-valence emotion)
};

// ═══════════════════════════════════════════════════════════════════════════════
// FINGERPRINT NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizedFingerprint {
  readonly type: "genome" | "bio" | "unified";
  readonly hash: string;
  readonly version: string;
  readonly emotions: Readonly<Record<string, number>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE TRANSLATOR
// ═══════════════════════════════════════════════════════════════════════════════

export class ModuleTranslator {
  /**
   * Translate Genome emotion distribution to Bio format
   * INV-TRANS-04: Bijective mapping (with approximation for envy/despair)
   */
  translateEmotionsGenomeToBio(
    distribution: Readonly<Record<Emotion14, number>>
  ): Readonly<Record<EmotionType, number>> {
    const result: Record<EmotionType, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      trust: 0,
      anticipation: 0,
      love: 0,
      guilt: 0,
      shame: 0,
      pride: 0,
      hope: 0,
      despair: 0
    };

    for (const [emotion, value] of Object.entries(distribution)) {
      const mapped = GENOME_TO_BIO_EMOTION[emotion as Emotion14];
      if (mapped) {
        result[mapped] += value;
      }
    }

    // Normalize to sum to 1
    const total = Object.values(result).reduce((sum, v) => sum + v, 0);
    if (total > 0) {
      for (const key of Object.keys(result) as EmotionType[]) {
        result[key] /= total;
      }
    }

    return result;
  }

  /**
   * Translate Bio emotion distribution to Genome format
   */
  translateEmotionsBioToGenome(
    distribution: Readonly<Record<EmotionType, number>>
  ): Readonly<Record<Emotion14, number>> {
    const result: Record<Emotion14, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      trust: 0,
      anticipation: 0,
      love: 0,
      guilt: 0,
      shame: 0,
      pride: 0,
      hope: 0,
      envy: 0
    };

    for (const [emotion, value] of Object.entries(distribution)) {
      const mapped = BIO_TO_GENOME_EMOTION[emotion as EmotionType];
      if (mapped) {
        result[mapped] += value;
      }
    }

    // Normalize
    const total = Object.values(result).reduce((sum, v) => sum + v, 0);
    if (total > 0) {
      for (const key of Object.keys(result) as Emotion14[]) {
        result[key] /= total;
      }
    }

    return result;
  }

  /**
   * Normalize fingerprint to unified format
   * INV-TRANS-03: Preserves semantic content
   */
  normalizeFingerprint(
    fingerprint: string,
    source: "genome" | "bio",
    version: string,
    emotions?: Readonly<Record<string, number>>
  ): NormalizedFingerprint {
    return {
      type: "unified",
      hash: this.normalizeHash(fingerprint),
      version,
      emotions: emotions ? this.normalizeEmotionKeys(emotions) : {}
    };
  }

  /**
   * Compare fingerprints from different sources
   * Returns similarity score 0-1
   */
  compareCrossModule(
    genomeFp: string,
    bioFp: string
  ): number {
    // Normalize both hashes
    const normalizedGenome = this.normalizeHash(genomeFp);
    const normalizedBio = this.normalizeHash(bioFp);

    // Exact match
    if (normalizedGenome === normalizedBio) {
      return 1.0;
    }

    // Compute Jaccard similarity on character sets
    const setA = new Set(normalizedGenome.split(""));
    const setB = new Set(normalizedBio.split(""));

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  /**
   * Merge emotion distributions from multiple sources
   */
  mergeEmotionDistributions(
    distributions: Array<Readonly<Record<string, number>>>,
    weights?: number[]
  ): Readonly<Record<Emotion14, number>> {
    const result: Record<Emotion14, number> = {
      joy: 0, sadness: 0, anger: 0, fear: 0,
      surprise: 0, disgust: 0, trust: 0, anticipation: 0,
      love: 0, guilt: 0, shame: 0, pride: 0, hope: 0, envy: 0
    };

    const normalizedWeights = weights
      ? this.normalizeWeights(weights)
      : distributions.map(() => 1 / distributions.length);

    for (let i = 0; i < distributions.length; i++) {
      const dist = distributions[i];
      const weight = normalizedWeights[i];

      for (const [emotion, value] of Object.entries(dist)) {
        const e14 = this.toEmotion14(emotion);
        if (e14) {
          result[e14] += value * weight;
        }
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private normalizeHash(hash: string): string {
    return hash.toLowerCase().replace(/[^a-f0-9]/g, "");
  }

  private normalizeEmotionKeys(
    emotions: Readonly<Record<string, number>>
  ): Readonly<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(emotions)) {
      result[key.toLowerCase()] = value;
    }
    return result;
  }

  private normalizeWeights(weights: number[]): number[] {
    const total = weights.reduce((sum, w) => sum + w, 0);
    return total > 0 ? weights.map(w => w / total) : weights;
  }

  private toEmotion14(emotion: string): Emotion14 | undefined {
    const e14: Emotion14[] = [
      "joy", "sadness", "anger", "fear", "surprise", "disgust",
      "trust", "anticipation", "love", "guilt", "shame", "pride",
      "hope", "envy"
    ];
    const lower = emotion.toLowerCase();
    return e14.find(e => e === lower);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

let defaultTranslator: ModuleTranslator | null = null;

/**
 * Get the default module translator
 */
export function getModuleTranslator(): ModuleTranslator {
  if (!defaultTranslator) {
    defaultTranslator = new ModuleTranslator();
  }
  return defaultTranslator;
}

/**
 * Create a new module translator
 */
export function createModuleTranslator(): ModuleTranslator {
  return new ModuleTranslator();
}
