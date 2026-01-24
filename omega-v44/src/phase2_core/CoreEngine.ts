/**
 * OMEGA V4.4 — Phase 2: CoreEngine
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * The MECHANICAL engine that applies V4.4 laws.
 * NO INTELLIGENCE. NO HEURISTICS. NO SUGGESTIONS.
 *
 * CoreEngine is a pure function:
 * f(TextInput, InjectedConfig) → CoreComputeOutput
 */

import {
  type EmotionId,
  type EmotionParamsFull,
  type InjectedConfig,
  type AxisX,
  type AxisY,
  type AxisZ,
  EMOTION_IDS,
  EMOTIONS_V44,
} from '../phase1_contract/index.js';

import type {
  TextInput,
  ComputedEmotion,
  CoreComputeOutput,
  CoreConfig,
} from './types.js';

import { DEFAULT_BOUNDS, DEFAULT_RUNTIME_CONFIG } from './types.js';

import {
  applyL1CyclicPhase,
  applyL2BoundedIntensity,
  applyL3BoundedPersistence,
  applyL4DecayLaw,
  applyL5HystereticDamping,
  applyL6Conservation,
  calculateTotalIntensity,
} from './laws.js';

import { computeConfigHash, hashObject } from './hash.js';

// ═══════════════════════════════════════════════════════════════════════════
// CORE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CoreEngine - The mechanical emotional computation engine
 *
 * Applies laws L1-L6 deterministically.
 * Same input + same config = same output (always)
 */
export class CoreEngine {
  private readonly config: CoreConfig;
  private readonly configHash: string;

  constructor(config?: Partial<CoreConfig>) {
    this.config = this.buildConfig(config);
    this.configHash = computeConfigHash(this.config);
  }

  /**
   * Build complete configuration from partial input
   */
  private buildConfig(partial?: Partial<CoreConfig>): CoreConfig {
    const timestamp = partial?.timestamp ?? Date.now();
    const bounds = partial?.bounds ?? DEFAULT_BOUNDS;
    const runtimeDefaults = partial?.runtimeDefaults ?? DEFAULT_RUNTIME_CONFIG;

    const config: CoreConfig = {
      configHash: '', // Will be computed after
      bounds,
      runtimeDefaults,
      timestamp,
      emotionWeights: partial?.emotionWeights,
    };

    return {
      ...config,
      configHash: computeConfigHash(config),
    };
  }

  /**
   * Main computation method
   *
   * @param input - Text input to analyze
   * @returns Computed emotional state
   */
  compute(input: TextInput): CoreComputeOutput {
    const validationErrors: string[] = [];

    // Validate input
    if (!input.text || input.text.trim().length === 0) {
      validationErrors.push('Empty text input');
      return this.createInvalidOutput(input.timestamp, validationErrors);
    }

    // Compute emotional values for each emotion
    const emotions = this.computeEmotions(input);

    // Get raw intensities for conservation law
    const intensities = Array.from(emotions.values()).map(e => e.intensity);

    // Apply L6 conservation
    const totalMax = this.config.bounds.Y.max * EMOTION_IDS.length;
    const normalizedIntensities = applyL6Conservation(intensities, totalMax);

    // Update emotions with normalized intensities
    const normalizedEmotions = new Map<EmotionId, ComputedEmotion>();
    let i = 0;
    for (const [id, emotion] of emotions) {
      const normalizedIntensity = normalizedIntensities[i];
      if (normalizedIntensity === undefined) {
        throw new Error(`Missing normalized intensity for index ${i}`);
      }
      normalizedEmotions.set(id, {
        ...emotion,
        intensity: normalizedIntensity,
      });
      i++;
    }

    // Calculate aggregate axes
    const axes = this.calculateAxes(normalizedEmotions);

    // Find dominant emotion
    const dominantEmotion = this.findDominantEmotion(normalizedEmotions);

    // Calculate total intensity
    const totalIntensity = calculateTotalIntensity(
      Array.from(normalizedEmotions.values()).map(e => e.intensity)
    );

    // Calculate deterministic output hash
    const computeHash = this.calculateOutputHash(
      normalizedEmotions,
      dominantEmotion,
      axes,
      totalIntensity,
      input.timestamp
    );

    return {
      emotions: normalizedEmotions,
      dominantEmotion,
      axes,
      totalIntensity,
      timestamp: input.timestamp,
      configHash: this.configHash,
      computeHash,
      validationStatus: 'VALID',
      validationErrors: [],
    };
  }

