/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — EMOTION TO ACTION TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/semantic/emotion-to-action.test.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.4)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-05
 *
 * Tests for emotion-to-action mapping.
 * 3 mandatory tests: ACTION-01 to ACTION-03.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { mapEmotionToActions, EMOTION_ACTION_MAP } from '../../src/semantic/emotion-to-action.js';
import type { SemanticEmotionResult } from '../../src/semantic/types.js';

describe('Emotion to Action Mapping (ART-SEM-05)', () => {
  it('ACTION-01: maps all 14 emotions to action lists', () => {
    // Verify EMOTION_ACTION_MAP has all 14 Plutchik emotions
    const emotions: Array<keyof SemanticEmotionResult> = [
      'joy', 'trust', 'fear', 'surprise', 'sadness',
      'disgust', 'anger', 'anticipation', 'love', 'submission',
      'awe', 'disapproval', 'remorse', 'contempt',
    ];

    for (const emotion of emotions) {
      expect(EMOTION_ACTION_MAP).toHaveProperty(emotion);
      expect(EMOTION_ACTION_MAP[emotion]).toBeDefined();
      expect(EMOTION_ACTION_MAP[emotion].length).toBeGreaterThan(0);
      expect(typeof EMOTION_ACTION_MAP[emotion][0]).toBe('string');
    }
  });

  it('ACTION-02: max_actions limit is applied correctly', () => {
    // Mock result with multiple emotions
    const result: SemanticEmotionResult = {
      joy: 0.8,
      sadness: 0.6,
      anger: 0.4,
      fear: 0.2,
      trust: 0.1,
      surprise: 0.1,
      disgust: 0.0,
      anticipation: 0.0,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    };

    // Test with max_actions = 2
    const actions2 = mapEmotionToActions(result, 2);
    expect(actions2.length).toBe(2);

    // Test with max_actions = 5
    const actions5 = mapEmotionToActions(result, 5);
    expect(actions5.length).toBe(5);

    // Test with default (3)
    const actionsDefault = mapEmotionToActions(result);
    expect(actionsDefault.length).toBe(3);
  });

  it('ACTION-03: returns emotions sorted by intensity (descending)', () => {
    // Mock result with clearly ordered intensities
    const result: SemanticEmotionResult = {
      joy: 0.1,       // Rank 4
      sadness: 0.8,   // Rank 1 (highest)
      anger: 0.6,     // Rank 2
      fear: 0.4,      // Rank 3
      trust: 0.05,
      surprise: 0.05,
      disgust: 0.0,
      anticipation: 0.0,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    };

    const actions = mapEmotionToActions(result, 4);

    // Verify correct order: sadness > anger > fear > joy
    expect(actions[0].emotion).toBe('sadness');
    expect(actions[0].intensity).toBe(0.8);

    expect(actions[1].emotion).toBe('anger');
    expect(actions[1].intensity).toBe(0.6);

    expect(actions[2].emotion).toBe('fear');
    expect(actions[2].intensity).toBe(0.4);

    expect(actions[3].emotion).toBe('joy');
    expect(actions[3].intensity).toBe(0.1);
  });

  it('ACTION-04: returns correct action descriptors for each emotion', () => {
    // Mock result with joy dominant
    const result: SemanticEmotionResult = {
      joy: 0.9,
      trust: 0.1,
      fear: 0.1,
      surprise: 0.1,
      sadness: 0.1,
      disgust: 0.0,
      anger: 0.0,
      anticipation: 0.0,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    };

    const actions = mapEmotionToActions(result, 1);

    expect(actions.length).toBe(1);
    expect(actions[0].emotion).toBe('joy');
    expect(actions[0].intensity).toBe(0.9);
    expect(actions[0].actions).toEqual(EMOTION_ACTION_MAP.joy);

    // Verify joy actions contain expected descriptors
    expect(actions[0].actions).toContain('posture ouverte');
    expect(actions[0].actions).toContain('mouvements amples');
  });

  it('ACTION-05: handles edge case with all emotions at zero', () => {
    // Mock result with all emotions at zero
    const result: SemanticEmotionResult = {
      joy: 0.0,
      trust: 0.0,
      fear: 0.0,
      surprise: 0.0,
      sadness: 0.0,
      disgust: 0.0,
      anger: 0.0,
      anticipation: 0.0,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    };

    const actions = mapEmotionToActions(result, 3);

    // Should still return 3 actions (lowest intensity emotions)
    expect(actions.length).toBe(3);
    expect(actions[0].intensity).toBe(0.0);
    expect(actions[1].intensity).toBe(0.0);
    expect(actions[2].intensity).toBe(0.0);
  });

  it('ACTION-06: each emotion has at least 5 action descriptors', () => {
    // Verify every emotion in the map has sufficient actions
    const emotions: Array<keyof SemanticEmotionResult> = [
      'joy', 'trust', 'fear', 'surprise', 'sadness',
      'disgust', 'anger', 'anticipation', 'love', 'submission',
      'awe', 'disapproval', 'remorse', 'contempt',
    ];

    for (const emotion of emotions) {
      expect(EMOTION_ACTION_MAP[emotion].length).toBeGreaterThanOrEqual(5);
    }
  });
});
