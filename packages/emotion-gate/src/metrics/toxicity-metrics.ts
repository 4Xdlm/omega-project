/**
 * OMEGA Emotion Gate — Toxicity Metrics
 *
 * Passive measurement of emotional toxicity patterns (no modification).
 * Detects amplification loops and instability.
 */

import type {
  EmotionStateV2,
  EmotionFrame,
  EmotionSequence,
  ToxicitySignal,
  LoopPattern,
  EmotionCalibration,
} from '../gate/types.js';
import { OMEGA_EMO_AMPLIFICATION_CYCLES, OMEGA_EMO_NEGLIGIBLE_DELTA, OMEGA_EMO_TOXICITY_THRESHOLD } from '../gate/types.js';

/**
 * Detect oscillation pattern in a sequence of values.
 */
export function detectOscillation(values: readonly number[], minCycles: number): { detected: boolean; cycles: number } {
  if (values.length < minCycles * 2 + 1) {
    return { detected: false, cycles: 0 };
  }

  // Look for alternating increases and decreases
  let cycles = 0;
  let lastDirection: 'up' | 'down' | null = null;

  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const currentDirection: 'up' | 'down' | null = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : null;

    if (currentDirection && lastDirection && currentDirection !== lastDirection) {
      cycles++;
    }
    if (currentDirection) {
      lastDirection = currentDirection;
    }
  }

  return {
    detected: cycles >= minCycles,
    cycles: Math.floor(cycles / 2), // Each full cycle is 2 direction changes
  };
}

/**
 * Detect amplification loop pattern in a sequence.
 */
export function detectAmplificationLoop(
  sequence: EmotionSequence,
  calibration: EmotionCalibration
): LoopPattern | undefined {
  const minCycles = calibration[OMEGA_EMO_AMPLIFICATION_CYCLES];
  const frames = sequence.frames;

  if (frames.length < minCycles * 2 + 1) {
    return undefined;
  }

  const dimensions: readonly (keyof EmotionStateV2)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  const oscillatingDimensions: (keyof EmotionStateV2)[] = [];
  let maxCycles = 0;
  let maxAmplitude = 0;

  for (const dim of dimensions) {
    const values = frames.map(f => f.emotion_state[dim]);
    const oscillation = detectOscillation(values, minCycles);

    if (oscillation.detected) {
      oscillatingDimensions.push(dim);
      maxCycles = Math.max(maxCycles, oscillation.cycles);

      // Calculate amplitude
      const min = Math.min(...values);
      const max = Math.max(...values);
      maxAmplitude = Math.max(maxAmplitude, max - min);
    }
  }

  if (oscillatingDimensions.length === 0) {
    return undefined;
  }

  return {
    cycle_length: Math.ceil(frames.length / maxCycles),
    oscillating_dimensions: oscillatingDimensions,
    amplitude: maxAmplitude,
  };
}

/**
 * Compute instability score from a sequence.
 */
export function computeInstabilityScore(sequence: EmotionSequence): number {
  if (sequence.frames.length < 2) return 0;

  const dimensions: readonly (keyof EmotionStateV2)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  let totalVariance = 0;

  for (const dim of dimensions) {
    const values = sequence.frames.map(f => f.emotion_state[dim]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    totalVariance += variance;
  }

  // Normalize to [0, 1]
  const avgVariance = totalVariance / dimensions.length;
  return Math.min(1, avgVariance * 4); // Scale factor to get meaningful values
}

/**
 * Count unjustified spikes in a sequence.
 */
export function countUnjustifiedSpikes(
  sequence: EmotionSequence,
  calibration: EmotionCalibration
): number {
  const threshold = calibration[OMEGA_EMO_NEGLIGIBLE_DELTA] * 4; // Spike is 4x normal delta
  let spikeCount = 0;

  for (let i = 1; i < sequence.frames.length; i++) {
    const current = sequence.frames[i];
    const previous = sequence.frames[i - 1];

    // Check if there's evidence for the change
    const hasEvidence = current.evidence_refs.length > 0;

    // Check for large delta
    const dimensions: readonly (keyof EmotionStateV2)[] = [
      'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
      'anger', 'anticipation', 'love', 'submission', 'awe',
      'disapproval', 'remorse', 'contempt',
    ];

    for (const dim of dimensions) {
      const delta = Math.abs(current.emotion_state[dim] - previous.emotion_state[dim]);
      if (delta > threshold && !hasEvidence) {
        spikeCount++;
        break; // Count frame once
      }
    }
  }

  return spikeCount;
}

/**
 * Count contradictions (back-and-forth changes).
 */
export function countContradictions(sequence: EmotionSequence): number {
  if (sequence.frames.length < 3) return 0;

  let contradictions = 0;
  const dimensions: readonly (keyof EmotionStateV2)[] = [
    'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust',
    'anger', 'anticipation', 'love', 'submission', 'awe',
    'disapproval', 'remorse', 'contempt',
  ];

  for (let i = 2; i < sequence.frames.length; i++) {
    for (const dim of dimensions) {
      const v0 = sequence.frames[i - 2].emotion_state[dim];
      const v1 = sequence.frames[i - 1].emotion_state[dim];
      const v2 = sequence.frames[i].emotion_state[dim];

      // Contradiction: went up then down (or vice versa) back to near original
      const delta1 = v1 - v0;
      const delta2 = v2 - v1;

      if (Math.abs(delta1) > 0.1 && Math.abs(delta2) > 0.1) {
        if ((delta1 > 0 && delta2 < 0) || (delta1 < 0 && delta2 > 0)) {
          if (Math.abs(v2 - v0) < Math.abs(delta1) * 0.5) {
            contradictions++;
            break; // Count frame once
          }
        }
      }
    }
  }

  return contradictions;
}

/**
 * Compute complete toxicity signal for a frame in context.
 */
export function computeToxicitySignal(
  frame: EmotionFrame,
  sequence: EmotionSequence | undefined,
  calibration: EmotionCalibration
): ToxicitySignal {
  if (!sequence || sequence.frames.length < 2) {
    return createSafeToxicitySignal();
  }

  const loopPattern = detectAmplificationLoop(sequence, calibration);
  const instability = computeInstabilityScore(sequence);
  const unjustifiedSpikes = countUnjustifiedSpikes(sequence, calibration);
  const contradictions = countContradictions(sequence);

  return {
    amplification_detected: loopPattern !== undefined,
    amplification_cycles: loopPattern?.oscillating_dimensions.length ?? 0,
    loop_pattern: loopPattern,
    instability_score: instability,
    contradiction_count: contradictions,
    unjustified_spikes: unjustifiedSpikes,
  };
}

/**
 * Create a safe (no toxicity) signal.
 */
export function createSafeToxicitySignal(): ToxicitySignal {
  return {
    amplification_detected: false,
    amplification_cycles: 0,
    loop_pattern: undefined,
    instability_score: 0,
    contradiction_count: 0,
    unjustified_spikes: 0,
  };
}

/**
 * Check if toxicity signal exceeds threshold.
 */
export function isToxicityAboveThreshold(
  signal: ToxicitySignal,
  calibration: EmotionCalibration
): boolean {
  const threshold = calibration[OMEGA_EMO_TOXICITY_THRESHOLD];
  return (
    signal.amplification_detected ||
    signal.instability_score > threshold ||
    signal.unjustified_spikes > 2
  );
}