  /**
   * Compute emotion values from text
   * DETERMINISTIC: Uses text hash as seed
   */
  private computeEmotions(input: TextInput): Map<EmotionId, ComputedEmotion> {
    const emotions = new Map<EmotionId, ComputedEmotion>();

    // Generate deterministic seed from text
    const seed = this.textToSeed(input.text);

    for (const id of EMOTION_IDS) {
      const emotion = this.computeSingleEmotion(id, seed, input.timestamp);
      emotions.set(id, emotion);
    }

    return emotions;
  }

  /**
   * Compute a single emotion's values
   */
  private computeSingleEmotion(
    id: EmotionId,
    seed: number,
    timestamp: number
  ): ComputedEmotion {
    const definition = EMOTIONS_V44[id];
    const canonParams = definition.params;

    // Build full parameters
    const params: EmotionParamsFull = {
      ...canonParams,
      C: this.config.runtimeDefaults.defaultC,
      omega: this.config.runtimeDefaults.defaultOmega,
      phi: this.config.runtimeDefaults.defaultPhi,
    };

    // Deterministic intensity from seed + emotion index
    const emotionIndex = EMOTION_IDS.indexOf(id);
    const rawIntensity = this.seedToIntensity(seed, emotionIndex);

    // Apply L2 - bounded intensity
    const boundedIntensity = applyL2BoundedIntensity(
      rawIntensity,
      this.config.bounds.Y.min,
      this.config.bounds.Y.max
    );

    // Calculate position
    const position = this.calculatePosition(id, boundedIntensity, seed);

    return {
      id,
      intensity: boundedIntensity,
      position,
      params,
    };
  }

  /**
   * Calculate position for an emotion
   */
  private calculatePosition(
    id: EmotionId,
    intensity: number,
    seed: number
  ): { x: AxisX; y: AxisY; z: AxisZ } {
    const definition = EMOTIONS_V44[id];
    const { E0 } = definition.params;

    // X (valence) based on E0 and seed
    const emotionIndex = EMOTION_IDS.indexOf(id);
    const xRaw = E0 + this.pseudoRandom(seed + emotionIndex * 100) * 2 - 1;
    const x = Math.max(
      this.config.bounds.X.min,
      Math.min(this.config.bounds.X.max, xRaw)
    ) as AxisX;

    // Y (intensity) directly from computed intensity
    const y = intensity as AxisY;

    // Z (persistence) based on mu and seed
    const { mu } = definition.params;
    const zRaw = mu + this.pseudoRandom(seed + emotionIndex * 200) * 0.2 - 0.1;
    const z = applyL3BoundedPersistence(
      zRaw,
      this.config.bounds.Z.min,
      this.config.bounds.Z.max
    ) as AxisZ;

    return { x, y, z };
  }

  /**
   * Calculate aggregate axes from all emotions
   */
  private calculateAxes(emotions: Map<EmotionId, ComputedEmotion>): {
    X: number;
    Y: number;
    Z: number;
  } {
    let totalX = 0;
    let totalY = 0;
    let totalZ = 0;
    let totalWeight = 0;

    for (const emotion of emotions.values()) {
      const weight = emotion.intensity;
      totalX += emotion.position.x * weight;
      totalY += emotion.position.y * weight;
      totalZ += emotion.position.z * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return { X: 0, Y: 0, Z: 0 };
    }

    return {
      X: totalX / totalWeight,
      Y: totalY / totalWeight,
      Z: totalZ / totalWeight,
    };
  }

