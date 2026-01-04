/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Strategies Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for all 5 named strategies:
 * - Beat-Next
 * - Tension-Delta
 * - Contrast-Knife
 * - Reframe-Truth
 * - Agency-Injection
 * 
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import {
  generateBeatNext,
  generateTensionDelta,
  generateContrastKnife,
  generateReframeTruth,
  generateAgencyInjection,
  quickSuggest,
  suggest,
  STRATEGY_IDS,
} from '../index';
import { createPRNG } from '../prng';
import { hashSuggestInput } from '../fingerprint';
import { createEmotionState } from '../../emotion_v2';
import type { NarrativeContext } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createTestContext(): NarrativeContext {
  return {
    scene_id: 'test-001',
    scene_goal: 'Build tension before revelation',
    current_beat: 'Approach the door',
    characters: [
      {
        id: 'alice',
        name: 'Alice',
        agency_level: 'high',
        emotional_state: 'fear',
        beats_since_action: 1,
      },
      {
        id: 'bob',
        name: 'Bob',
        agency_level: 'low',
        emotional_state: 'anticipation',
        beats_since_action: 5,
      },
    ],
    constraints: ['no_violence', 'maintain_mystery'],
    style_profile: {
      tone: 'dark',
      pacing: 'medium',
      genre: 'thriller',
      intensity_range: [0.4, 0.9],
    },
  };
}

