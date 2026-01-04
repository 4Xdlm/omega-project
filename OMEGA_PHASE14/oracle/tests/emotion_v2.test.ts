/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Emotion v2 Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for Emotion Model v2 schema and validation.
 * 
 * Total: 12 tests
 * 
 * @module oracle/tests/emotion_v2.test
 * @version 3.14.0
 */

import { describe, it, expect } from 'vitest';
import {
  EMOTION_V2_VERSION,
  EMOTION_LABELS,
  EMOTION_FAMILIES,
  EMOTION_TO_FAMILY,
  calculateAmbiguity,
  validateEmotionStateV2,
  toLegacyPlutchik,
  createNeutralState,
  EmotionValidationError,
} from '../emotion_v2.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function validState(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    schema_version: EMOTION_V2_VERSION,
    trace_id: 'test-1',
    created_at_ms: 1000,
    signals: [{
      channel: 'semantic',
      valence: -0.3,
      arousal: 0.6,
      confidence: 0.8,
    }],
    appraisal: {
      emotions: [{
        label: 'fear',
        family: 'fear_family',
        weight: 0.7,
        polarity: -1,
      }, {
        label: 'anger',
        family: 'anger_family',
        weight: 0.3,
        polarity: -1,
      }],
      dominant: 'fear',
      ambiguity: 0, // delta=0.4 → ambiguity=0
      valence_aggregate: -0.3,
      arousal_aggregate: 0.6,
    },
    model: {
      provider_id: 'test-provider',
      model_name: 'test-model',
      latency_ms: 100,
    },
    rationale: 'Test rationale',
    input_hash: 'ABC123',
    cached: false,
    calibrated: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Constants (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Emotion v2 Constants', () => {
  it('has 14 emotion labels', () => {
    expect(EMOTION_LABELS).toHaveLength(14);
    expect(EMOTION_LABELS).toContain('joy');
    expect(EMOTION_LABELS).toContain('love');
    expect(EMOTION_LABELS).toContain('shame');
  });
  
  it('maps all emotions to families', () => {
    for (const emotion of EMOTION_LABELS) {
      expect(EMOTION_TO_FAMILY[emotion]).toBeDefined();
      expect(EMOTION_FAMILIES).toContain(EMOTION_TO_FAMILY[emotion]);
    }
  });
  
  it('version is 2.0.0', () => {
    expect(EMOTION_V2_VERSION).toBe('2.0.0');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: Ambiguity Calculation (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Ambiguity Calculation', () => {
  it('returns 0 for single emotion', () => {
    expect(calculateAmbiguity([1])).toBe(0);
    expect(calculateAmbiguity([0.5])).toBe(0);
  });
  
  it('returns 1 for equal weights', () => {
    expect(calculateAmbiguity([0.5, 0.5])).toBe(1);
    expect(calculateAmbiguity([0.3, 0.3, 0.3])).toBe(1);
  });
  
  it('returns intermediate values for different weights', () => {
    // delta=0.4 → ambiguity=0
    expect(calculateAmbiguity([0.8, 0.4])).toBe(0);
    // delta=0.2 → ambiguity=0.5
    expect(calculateAmbiguity([0.7, 0.5])).toBe(0.5);
    // delta=0.1 → ambiguity=0.75
    expect(calculateAmbiguity([0.6, 0.5])).toBe(0.75);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: Validation - Valid cases (2 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Validation - Valid cases', () => {
  it('accepts valid EmotionStateV2', () => {
    const state = validState();
    const result = validateEmotionStateV2(state);
    expect(result.trace_id).toBe('test-1');
    expect(result.appraisal.dominant).toBe('fear');
  });
  
  it('accepts state with optional layers', () => {
    const state = validState({
      dynamics: {
        inertia: 0.5,
        volatility: 0.3,
        trend: 'stable',
        rupture: false,
      },
      narrative_role: {
        function: 'tension',
        scope: 'scene',
        intentionality: 'conscious',
        weight: 0.7,
      },
      legacy_plutchik: {
        primary: 'fear',
        intensity: 0.7,
      },
    });
    
    const result = validateEmotionStateV2(state);
    expect(result.dynamics).toBeDefined();
    expect(result.narrative_role).toBeDefined();
    expect(result.legacy_plutchik).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: Validation - Invalid cases (4 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Validation - Invalid cases', () => {
  it('rejects wrong schema version', () => {
    const state = validState({ schema_version: '1.0.0' });
    expect(() => validateEmotionStateV2(state)).toThrow(EmotionValidationError);
  });
  
  it('rejects empty signals', () => {
    const state = validState({ signals: [] });
    expect(() => validateEmotionStateV2(state)).toThrow(/signals/);
  });
  
  it('rejects unsorted emotions', () => {
    const state = validState({
      appraisal: {
        emotions: [
          { label: 'fear', family: 'fear_family', weight: 0.3, polarity: -1 },
          { label: 'anger', family: 'anger_family', weight: 0.7, polarity: -1 },
        ],
        dominant: 'fear',
        ambiguity: 0.5,
        valence_aggregate: -0.3,
        arousal_aggregate: 0.6,
      },
    });
    expect(() => validateEmotionStateV2(state)).toThrow(/sorted/);
  });
  
  it('rejects invalid emotion label', () => {
    const state = validState({
      appraisal: {
        emotions: [
          { label: 'unknown_emotion', family: 'fear_family', weight: 1, polarity: -1 },
        ],
        dominant: 'fear',
        ambiguity: 0,
        valence_aggregate: -0.3,
        arousal_aggregate: 0.6,
      },
    });
    expect(() => validateEmotionStateV2(state)).toThrow(/label/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Utilities (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Utilities', () => {
  it('toLegacyPlutchik maps extended emotions', () => {
    const state = validateEmotionStateV2(validState({
      appraisal: {
        emotions: [
          { label: 'love', family: 'joy_family', weight: 1, polarity: 1 },
        ],
        dominant: 'love',
        ambiguity: 0,
        valence_aggregate: 0.5,
        arousal_aggregate: 0.6,
      },
    }));
    
    const legacy = toLegacyPlutchik(state);
    expect(legacy.primary).toBe('joy'); // love → joy
    expect(legacy.intensity).toBe(1);
  });
  
  it('createNeutralState creates valid fallback', () => {
    const neutral = createNeutralState({
      trace_id: 'fallback-1',
      created_at_ms: 1000,
      input_hash: 'HASH',
      provider_id: 'test',
      reason: 'Test error',
    });
    
    expect(neutral.appraisal.dominant).toBe('anticipation');
    expect(neutral.appraisal.ambiguity).toBe(0); // Single emotion
    expect(neutral.rationale).toContain('Neutral fallback');
    
    // Should pass validation
    expect(() => validateEmotionStateV2(neutral)).not.toThrow();
  });
  
  it('neutral state has low confidence', () => {
    const neutral = createNeutralState({
      trace_id: 't',
      created_at_ms: 0,
      input_hash: 'h',
      provider_id: 'p',
      reason: 'r',
    });
    
    expect(neutral.signals[0].confidence).toBeLessThan(0.5);
  });
});
