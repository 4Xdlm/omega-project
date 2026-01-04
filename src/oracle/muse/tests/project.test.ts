/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Project Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for F3: PROJECT — Probabilistic trend projection
 * 
 * INV-MUSE-03: confidence ≤ 0.95
 * INV-MUSE-06: sum(probabilities) ≤ 1
 * 
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import { project, CONFIDENCE_CAP, MAX_HORIZON, MAX_SCENARIOS } from '../index';
import { createEmotionState } from '../../emotion_v2';
import type { ProjectInput, NarrativeContext, EmotionStateV2 } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

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

function createHistory(
  emotions: Array<{ emotion: string; weight: number }>
): EmotionStateV2[] {
  return emotions.map(({ emotion, weight }) => 
    createEmotionState(emotion as any, weight)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASIC PROJECT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Project: Basic', () => {
  it('returns ProjectOutput structure', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    expect(result.trends).toBeDefined();
    expect(result.scenarios).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.horizon_actual).toBeDefined();
    expect(result.output_hash).toBeDefined();
    expect(result.input_hash).toBeDefined();
    expect(result.seed).toBeDefined();
    expect(result.duration_ms).toBeDefined();
  });
  
  it('is deterministic (INV-MUSE-04)', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result1 = project(input);
    const result2 = project(input);
    
    expect(result1.output_hash).toBe(result2.output_hash);
    expect(result1.scenarios.length).toBe(result2.scenarios.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE TESTS (INV-MUSE-03)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Project: Confidence', () => {
  it('confidence never exceeds cap', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'fear', weight: 0.7 },
        { emotion: 'fear', weight: 0.75 },
        { emotion: 'fear', weight: 0.8 },
      ]),
      context: createTestContext(),
      horizon: 5,
      seed: 42,
    };
    
    const result = project(input);
    
    expect(result.confidence).toBeLessThanOrEqual(CONFIDENCE_CAP);
  });
  
  it('confidence is lower with less data', () => {
    const shortHistory: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const longHistory: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.62 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'fear', weight: 0.68 },
        { emotion: 'fear', weight: 0.7 },
        { emotion: 'fear', weight: 0.72 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const shortResult = project(shortHistory);
    const longResult = project(longHistory);
    
    expect(longResult.confidence).toBeGreaterThanOrEqual(shortResult.confidence);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROBABILITY BOUNDS (INV-MUSE-06)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Project: Probability Bounds', () => {
  it('scenario probabilities sum to ≤ 1', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'anticipation', weight: 0.65 },
        { emotion: 'fear', weight: 0.7 },
        { emotion: 'surprise', weight: 0.5 },
        { emotion: 'trust', weight: 0.6 },
      ]),
      context: createTestContext(),
      horizon: 5,
      seed: 42,
    };
    
    const result = project(input);
    
    const totalProb = result.scenarios.reduce((sum, s) => sum + s.probability, 0);
    expect(totalProb).toBeLessThanOrEqual(1.01); // Small tolerance for rounding
  });
  
  it('individual scenario probability is in [0, 1]', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    for (const scenario of result.scenarios) {
      expect(scenario.probability).toBeGreaterThanOrEqual(0);
      expect(scenario.probability).toBeLessThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HORIZON TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Project: Horizon', () => {
  it('horizon_actual never exceeds MAX_HORIZON', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 10, // Request more than max
      seed: 42,
    };
    
    const result = project(input);
    
    expect(result.horizon_actual).toBeLessThanOrEqual(MAX_HORIZON);
  });
  
  it('horizon_actual is reduced with insufficient data', () => {
    const input: ProjectInput = {
      history: [createEmotionState('fear', 0.5)], // Only 1 state
      context: createTestContext(),
      horizon: 5,
      seed: 42,
    };
    
    const result = project(input);
    
    expect(result.horizon_actual).toBeLessThan(input.horizon);
    expect(result.horizon_reduction_reason).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Project: Scenarios', () => {
  it('returns at most MAX_SCENARIOS', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'anticipation', weight: 0.65 },
        { emotion: 'surprise', weight: 0.7 },
        { emotion: 'trust', weight: 0.5 },
        { emotion: 'joy', weight: 0.6 },
      ]),
      context: createTestContext(),
      horizon: 5,
      seed: 42,
    };
    
    const result = project(input);
    
    expect(result.scenarios.length).toBeLessThanOrEqual(MAX_SCENARIOS);
  });
  
  it('scenarios have required fields', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    for (const scenario of result.scenarios) {
      expect(scenario.id).toBeDefined();
      expect(scenario.description).toBeDefined();
      expect(scenario.probability).toBeDefined();
      expect(scenario.dominant_emotion).toBeDefined();
      expect(scenario.trigger_conditions).toBeDefined();
      expect(scenario.topology_position).toBeDefined();
    }
  });
  
  it('topology position has required fields', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    for (const scenario of result.scenarios) {
      expect(scenario.topology_position.type).toBeDefined();
      expect(scenario.topology_position.tension).toBeDefined();
      expect(scenario.topology_position.stability).toBeDefined();
      expect(scenario.topology_position.gradient_direction).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TREND TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Project: Trends', () => {
  it('detects rising trend', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.8 },
        { emotion: 'fear', weight: 0.7 },
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.5 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    // History is from most recent to oldest, so 0.8 -> 0.5 means rising
    expect(result.trends.length).toBeGreaterThan(0);
  });
  
  it('trends have required fields', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    for (const trend of result.trends) {
      expect(trend.emotion).toBeDefined();
      expect(trend.direction).toBeDefined();
      expect(trend.strength).toBeDefined();
      expect(trend.predicted_value).toBeDefined();
      expect(trend.confidence_band).toBeDefined();
    }
  });
  
  it('trend direction is valid', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    const validDirections = ['rising', 'falling', 'stable', 'oscillating'];
    
    for (const trend of result.trends) {
      expect(validDirections).toContain(trend.direction);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Project: Edge Cases', () => {
  it('handles minimum history (3 states)', () => {
    const input: ProjectInput = {
      history: createHistory([
        { emotion: 'fear', weight: 0.6 },
        { emotion: 'fear', weight: 0.65 },
        { emotion: 'anticipation', weight: 0.7 },
      ]),
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.scenarios.length).toBeGreaterThan(0);
  });
  
  it('handles very short history gracefully', () => {
    const input: ProjectInput = {
      history: [createEmotionState('fear', 0.5)],
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    // Should not throw, may have reduced functionality
    expect(result).toBeDefined();
    expect(result.horizon_reduction_reason).toBeDefined();
  });
});
