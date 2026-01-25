/**
 * OMEGA Emotion Gate — Toxicity Metrics Tests
 *
 * Tests for toxicity measurement utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  detectOscillation,
  detectAmplificationLoop,
  computeInstabilityScore,
  countUnjustifiedSpikes,
  countContradictions,
  computeToxicitySignal,
  createSafeToxicitySignal,
} from '../../src/metrics/toxicity-metrics.js';
import {
  NEUTRAL_EMOTION,
  HAPPY_EMOTION,
  SAD_EMOTION,
  ANGRY_EMOTION,
  createTestFrame,
  createStableSequence,
  createOscillatingSequence,
  createTransitionSequence,
  createTestSequence,
} from '../helpers/test-fixtures.js';
import { DEFAULT_EMOTION_CALIBRATION } from '../../src/gate/types.js';

describe('detectOscillation', () => {
  it('should not detect oscillation in stable values', () => {
    const values = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const result = detectOscillation(values, 3);

    expect(result.detected).toBe(false);
    expect(result.cycles).toBe(0);
  });

  it('should detect oscillation in alternating values', () => {
    const values = [0.2, 0.8, 0.2, 0.8, 0.2, 0.8, 0.2, 0.8, 0.2];
    const result = detectOscillation(values, 3);

    expect(result.detected).toBe(true);
    expect(result.cycles).toBeGreaterThanOrEqual(3);
  });

  it('should not detect oscillation with insufficient cycles', () => {
    const values = [0.2, 0.8, 0.2]; // Only 1 cycle
    const result = detectOscillation(values, 3);

    expect(result.detected).toBe(false);
  });

  it('should handle short sequences', () => {
    const values = [0.5, 0.5];
    const result = detectOscillation(values, 3);

    expect(result.detected).toBe(false);
  });

  it('should detect oscillation with small amplitude', () => {
    const values = [0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4];
    const result = detectOscillation(values, 3);

    expect(result.detected).toBe(true);
  });
});

describe('detectAmplificationLoop', () => {
  it('should not detect loop in stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.001);
    const result = detectAmplificationLoop(sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(result).toBeUndefined();
  });

  it('should detect loop in oscillating sequence', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 12);
    const result = detectAmplificationLoop(sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(result).toBeDefined();
    expect(result?.oscillating_dimensions.length).toBeGreaterThan(0);
  });

  it('should return cycle length', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, ANGRY_EMOTION, 12);
    const result = detectAmplificationLoop(sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(result?.cycle_length).toBeDefined();
    expect(result?.cycle_length).toBeGreaterThan(0);
  });

  it('should return amplitude', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 12);
    const result = detectAmplificationLoop(sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(result?.amplitude).toBeDefined();
    expect(result?.amplitude).toBeGreaterThan(0);
  });

  it('should not detect loop with insufficient frames', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 3);
    const result = detectAmplificationLoop(sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(result).toBeUndefined();
  });
});

describe('computeInstabilityScore', () => {
  it('should return zero for single frame', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 1);
    expect(computeInstabilityScore(sequence)).toBe(0);
  });

  it('should return low score for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.001);
    const score = computeInstabilityScore(sequence);

    expect(score).toBeLessThan(0.1);
  });

  it('should return high score for unstable sequence', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, ANGRY_EMOTION, 10);
    const score = computeInstabilityScore(sequence);

    expect(score).toBeGreaterThan(0.1);
  });

  it('should return moderate score for transition', () => {
    const sequence = createTransitionSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 10);
    const score = computeInstabilityScore(sequence);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('countUnjustifiedSpikes', () => {
  it('should return zero for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.01);
    const count = countUnjustifiedSpikes(sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(count).toBe(0);
  });

  it('should count spikes without evidence', () => {
    // Create sequence with sudden spike
    const frames = [
      createTestFrame(NEUTRAL_EMOTION),
      createTestFrame(NEUTRAL_EMOTION),
      createTestFrame(ANGRY_EMOTION), // Spike without evidence
      createTestFrame(NEUTRAL_EMOTION),
    ];
    const sequence = createTestSequence(frames);
    const count = countUnjustifiedSpikes(sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(count).toBeGreaterThan(0);
  });

  it('should not count spikes with evidence', () => {
    const frames = [
      createTestFrame(NEUTRAL_EMOTION),
      createTestFrame(NEUTRAL_EMOTION),
      createTestFrame(ANGRY_EMOTION, { evidence_refs: ['evr_001'] }), // Justified
      createTestFrame(NEUTRAL_EMOTION, { evidence_refs: ['evr_002'] }),
    ];
    const sequence = createTestSequence(frames);
    const count = countUnjustifiedSpikes(sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(count).toBe(0);
  });
});

describe('countContradictions', () => {
  it('should return zero for short sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 2);
    expect(countContradictions(sequence)).toBe(0);
  });

  it('should return zero for stable sequence', () => {
    const sequence = createStableSequence(NEUTRAL_EMOTION, 10, 0.01);
    expect(countContradictions(sequence)).toBe(0);
  });

  it('should count back-and-forth changes', () => {
    // Create sequence: neutral -> happy -> back to neutral
    const frames = [
      createTestFrame(NEUTRAL_EMOTION),
      createTestFrame(HAPPY_EMOTION),
      createTestFrame(NEUTRAL_EMOTION), // Contradiction
    ];
    const sequence = createTestSequence(frames);
    const count = countContradictions(sequence);

    expect(count).toBeGreaterThan(0);
  });

  it('should detect multiple contradictions', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 10);
    const count = countContradictions(sequence);

    expect(count).toBeGreaterThan(1);
  });
});

describe('computeToxicitySignal', () => {
  it('should return safe signal for single frame', () => {
    const frame = createTestFrame(NEUTRAL_EMOTION);
    const signal = computeToxicitySignal(frame, undefined, DEFAULT_EMOTION_CALIBRATION);

    expect(signal.amplification_detected).toBe(false);
    expect(signal.instability_score).toBe(0);
    expect(signal.contradiction_count).toBe(0);
    expect(signal.unjustified_spikes).toBe(0);
  });

  it('should detect amplification in oscillating sequence', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, ANGRY_EMOTION, 12);
    const frame = sequence.frames[sequence.frames.length - 1];
    const signal = computeToxicitySignal(frame, sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(signal.amplification_detected).toBe(true);
  });

  it('should include loop pattern when detected', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, HAPPY_EMOTION, 12);
    const frame = sequence.frames[sequence.frames.length - 1];
    const signal = computeToxicitySignal(frame, sequence, DEFAULT_EMOTION_CALIBRATION);

    if (signal.amplification_detected) {
      expect(signal.loop_pattern).toBeDefined();
    }
  });

  it('should compute instability score', () => {
    const sequence = createOscillatingSequence(NEUTRAL_EMOTION, ANGRY_EMOTION, 10);
    const frame = sequence.frames[sequence.frames.length - 1];
    const signal = computeToxicitySignal(frame, sequence, DEFAULT_EMOTION_CALIBRATION);

    expect(signal.instability_score).toBeGreaterThan(0);
  });
});

describe('createSafeToxicitySignal', () => {
  it('should return signal with no toxicity', () => {
    const signal = createSafeToxicitySignal();

    expect(signal.amplification_detected).toBe(false);
    expect(signal.amplification_cycles).toBe(0);
    expect(signal.loop_pattern).toBeUndefined();
    expect(signal.instability_score).toBe(0);
    expect(signal.contradiction_count).toBe(0);
    expect(signal.unjustified_spikes).toBe(0);
  });
});
