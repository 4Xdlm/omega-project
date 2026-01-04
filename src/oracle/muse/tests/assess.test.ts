/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Assess Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for F2: ASSESS — Risk detection
 * 
 * Risk types tested:
 * - repetition_loop
 * - emotional_flatline
 * - arc_incoherence
 * - tone_drift
 * - stakes_mismatch
 * - character_agency_loss
 * - overheat
 * 
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import { assess, RISK_TYPES, CONFIDENCE_CAP } from '../index';
import { createEmotionState } from '../../emotion_v2';
import type { AssessInput, NarrativeArc, StyleProfile, EmotionStateV2 } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createTestArc(overrides: Partial<NarrativeArc> = {}): NarrativeArc {
  return {
    id: 'arc-001',
    type: 'rise',
    target_emotion: 'fear',
    progress: 0.5,
    expected_tension: 0.6,
    stakes: 'high',
    ...overrides,
  };
}

function createStyleProfile(overrides: Partial<StyleProfile> = {}): StyleProfile {
  return {
    tone: 'dark',
    pacing: 'medium',
    genre: 'thriller',
    intensity_range: [0.4, 0.9],
    ...overrides,
  };
}

function createHistory(emotion: string, count: number, weight: number = 0.7): EmotionStateV2[] {
  return Array.from({ length: count }, (_, i) => 
    createEmotionState(emotion as any, weight)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASIC ASSESS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assess: Basic', () => {
  it('returns AssessOutput structure', () => {
    const input: AssessInput = {
      current: createEmotionState('fear', 0.7),
      history: createHistory('anticipation', 3),
      arc: createTestArc(),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    expect(result.risks).toBeDefined();
    expect(Array.isArray(result.risks)).toBe(true);
    expect(result.health_score).toBeDefined();
    expect(result.output_hash).toBeDefined();
    expect(result.input_hash).toBeDefined();
    expect(result.duration_ms).toBeDefined();
  });
  
  it('health score is between 0 and 1', () => {
    const input: AssessInput = {
      current: createEmotionState('fear', 0.7),
      history: createHistory('fear', 3),
      arc: createTestArc(),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    expect(result.health_score).toBeGreaterThanOrEqual(0);
    expect(result.health_score).toBeLessThanOrEqual(1);
  });
  
  it('risks have required fields', () => {
    const input: AssessInput = {
      current: createEmotionState('sadness', 0.7),
      history: createHistory('sadness', 5),
      arc: createTestArc(),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    for (const risk of result.risks) {
      expect(risk.id).toBeDefined();
      expect(risk.type).toBeDefined();
      expect(risk.severity).toBeDefined();
      expect(risk.description).toBeDefined();
      expect(risk.evidence).toBeDefined();
      expect(risk.impact).toBeDefined();
      expect(risk.remediation).toBeDefined();
      expect(risk.priority).toBeDefined();
      expect(risk.confidence).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPETITION LOOP DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assess: Repetition Loop', () => {
  it('detects same emotion for 4+ consecutive states', () => {
    const input: AssessInput = {
      current: createEmotionState('sadness', 0.7),
      history: [
        createEmotionState('sadness', 0.7),
        createEmotionState('sadness', 0.7),
        createEmotionState('sadness', 0.7),
        createEmotionState('sadness', 0.7),
      ],
      arc: createTestArc(),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    const repetitionRisk = result.risks.find(r => r.type === RISK_TYPES.REPETITION_LOOP);
    expect(repetitionRisk).toBeDefined();
  });
  
  it('does not detect for varied emotions', () => {
    const input: AssessInput = {
      current: createEmotionState('fear', 0.7),
      history: [
        createEmotionState('anticipation', 0.6),
        createEmotionState('joy', 0.5),
        createEmotionState('sadness', 0.7),
      ],
      arc: createTestArc(),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    const repetitionRisk = result.risks.find(r => r.type === RISK_TYPES.REPETITION_LOOP);
    expect(repetitionRisk).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTIONAL FLATLINE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assess: Emotional Flatline', () => {
  it('detects very low intensity variance', () => {
    const input: AssessInput = {
      current: createEmotionState('fear', 0.5),
      history: [
        createEmotionState('fear', 0.5),
        createEmotionState('anticipation', 0.5),
        createEmotionState('trust', 0.5),
        createEmotionState('joy', 0.5),
        createEmotionState('sadness', 0.5),
      ],
      arc: createTestArc(),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    const flatlineRisk = result.risks.find(r => r.type === RISK_TYPES.EMOTIONAL_FLATLINE);
    expect(flatlineRisk).toBeDefined();
  });
  
  it('does not detect for varied intensities', () => {
    const input: AssessInput = {
      current: createEmotionState('fear', 0.9),
      history: [
        createEmotionState('fear', 0.3),
        createEmotionState('anticipation', 0.7),
        createEmotionState('trust', 0.4),
        createEmotionState('joy', 0.8),
      ],
      arc: createTestArc(),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    const flatlineRisk = result.risks.find(r => r.type === RISK_TYPES.EMOTIONAL_FLATLINE);
    expect(flatlineRisk).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ARC INCOHERENCE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assess: Arc Incoherence', () => {
  it('detects emotion mismatch late in arc', () => {
    const input: AssessInput = {
      current: createEmotionState('joy', 0.8),
      history: createHistory('joy', 3),
      arc: createTestArc({
        target_emotion: 'fear',
        progress: 0.9, // Late in arc
      }),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    const arcRisk = result.risks.find(r => r.type === RISK_TYPES.ARC_INCOHERENCE);
    expect(arcRisk).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TONE DRIFT DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assess: Tone Drift', () => {
  it('detects light emotion in dark tone', () => {
    const input: AssessInput = {
      current: createEmotionState('joy', 0.9),
      history: createHistory('joy', 3, 0.9),
      arc: createTestArc(),
      style_profile: createStyleProfile({ tone: 'dark' }),
    };
    
    const result = assess(input);
    
    const toneRisk = result.risks.find(r => r.type === RISK_TYPES.TONE_DRIFT);
    expect(toneRisk).toBeDefined();
  });
  
  it('detects dark emotion in light tone', () => {
    const input: AssessInput = {
      current: createEmotionState('fear', 0.9),
      history: createHistory('fear', 3, 0.9),
      arc: createTestArc(),
      style_profile: createStyleProfile({ tone: 'light' }),
    };
    
    const result = assess(input);
    
    const toneRisk = result.risks.find(r => r.type === RISK_TYPES.TONE_DRIFT);
    expect(toneRisk).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAKES MISMATCH DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assess: Stakes Mismatch', () => {
  it('detects low tension with high stakes', () => {
    const state = createEmotionState('trust', 0.5);
    state.dynamics = { inertia: 0.5, volatility: 0.2, trend: 'stable', rupture: false };
    
    const input: AssessInput = {
      current: state,
      history: createHistory('trust', 3),
      arc: createTestArc({ stakes: 'critical' }),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    const stakesRisk = result.risks.find(r => r.type === RISK_TYPES.STAKES_MISMATCH);
    expect(stakesRisk).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OVERHEAT DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assess: Overheat', () => {
  it('detects high tension early in arc', () => {
    const state = createEmotionState('fear', 0.9);
    state.dynamics = { inertia: 0.5, volatility: 0.9, trend: 'rising', rupture: false };
    
    const input: AssessInput = {
      current: state,
      history: createHistory('fear', 3, 0.9),
      arc: createTestArc({ progress: 0.2 }), // Early
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    const overheatRisk = result.risks.find(r => r.type === RISK_TYPES.OVERHEAT);
    expect(overheatRisk).toBeDefined();
  });
  
  it('does not detect high tension late in arc', () => {
    const state = createEmotionState('fear', 0.9);
    state.dynamics = { inertia: 0.5, volatility: 0.9, trend: 'rising', rupture: false };
    
    const input: AssessInput = {
      current: state,
      history: createHistory('fear', 3, 0.9),
      arc: createTestArc({ progress: 0.85 }), // Late - expected
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    const overheatRisk = result.risks.find(r => r.type === RISK_TYPES.OVERHEAT);
    expect(overheatRisk).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REMEDIATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assess: Remediation', () => {
  it('all risks have non-empty remediation (INV-MUSE-05)', () => {
    const input: AssessInput = {
      current: createEmotionState('sadness', 0.7),
      history: createHistory('sadness', 6),
      arc: createTestArc({ progress: 0.9, target_emotion: 'joy' }),
      style_profile: createStyleProfile({ tone: 'light' }),
    };
    
    const result = assess(input);
    
    for (const risk of result.risks) {
      expect(risk.remediation).toBeDefined();
      expect(risk.remediation.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assess: Confidence', () => {
  it('risk confidence never exceeds cap (INV-MUSE-03)', () => {
    const input: AssessInput = {
      current: createEmotionState('sadness', 0.7),
      history: createHistory('sadness', 10),
      arc: createTestArc(),
      style_profile: createStyleProfile(),
    };
    
    const result = assess(input);
    
    for (const risk of result.risks) {
      expect(risk.confidence).toBeLessThanOrEqual(CONFIDENCE_CAP);
    }
  });
});