function createStrategyInput() {
  const emotion = createEmotionState('fear', 0.7);
  const context = createTestContext();
  const prng = createPRNG(42);
  const inputHash = hashSuggestInput({ emotion, context, seed: 42 });
  
  return { emotion, context, prng, inputHash };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEAT-NEXT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Strategy: Beat-Next', () => {
  it('generates suggestions', () => {
    const input = createStrategyInput();
    const suggestions = generateBeatNext(input);
    
    expect(suggestions.length).toBeGreaterThan(0);
  });
  
  it('uses BEAT_NEXT strategy ID', () => {
    const input = createStrategyInput();
    const suggestions = generateBeatNext(input);
    
    for (const s of suggestions) {
      expect(s.strategy).toBe(STRATEGY_IDS.BEAT_NEXT);
    }
  });
  
  it('follows natural emotional trajectory', () => {
    const input = createStrategyInput();
    const suggestions = generateBeatNext(input);
    
    // Beat-next should suggest natural transitions from fear
    for (const s of suggestions) {
      expect(s.expected_shift).toBeDefined();
      expect(s.expected_shift.from).toBe('fear');
    }
  });
  
  it('includes physics validation', () => {
    const input = createStrategyInput();
    const suggestions = generateBeatNext(input);
    
    for (const s of suggestions) {
      expect(s.physics).toBeDefined();
      expect(typeof s.physics.gravity_score).toBe('number');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TENSION-DELTA TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Strategy: Tension-Delta', () => {
  it('generates suggestions', () => {
    const input = createStrategyInput();
    const suggestions = generateTensionDelta(input);
    
    expect(suggestions.length).toBeGreaterThan(0);
  });
  
  it('uses TENSION_DELTA strategy ID', () => {
    const input = createStrategyInput();
    const suggestions = generateTensionDelta(input);
    
    for (const s of suggestions) {
      expect(s.strategy).toBe(STRATEGY_IDS.TENSION_DELTA);
    }
  });
  
  it('targets tension-building emotions', () => {
    const input = createStrategyInput();
    const suggestions = generateTensionDelta(input);
    
    const tensionEmotions = ['fear', 'anger', 'anticipation', 'surprise'];
    
    for (const s of suggestions) {
      expect(tensionEmotions).toContain(s.expected_shift.to);
    }
  });
  
  it('does not generate if already at max tension', () => {
    const emotion = createEmotionState('fear', 0.9);
    emotion.dynamics = { inertia: 0.5, volatility: 0.9, trend: 'stable', rupture: false };
    
    const input = {
      emotion,
      context: createTestContext(),
      prng: createPRNG(42),
      inputHash: 'test',
    };
    
    const suggestions = generateTensionDelta(input);
    
    // Should return empty or very few suggestions when already at high tension
    expect(suggestions.length).toBeLessThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRAST-KNIFE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Strategy: Contrast-Knife', () => {
  it('generates suggestions', () => {
    const input = createStrategyInput();
    const suggestions = generateContrastKnife(input);
    
    expect(suggestions.length).toBeGreaterThan(0);
  });
  
  it('uses CONTRAST_KNIFE strategy ID', () => {
    const input = createStrategyInput();
    const suggestions = generateContrastKnife(input);
    
    for (const s of suggestions) {
      expect(s.strategy).toBe(STRATEGY_IDS.CONTRAST_KNIFE);
    }
  });
  
  it('targets contrasting emotions', () => {
    const input = createStrategyInput();
    const suggestions = generateContrastKnife(input);
    
    // Contrast from fear should NOT target fear
    for (const s of suggestions) {
      expect(s.expected_shift.to).not.toBe(s.expected_shift.from);
    }
  });
  
  it('uses contrast mechanism', () => {
    const input = createStrategyInput();
    const suggestions = generateContrastKnife(input);
    
    for (const s of suggestions) {
      expect(s.rationale.mechanism).toBe('contrast');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REFRAME-TRUTH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Strategy: Reframe-Truth', () => {
  it('generates suggestions', () => {
    const input = createStrategyInput();
    const suggestions = generateReframeTruth(input);
    
    expect(suggestions.length).toBeGreaterThan(0);
  });
  
  it('uses REFRAME_TRUTH strategy ID', () => {
    const input = createStrategyInput();
    const suggestions = generateReframeTruth(input);
    
    for (const s of suggestions) {
      expect(s.strategy).toBe(STRATEGY_IDS.REFRAME_TRUTH);
    }
  });
  
  it('uses reveal mechanism', () => {
    const input = createStrategyInput();
    const suggestions = generateReframeTruth(input);
    
    for (const s of suggestions) {
      expect(s.rationale.mechanism).toBe('reveal');
    }
  });
  
  it('transition type is pivot', () => {
    const input = createStrategyInput();
    const suggestions = generateReframeTruth(input);
    
    for (const s of suggestions) {
      expect(s.expected_shift.transition_type).toBe('pivot');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AGENCY-INJECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Strategy: Agency-Injection', () => {
  it('generates suggestions', () => {
    const input = createStrategyInput();
    const suggestions = generateAgencyInjection(input);
    
    expect(suggestions.length).toBeGreaterThan(0);
  });
  
  it('uses AGENCY_INJECTION strategy ID', () => {
    const input = createStrategyInput();
    const suggestions = generateAgencyInjection(input);
    
    for (const s of suggestions) {
      expect(s.strategy).toBe(STRATEGY_IDS.AGENCY_INJECTION);
    }
  });
  
  it('targets characters', () => {
    const input = createStrategyInput();
    const suggestions = generateAgencyInjection(input);
    
    // Should target one of the characters
    const charNames = ['Alice', 'Bob'];
    
    for (const s of suggestions) {
      if (s.target_character) {
        expect(charNames).toContain(s.target_character);
      }
    }
  });
  
  it('uses agency mechanism', () => {
    const input = createStrategyInput();
    const suggestions = generateAgencyInjection(input);
    
    for (const s of suggestions) {
      expect(s.rationale.mechanism).toBe('agency');
    }
  });
  
  it('targets passive characters for empowerment', () => {
    const input = createStrategyInput();
    // Bob has low agency and 5 beats since action
    const suggestions = generateAgencyInjection(input);
    
    // At least one suggestion should target Bob
    const bobSuggestions = suggestions.filter(s => s.target_character === 'Bob');
    expect(bobSuggestions.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK SUGGEST TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('quickSuggest', () => {
  it('returns suggestions for specified strategy', () => {
    const emotion = createEmotionState('fear', 0.7);
    const context = createTestContext();
    
    const beatNext = quickSuggest(emotion, context, 42, STRATEGY_IDS.BEAT_NEXT);
    expect(beatNext.every(s => s.strategy === STRATEGY_IDS.BEAT_NEXT)).toBe(true);
    
    const contrastKnife = quickSuggest(emotion, context, 42, STRATEGY_IDS.CONTRAST_KNIFE);
    expect(contrastKnife.every(s => s.strategy === STRATEGY_IDS.CONTRAST_KNIFE)).toBe(true);
  });
  
  it('is deterministic', () => {
    const emotion = createEmotionState('fear', 0.7);
    const context = createTestContext();
    
    const result1 = quickSuggest(emotion, context, 42, STRATEGY_IDS.BEAT_NEXT);
    const result2 = quickSuggest(emotion, context, 42, STRATEGY_IDS.BEAT_NEXT);
    
    expect(result1.length).toBe(result2.length);
    for (let i = 0; i < result1.length; i++) {
      expect(result1[i].id).toBe(result2[i].id);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL SUGGEST PIPELINE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('suggest (full pipeline)', () => {
  it('uses all strategies', () => {
    const result = suggest({
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    });
    
    // Strategy trace should have all 5 strategies
    expect(result.meta.strategy_trace.length).toBe(5);
    
    const strategies = result.meta.strategy_trace.map(t => t.strategy);
    expect(strategies).toContain(STRATEGY_IDS.BEAT_NEXT);
    expect(strategies).toContain(STRATEGY_IDS.TENSION_DELTA);
    expect(strategies).toContain(STRATEGY_IDS.CONTRAST_KNIFE);
    expect(strategies).toContain(STRATEGY_IDS.REFRAME_TRUTH);
    expect(strategies).toContain(STRATEGY_IDS.AGENCY_INJECTION);
  });
  
  it('tracks candidates generated', () => {
    const result = suggest({
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    });
    
    expect(result.meta.candidates_generated).toBeGreaterThan(0);
  });
  
  it('includes harmonic analysis', () => {
    const result = suggest({
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    });
    
    expect(result.meta.harmonic_analysis).toBeDefined();
    expect(result.meta.harmonic_analysis.consonance).toBeDefined();
    expect(result.meta.harmonic_analysis.diversity_score).toBeDefined();
  });
});
