/**
 * OMEGA Mod-Narrative — EmotionV2 Adapter
 *
 * CRITICAL: This module CONSUMES EmotionV2, it NEVER recalculates emotion.
 * EmotionV2 (from GENESIS FORGE) is the Single Source of Truth for emotions.
 *
 * RULE: All emotion values come from EmotionV2.
 * This adapter may compute DERIVED values (curves, inertia) but never raw emotions.
 */

/**
 * 14-dimensional emotion vector (Plutchik + extended).
 * Values are normalized [0, 1].
 */
export interface EmotionVector14D {
  readonly joy: number;
  readonly trust: number;
  readonly fear: number;
  readonly surprise: number;
  readonly sadness: number;
  readonly disgust: number;
  readonly anger: number;
  readonly anticipation: number;
  readonly love: number;
  readonly submission: number;
  readonly awe: number;
  readonly disapproval: number;
  readonly remorse: number;
  readonly contempt: number;
}

/**
 * Result of emotion analysis from EmotionV2.
 */
export interface EmotionAnalysisResult {
  readonly vector: EmotionVector14D;
  readonly confidence: number;  // [0, 1]
  readonly dominant: keyof EmotionVector14D;
  readonly valence: number;     // [-1, 1] (negative to positive)
  readonly arousal: number;     // [0, 1] (calm to excited)
}

/**
 * A point on the emotion curve (position in text + emotion state).
 */
export interface EmotionCurvePoint {
  readonly position: number;  // [0, 1] normalized position in text
  readonly emotion: EmotionAnalysisResult;
}

/**
 * Emotion curve over a sequence of text segments.
 */
export interface EmotionCurve {
  readonly points: readonly EmotionCurvePoint[];
  readonly peaks: readonly number[];    // Indices of emotional peaks
  readonly valleys: readonly number[];  // Indices of emotional valleys
}

/**
 * EmotionV2 Provider Interface
 *
 * RULE: This provider DELEGATES to EmotionV2 (GENESIS FORGE).
 * It NEVER calculates emotion itself.
 * It MAY compute derived values (curves, inertia) from EmotionV2 outputs.
 */
export interface EmotionV2Provider {
  /**
   * Analyze text emotion via EmotionV2 (SSOT).
   * MUST delegate to @omega/genesis-forge EmotionBridge.
   */
  analyze(text: string): Promise<EmotionAnalysisResult>;

  /**
   * Compute emotion curve from multiple analyses.
   * This is DERIVED from EmotionV2 outputs, not a new calculation.
   */
  computeCurve(analyses: readonly EmotionAnalysisResult[]): EmotionCurve;

  /**
   * Compute emotional inertia from sequence.
   * This is DERIVED from EmotionV2 outputs.
   * Inertia = resistance to emotional change over the sequence.
   */
  computeInertia(sequence: readonly EmotionVector14D[]): number;
}

/**
 * Compute emotion curve from analysis results.
 * This is a pure computation on existing EmotionV2 outputs.
 */
export function computeEmotionCurve(
  analyses: readonly EmotionAnalysisResult[]
): EmotionCurve {
  if (analyses.length === 0) {
    return { points: [], peaks: [], valleys: [] };
  }

  const points: EmotionCurvePoint[] = analyses.map((emotion, index) => ({
    position: analyses.length === 1 ? 0.5 : index / (analyses.length - 1),
    emotion,
  }));

  // Find peaks and valleys based on arousal
  const peaks: number[] = [];
  const valleys: number[] = [];

  for (let i = 1; i < analyses.length - 1; i++) {
    const prev = analyses[i - 1].arousal;
    const curr = analyses[i].arousal;
    const next = analyses[i + 1].arousal;

    if (curr > prev && curr > next) {
      peaks.push(i);
    } else if (curr < prev && curr < next) {
      valleys.push(i);
    }
  }

  return { points, peaks, valleys };
}

/**
 * Compute emotional inertia from a sequence of emotion vectors.
 * Inertia measures how resistant the emotional state is to change.
 * Higher inertia = more stable emotional arc.
 */
export function computeEmotionalInertia(
  sequence: readonly EmotionVector14D[]
): number {
  if (sequence.length < 2) {
    return 1.0; // Maximum stability for single point
  }

  // Compute total change across all dimensions
  let totalChange = 0;
  const dimensions: (keyof EmotionVector14D)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  for (let i = 1; i < sequence.length; i++) {
    let stepChange = 0;
    for (const dim of dimensions) {
      const delta = Math.abs(sequence[i][dim] - sequence[i - 1][dim]);
      stepChange += delta * delta;
    }
    totalChange += Math.sqrt(stepChange);
  }

  // Normalize: more changes = less inertia
  const avgChange = totalChange / (sequence.length - 1);
  // Inertia inversely proportional to average change
  // Using exponential decay: e^(-k*avgChange)
  const k = 2.0; // Sensitivity factor
  return Math.exp(-k * avgChange);
}

/**
 * Create a null/empty emotion vector.
 */
export function createNullEmotionVector(): EmotionVector14D {
  return {
    joy: 0,
    trust: 0,
    fear: 0,
    surprise: 0,
    sadness: 0,
    disgust: 0,
    anger: 0,
    anticipation: 0,
    love: 0,
    submission: 0,
    awe: 0,
    disapproval: 0,
    remorse: 0,
    contempt: 0,
  };
}

/**
 * Find dominant emotion in a vector.
 */
export function findDominantEmotion(
  vector: EmotionVector14D
): keyof EmotionVector14D {
  const entries = Object.entries(vector) as [keyof EmotionVector14D, number][];
  let max: [keyof EmotionVector14D, number] = ['joy', 0];

  for (const entry of entries) {
    if (entry[1] > max[1]) {
      max = entry;
    }
  }

  return max[0];
}

/**
 * Adapter factory placeholder.
 * Real implementation will connect to @omega/genesis-forge.
 */
export function createEmotionV2Adapter(): EmotionV2Provider {
  // TODO: Connect to @omega/genesis-forge EmotionBridge
  throw new Error(
    'EmotionV2Adapter: Not yet connected to GENESIS FORGE. ' +
    'This adapter MUST delegate to EmotionV2 - it cannot calculate emotions itself.'
  );
}