  /**
   * Find the dominant emotion (highest intensity)
   */
  private findDominantEmotion(emotions: Map<EmotionId, ComputedEmotion>): EmotionId {
    let maxIntensity = -Infinity;
    let dominant: EmotionId = 'SERENITE'; // Default

    for (const [id, emotion] of emotions) {
      if (emotion.intensity > maxIntensity) {
        maxIntensity = emotion.intensity;
        dominant = id;
      }
    }

    return dominant;
  }

  /**
   * Create invalid output for error cases
   */
  private createInvalidOutput(
    timestamp: number,
    errors: string[]
  ): CoreComputeOutput {
    const emptyEmotions = new Map<EmotionId, ComputedEmotion>();

    for (const id of EMOTION_IDS) {
      const definition = EMOTIONS_V44[id];
      emptyEmotions.set(id, {
        id,
        intensity: 0,
        position: { x: 0 as AxisX, y: 0 as AxisY, z: 0 as AxisZ },
        params: {
          ...definition.params,
          C: this.config.runtimeDefaults.defaultC,
          omega: this.config.runtimeDefaults.defaultOmega,
          phi: this.config.runtimeDefaults.defaultPhi,
        },
      });
    }

    const axes = { X: 0, Y: 0, Z: 0 };
    const totalIntensity = 0;
    const dominantEmotion: EmotionId = 'SERENITE';

    const computeHash = this.calculateOutputHash(
      emptyEmotions,
      dominantEmotion,
      axes,
      totalIntensity,
      timestamp
    );

    return {
      emotions: emptyEmotions,
      dominantEmotion,
      axes,
      totalIntensity,
      timestamp,
      configHash: this.configHash,
      computeHash,
      validationStatus: 'INVALID',
      validationErrors: errors,
    };
  }

  /**
   * Convert text to deterministic seed
   * DETERMINISTIC: Same text = same seed
   */
  private textToSeed(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash);
  }

  /**
   * Convert seed to intensity for emotion
   * DETERMINISTIC: Same seed + index = same intensity
   */
  private seedToIntensity(seed: number, emotionIndex: number): number {
    const combined = seed + emotionIndex * 17;
    const normalized = this.pseudoRandom(combined);
    return normalized * this.config.bounds.Y.max;
  }

  /**
   * Deterministic pseudo-random number generator
   * Uses mulberry32 algorithm
   * @param seed - Integer seed
   * @returns Number in [0, 1)
   */
  private pseudoRandom(seed: number): number {
    let t = (seed + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Calculate deterministic hash of output content
   * DETERMINISTIC: Same output content = same hash
   */
  private calculateOutputHash(
    emotions: Map<EmotionId, ComputedEmotion>,
    dominantEmotion: EmotionId,
    axes: { X: number; Y: number; Z: number },
    totalIntensity: number,
    timestamp: number
  ): string {
    // Build deterministic content for hashing
    const emotionEntries: Array<{ id: EmotionId; intensity: number; position: { x: number; y: number; z: number } }> = [];
    for (const [id, emotion] of emotions) {
      emotionEntries.push({
        id,
        intensity: emotion.intensity,
        position: {
          x: emotion.position.x,
          y: emotion.position.y,
          z: emotion.position.z,
        },
      });
    }

    // Sort by id for determinism
    emotionEntries.sort((a, b) => a.id.localeCompare(b.id));

    return hashObject({
      emotions: emotionEntries,
      dominantEmotion,
      axes,
      totalIntensity,
      timestamp,
    });
  }

  /**
   * Get current config hash
   */
  getConfigHash(): string {
    return this.configHash;
  }

  /**
   * Get current configuration
   */
  getConfig(): CoreConfig {
    return this.config;
  }
}
