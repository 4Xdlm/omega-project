/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Scoring Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for multi-axis scoring:
 * - Actionability
 * - Context Fit
 * - Emotional Leverage
 * - Novelty
 * - Canon Safety
 * - Arc Alignment
 * 
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import {
  scoreSuggestion,
  rankSuggestions,
  filterSurvivors,
  SCORING_WEIGHTS,
  MIN_SCORE_TO_SURVIVE,
  MIN_CANON_SAFETY,
  MIN_ACTIONABILITY,
} from '../index';
import { createEmotionState } from '../../emotion_v2';
import type { Suggestion, NarrativeContext, Rationale, PhysicsCompliance } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createTestRationale(): Rationale {
  return {
    trigger: {
      emotions: ['fear'],
      intensities: [0.7],
    },
    constraint_check: 'Safe transition',
    mechanism: 'tension',
    expected_outcome: 'Increase fear intensity',
    minimal_draft: 'Alice reaches for the door handle, her hand trembling.',
  };
}

function createTestPhysics(): PhysicsCompliance {
  return {
    inertia_respected: true,
    gravity_score: 0.7,
    target_type: 'neutral',
    transition_valid: true,
    energy_required: 0.3,
  };
}

function createTestContext(): NarrativeContext {
  return {
    scene_id: 'test-001',
    scene_goal: 'Build tension',
    current_beat: 'Approach',
    characters: [
      {
        id: 'alice',
        name: 'Alice',
        agency_level: 'high',
        emotional_state: 'fear',
        beats_since_action: 1,
      },
    ],
    constraints: [],
    style_profile: {
      tone: 'dark',
      pacing: 'medium',
      genre: 'thriller',
      intensity_range: [0.4, 0.9],
    },
  };
}

function createTestSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 'test-suggestion-001',
    strategy: 'beat_next',
    content: 'Build tension through approaching danger. Scene: Build tension.',
    expected_shift: {
      from: 'fear',
      to: 'anticipation',
      intensity_delta: 0.1,
      transition_type: 'natural',
    },
    score: 0,
    confidence: 0.7,
    rationale: createTestRationale(),
    score_breakdown: {
      actionability: 0,
      context_fit: 0,
      emotional_leverage: 0,
      novelty: 0,
      canon_safety: 0,
      arc_alignment: 0,
    },
    physics: createTestPhysics(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING WEIGHTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring: Weights', () => {
  it('weights sum to 1.0', () => {
    const sum = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });
  
  it('actionability has highest weight', () => {
    expect(SCORING_WEIGHTS.actionability).toBeGreaterThanOrEqual(SCORING_WEIGHTS.context_fit);
    expect(SCORING_WEIGHTS.actionability).toBeGreaterThanOrEqual(SCORING_WEIGHTS.emotional_leverage);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE SUGGESTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring: scoreSuggestion', () => {
  it('returns score between 0 and 1', () => {
    const result = scoreSuggestion({
      content: 'Test suggestion with enough detail to be actionable.',
      rationale: createTestRationale(),
      targetCharacter: 'Alice',
      expectedShift: { from: 'fear', to: 'anticipation', intensity_delta: 0.1 },
      currentEmotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      physics: createTestPhysics(),
      existingSuggestions: [],
    });
    
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
  
  it('returns breakdown for all axes', () => {
    const result = scoreSuggestion({
      content: 'Detailed suggestion content for testing purposes.',
      rationale: createTestRationale(),
      expectedShift: { from: 'fear', to: 'anticipation', intensity_delta: 0.1 },
      currentEmotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      physics: createTestPhysics(),
      existingSuggestions: [],
    });
    
    expect(result.breakdown.actionability).toBeDefined();
    expect(result.breakdown.context_fit).toBeDefined();
    expect(result.breakdown.emotional_leverage).toBeDefined();
    expect(result.breakdown.novelty).toBeDefined();
    expect(result.breakdown.canon_safety).toBeDefined();
    expect(result.breakdown.arc_alignment).toBeDefined();
  });
  
  it('rejects low canon safety', () => {
    const result = scoreSuggestion({
      content: 'Dangerous suggestion.',
      rationale: createTestRationale(),
      expectedShift: { from: 'fear', to: 'joy', intensity_delta: 0.5 },
      currentEmotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      physics: {
        ...createTestPhysics(),
        transition_valid: false,
        inertia_respected: false,
        target_type: 'repulsor',
      },
      existingSuggestions: [],
    });
    
    // Should have lower score due to physics violations
    expect(result.breakdown.canon_safety).toBeLessThan(1);
  });
  
  it('penalizes short/vague content', () => {
    const shortResult = scoreSuggestion({
      content: 'Do thing.',
      rationale: { 
        ...createTestRationale(), 
        minimal_draft: 'x' 
      },
      expectedShift: { from: 'fear', to: 'anticipation', intensity_delta: 0.1 },
      currentEmotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      physics: createTestPhysics(),
      existingSuggestions: [],
    });
    
    const longResult = scoreSuggestion({
      content: 'Build tension through a slow, deliberate approach to the danger zone, heightening anticipation.',
      rationale: createTestRationale(),
      expectedShift: { from: 'fear', to: 'anticipation', intensity_delta: 0.1 },
      currentEmotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      physics: createTestPhysics(),
      existingSuggestions: [],
    });
    
    expect(longResult.breakdown.actionability).toBeGreaterThan(shortResult.breakdown.actionability);
  });
  
  it('reduces novelty for similar suggestions', () => {
    const existing = createTestSuggestion({
      content: 'Build tension through approaching danger.',
      rationale: { ...createTestRationale(), mechanism: 'tension' },
    });
    
    const result = scoreSuggestion({
      content: 'Build tension through approaching danger.',
      rationale: { ...createTestRationale(), mechanism: 'tension' },
      expectedShift: { from: 'fear', to: 'anticipation', intensity_delta: 0.1 },
      currentEmotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      physics: createTestPhysics(),
      existingSuggestions: [existing],
    });
    
    expect(result.breakdown.novelty).toBeLessThan(0.8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RANKING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring: rankSuggestions', () => {
  it('sorts by score descending', () => {
    const suggestions = [
      createTestSuggestion({ id: 'a', score: 0.5 }),
      createTestSuggestion({ id: 'b', score: 0.8 }),
      createTestSuggestion({ id: 'c', score: 0.3 }),
    ];
    
    const ranked = rankSuggestions(suggestions);
    
    expect(ranked[0].id).toBe('b');
    expect(ranked[1].id).toBe('a');
    expect(ranked[2].id).toBe('c');
  });
  
  it('uses ID as tie-breaker for stable sort', () => {
    const suggestions = [
      createTestSuggestion({ id: 'b', score: 0.7 }),
      createTestSuggestion({ id: 'a', score: 0.7 }),
      createTestSuggestion({ id: 'c', score: 0.7 }),
    ];
    
    const ranked1 = rankSuggestions(suggestions);
    const ranked2 = rankSuggestions([...suggestions].reverse());
    
    // Should be deterministic
    expect(ranked1.map(s => s.id)).toEqual(ranked2.map(s => s.id));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILTERING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Scoring: filterSurvivors', () => {
  it('filters out low scores', () => {
    const results = [
      {
        suggestion: createTestSuggestion({ id: 'high' }),
        result: {
          score: 0.8,
          confidence: 0.7,
          breakdown: {
            actionability: 0.8,
            context_fit: 0.8,
            emotional_leverage: 0.8,
            novelty: 0.8,
            canon_safety: 0.8,
            arc_alignment: 0.8,
          },
          survives: true,
        },
      },
      {
        suggestion: createTestSuggestion({ id: 'low' }),
        result: {
          score: 0.4,
          confidence: 0.5,
          breakdown: {
            actionability: 0.4,
            context_fit: 0.4,
            emotional_leverage: 0.4,
            novelty: 0.4,
            canon_safety: 0.4,
            arc_alignment: 0.4,
          },
          survives: false,
          rejectionReason: 'Score too low',
        },
      },
    ];
    
    const { survivors, rejections } = filterSurvivors(results);
    
    expect(survivors.length).toBe(1);
    expect(survivors[0].id).toBe('high');
    expect(rejections.length).toBe(1);
    expect(rejections[0].suggestion.id).toBe('low');
  });
});
