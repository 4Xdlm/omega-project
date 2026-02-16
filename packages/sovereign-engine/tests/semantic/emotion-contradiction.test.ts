/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — EMOTION CONTRADICTION TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/semantic/emotion-contradiction.test.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.4)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-05
 *
 * Tests for emotion contradiction detection.
 * 3 mandatory tests: CONTRA-01 to CONTRA-03.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { detectContradictions } from '../../src/semantic/emotion-contradiction.js';
import type { SemanticEmotionResult } from '../../src/semantic/types.js';

describe('Emotion Contradiction Detector (ART-SEM-05)', () => {
  it('CONTRA-01: detects contradiction when 2+ emotions > threshold', () => {
    // Mock result with joy and sadness both high (contradiction)
    const result: SemanticEmotionResult = {
      joy: 0.5,       // HIGH
      sadness: 0.6,   // HIGH
      trust: 0.2,
      fear: 0.1,
      surprise: 0.1,
      disgust: 0.0,
      anger: 0.0,
      anticipation: 0.1,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    };

    const contradictions = detectContradictions(result);

    // Should detect 1 contradiction (joy + sadness)
    expect(contradictions.length).toBe(1);

    const contradiction = contradictions[0];
    expect(contradiction.emotions).toContain('joy');
    expect(contradiction.emotions).toContain('sadness');
    expect(contradiction.intensities).toContain(0.5);
    expect(contradiction.intensities).toContain(0.6);
  });

  it('CONTRA-02: no contradiction when emotions below threshold', () => {
    // Mock result with all emotions low (no contradiction)
    const result: SemanticEmotionResult = {
      joy: 0.3,       // Below threshold (0.4)
      sadness: 0.2,   // Below threshold
      trust: 0.1,
      fear: 0.1,
      surprise: 0.1,
      disgust: 0.0,
      anger: 0.0,
      anticipation: 0.1,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    };

    const contradictions = detectContradictions(result);

    // Should detect no contradictions
    expect(contradictions.length).toBe(0);
  });

  it('CONTRA-03: generates correct instruction_fr', () => {
    // Mock result with joy and sadness high
    const result: SemanticEmotionResult = {
      joy: 0.5,
      sadness: 0.6,
      trust: 0.1,
      fear: 0.1,
      surprise: 0.1,
      disgust: 0.0,
      anger: 0.0,
      anticipation: 0.1,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    };

    const contradictions = detectContradictions(result);

    expect(contradictions.length).toBe(1);

    const instruction = contradictions[0].instruction_fr;

    // Should contain French labels and percentages
    expect(instruction).toContain('Contradiction émotionnelle');
    expect(instruction).toMatch(/joie|tristesse/); // Either joy or sadness in French
    expect(instruction).toMatch(/\d+%/); // Contains percentage
  });

  it('CONTRA-04: detects multiple contradictions with 3+ active emotions', () => {
    // Mock result with joy, sadness, and anger all high
    const result: SemanticEmotionResult = {
      joy: 0.5,
      sadness: 0.6,
      anger: 0.7,
      trust: 0.1,
      fear: 0.1,
      surprise: 0.1,
      disgust: 0.0,
      anticipation: 0.1,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    };

    const contradictions = detectContradictions(result);

    // Should detect 3 contradictions: joy-sadness, joy-anger, sadness-anger
    expect(contradictions.length).toBe(3);

    // Verify all pairs are present
    const emotionPairs = contradictions.map(c => c.emotions.slice().sort().join('-'));
    expect(emotionPairs).toContain('joy-sadness');
    expect(emotionPairs).toContain('anger-joy');
    expect(emotionPairs).toContain('anger-sadness');
  });

  it('CONTRA-05: respects custom threshold parameter', () => {
    // Mock result with emotions at 0.3 (below default 0.4, above custom 0.2)
    const result: SemanticEmotionResult = {
      joy: 0.3,
      sadness: 0.3,
      trust: 0.1,
      fear: 0.1,
      surprise: 0.1,
      disgust: 0.0,
      anger: 0.0,
      anticipation: 0.1,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    };

    // With default threshold (0.4), no contradiction
    const contradictionsDefault = detectContradictions(result);
    expect(contradictionsDefault.length).toBe(0);

    // With custom threshold (0.2), should detect contradiction
    const contradictionsCustom = detectContradictions(result, 0.2);
    expect(contradictionsCustom.length).toBe(1);
    expect(contradictionsCustom[0].emotions).toContain('joy');
    expect(contradictionsCustom[0].emotions).toContain('sadness');
  });
});
