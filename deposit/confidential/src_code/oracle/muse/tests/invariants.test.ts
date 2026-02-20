/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Invariants Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * INV-MUSE-01: Justification obligatoire (rationale.minimal_draft)
 * INV-MUSE-02: Limite suggestions (1-5)
 * INV-MUSE-03: Probabilités only (confidence ≤ 0.95)
 * INV-MUSE-04: Reproductibilité (même input+seed = même output)
 * INV-MUSE-05: Risques actionnables (remediation non null)
 * INV-MUSE-06: Projection bornée (sum probs ≤ 1)
 * INV-MUSE-07: Audit complet
 * INV-MUSE-08: Dépendance ORACLE (input V2 validé)
 * INV-MUSE-09: Diversité (distance ≥ 0.35)
 * INV-MUSE-10: Types variés (≥ 2 types différents)
 * INV-MUSE-11: Physics-compliant (transitions valides)
 * INV-MUSE-12: Harmonic-coherent (consonance ≥ seuil)
 * 
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import {
  createMuseEngine,
  suggest,
  assess,
  project,
  calculateDistance,
  DIVERSITY_MIN_DISTANCE,
  MIN_SUGGESTIONS,
  MAX_SUGGESTIONS,
  CONFIDENCE_CAP,
} from '../index';
import { createEmotionState, createNeutralState } from '../../emotion_v2';
import type { SuggestInput, AssessInput, ProjectInput, NarrativeContext, NarrativeArc, StyleProfile } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createTestContext(): NarrativeContext {
  return {
    scene_id: 'test-scene-001',
    scene_goal: 'Build tension before the revelation',
    current_beat: 'Character approaches the door',
    characters: [
      {
        id: 'char-001',
        name: 'Alice',
        agency_level: 'high',
        emotional_state: 'anticipation',
        beats_since_action: 1,
      },
      {
        id: 'char-002',
        name: 'Bob',
        agency_level: 'low',
        emotional_state: 'fear',
        beats_since_action: 4,
      },
    ],
    constraints: ['no_character_death', 'maintain_mystery'],
    style_profile: {
      tone: 'dark',
      pacing: 'medium',
      genre: 'thriller',
      intensity_range: [0.4, 0.9],
    },
  };
}

function createTestArc(): NarrativeArc {
  return {
    id: 'arc-001',
    type: 'rise',
    target_emotion: 'fear',
    progress: 0.5,
    expected_tension: 0.6,
    stakes: 'high',
  };
}

function createTestStyleProfile(): StyleProfile {
  return {
    tone: 'dark',
    pacing: 'medium',
    genre: 'thriller',
    intensity_range: [0.4, 0.9],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-01: Justification obligatoire
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-01: Justification obligatoire', () => {
  it('every suggestion has rationale.minimal_draft', () => {
    const input: SuggestInput = {
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    };
    
    const result = suggest(input);
    
    for (const suggestion of result.suggestions) {
      expect(suggestion.rationale).toBeDefined();
      expect(suggestion.rationale.minimal_draft).toBeDefined();
      expect(suggestion.rationale.minimal_draft.length).toBeGreaterThan(0);
    }
  });
  
  it('rationale has all required fields', () => {
    const input: SuggestInput = {
      emotion: createEmotionState('anger', 0.8),
      context: createTestContext(),
      seed: 123,
    };
    
    const result = suggest(input);
    
    for (const suggestion of result.suggestions) {
      expect(suggestion.rationale.trigger).toBeDefined();
      expect(suggestion.rationale.trigger.emotions).toBeInstanceOf(Array);
      expect(suggestion.rationale.trigger.intensities).toBeInstanceOf(Array);
      expect(suggestion.rationale.constraint_check).toBeDefined();
      expect(suggestion.rationale.mechanism).toBeDefined();
      expect(suggestion.rationale.expected_outcome).toBeDefined();
      expect(suggestion.rationale.minimal_draft).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-02: Limite suggestions (1-5)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-02: Limite suggestions', () => {
  it('returns between 1 and 5 suggestions', () => {
    const seeds = [1, 42, 123, 999, 12345];
    const emotions = ['fear', 'joy', 'anger', 'sadness', 'trust'] as const;
    
    for (let i = 0; i < seeds.length; i++) {
      const input: SuggestInput = {
        emotion: createEmotionState(emotions[i], 0.7),
        context: createTestContext(),
        seed: seeds[i],
      };
      
      const result = suggest(input);
      
      expect(result.suggestions.length).toBeGreaterThanOrEqual(MIN_SUGGESTIONS);
      expect(result.suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-03: Probabilités only (confidence ≤ 0.95)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-03: Probabilités only', () => {
  it('suggestion confidence never exceeds cap', () => {
    const input: SuggestInput = {
      emotion: createEmotionState('trust', 0.9),
      context: createTestContext(),
      seed: 42,
    };
    
    const result = suggest(input);
    
    for (const suggestion of result.suggestions) {
      expect(suggestion.confidence).toBeLessThanOrEqual(CONFIDENCE_CAP);
      expect(suggestion.confidence).toBeGreaterThan(0);
    }
  });
  
  it('project confidence never exceeds cap', () => {
    const history = [
      createEmotionState('fear', 0.6),
      createEmotionState('fear', 0.65),
      createEmotionState('fear', 0.7),
      createEmotionState('anticipation', 0.5),
    ];
    
    const input: ProjectInput = {
      history,
      context: createTestContext(),
      horizon: 3,
      seed: 42,
    };
    
    const result = project(input);
    
    expect(result.confidence).toBeLessThanOrEqual(CONFIDENCE_CAP);
  });
  
  it('risk confidence never exceeds cap', () => {
    const history = [
      createEmotionState('sadness', 0.7),
      createEmotionState('sadness', 0.7),
      createEmotionState('sadness', 0.7),
      createEmotionState('sadness', 0.7),
    ];
    
    const input: AssessInput = {
      current: createEmotionState('sadness', 0.7),
      history,
      arc: createTestArc(),
      style_profile: createTestStyleProfile(),
    };
    
    const result = assess(input);
    
    for (const risk of result.risks) {
      expect(risk.confidence).toBeLessThanOrEqual(CONFIDENCE_CAP);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-04: Reproductibilité
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-04: Reproductibilité', () => {
  it('same input+seed produces identical output', () => {
    const input: SuggestInput = {
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    };
    
    const result1 = suggest(input);
    const result2 = suggest(input);
    
    expect(result1.output_hash).toBe(result2.output_hash);
    expect(result1.suggestions.length).toBe(result2.suggestions.length);
    
    for (let i = 0; i < result1.suggestions.length; i++) {
      expect(result1.suggestions[i].id).toBe(result2.suggestions[i].id);
      expect(result1.suggestions[i].content).toBe(result2.suggestions[i].content);
      expect(result1.suggestions[i].score).toBe(result2.suggestions[i].score);
    }
  });
  
  it('different seeds produce different outputs', () => {
    const emotion = createEmotionState('fear', 0.7);
    const context = createTestContext();
    
    const result1 = suggest({ emotion, context, seed: 42 });
    const result2 = suggest({ emotion, context, seed: 43 });
    
    // At least one suggestion should differ
    const ids1 = new Set(result1.suggestions.map(s => s.id));
    const ids2 = new Set(result2.suggestions.map(s => s.id));
    
    const intersection = [...ids1].filter(id => ids2.has(id));
    expect(intersection.length).toBeLessThan(result1.suggestions.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-05: Risques actionnables
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-05: Risques actionnables', () => {
  it('every risk has non-null remediation', () => {
    const history = [
      createEmotionState('sadness', 0.7),
      createEmotionState('sadness', 0.7),
      createEmotionState('sadness', 0.7),
      createEmotionState('sadness', 0.7),
      createEmotionState('sadness', 0.7),
    ];
    
    const input: AssessInput = {
      current: createEmotionState('sadness', 0.7),
      history,
      arc: createTestArc(),
      style_profile: createTestStyleProfile(),
    };
    
    const result = assess(input);
    
    for (const risk of result.risks) {
      expect(risk.remediation).toBeDefined();
      expect(risk.remediation.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-06: Projection bornée
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-06: Projection bornée', () => {
  it('scenario probabilities sum to ≤ 1', () => {
    const history = [
      createEmotionState('fear', 0.6),
      createEmotionState('fear', 0.65),
      createEmotionState('anticipation', 0.7),
      createEmotionState('anticipation', 0.6),
      createEmotionState('trust', 0.5),
    ];
    
    const input: ProjectInput = {
      history,
      context: createTestContext(),
      horizon: 5,
      seed: 42,
    };
    
    const result = project(input);
    
    const totalProb = result.scenarios.reduce((sum, s) => sum + s.probability, 0);
    expect(totalProb).toBeLessThanOrEqual(1.01); // Small tolerance for rounding
  });
  
  it('horizon_actual never exceeds requested', () => {
    const input: ProjectInput = {
      history: [createEmotionState('fear', 0.5)], // Only 1 state
      context: createTestContext(),
      horizon: 5,
      seed: 42,
    };
    
    const result = project(input);
    
    expect(result.horizon_actual).toBeLessThanOrEqual(input.horizon);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-07: Audit complet
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-07: Audit complet', () => {
  it('engine logs all operations', () => {
    const engine = createMuseEngine({ enable_audit: true });
    
    const input: SuggestInput = {
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    };
    
    engine.suggest(input);
    
    const log = engine.getAuditLog();
    
    expect(log.length).toBeGreaterThan(0);
    expect(log.some(e => e.action === 'MUSE_SUGGEST_START')).toBe(true);
    expect(log.some(e => e.action === 'MUSE_SUGGEST_COMPLETE')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-08: Dépendance ORACLE (input V2 validé)
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-08: Dépendance ORACLE', () => {
  it('rejects invalid EmotionStateV2', () => {
    const engine = createMuseEngine();
    
    const invalidState = {
      schema_version: '1.0.0', // Wrong version
      trace_id: 'test',
      created_at_ms: Date.now(),
      input_hash: 'hash',
      signals: [],
      appraisal: {
        emotions: [{ id: 'fear', weight: 0.7 }],
        ambiguity: 0,
        aggregates: { valence: 0, arousal: 0.5, dominance: 0.5 },
      },
      model: { provider: 'test', model: 'test', version: '1.0' },
      rationale: 'test',
      cached: false,
      calibrated: false,
    };
    
    expect(() => {
      engine.suggest({
        emotion: invalidState as any,
        context: createTestContext(),
        seed: 42,
      });
    }).toThrow('INV-MUSE-08');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-09: Diversité
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-09: Diversité', () => {
  it('no pair of suggestions below distance threshold', () => {
    const input: SuggestInput = {
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    };
    
    const result = suggest(input);
    
    for (let i = 0; i < result.suggestions.length; i++) {
      for (let j = i + 1; j < result.suggestions.length; j++) {
        const distance = calculateDistance(result.suggestions[i], result.suggestions[j]);
        expect(distance).toBeGreaterThanOrEqual(DIVERSITY_MIN_DISTANCE);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-10: Types variés
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-10: Types variés', () => {
  it('at least 2 different strategy types when possible', () => {
    const input: SuggestInput = {
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    };
    
    const result = suggest(input);
    
    const types = new Set(result.suggestions.map(s => s.strategy));
    
    // Should have at least 2 types if we have 2+ suggestions
    if (result.suggestions.length >= 2) {
      expect(types.size).toBeGreaterThanOrEqual(2);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-11: Physics-compliant
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-11: Physics-compliant', () => {
  it('all suggestions have physics validation data', () => {
    const input: SuggestInput = {
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    };
    
    const result = suggest(input);
    
    for (const suggestion of result.suggestions) {
      expect(suggestion.physics).toBeDefined();
      expect(typeof suggestion.physics.inertia_respected).toBe('boolean');
      expect(typeof suggestion.physics.gravity_score).toBe('number');
      expect(typeof suggestion.physics.transition_valid).toBe('boolean');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INV-MUSE-12: Harmonic-coherent
// ═══════════════════════════════════════════════════════════════════════════════

describe('INV-MUSE-12: Harmonic-coherent', () => {
  it('harmonic analysis is performed', () => {
    const input: SuggestInput = {
      emotion: createEmotionState('fear', 0.7),
      context: createTestContext(),
      seed: 42,
    };
    
    const result = suggest(input);
    
    expect(result.meta.harmonic_analysis).toBeDefined();
    expect(typeof result.meta.harmonic_analysis.consonance).toBe('number');
    expect(typeof result.meta.harmonic_analysis.diversity_score).toBe('number');
    expect(typeof result.meta.harmonic_analysis.distinct_types).toBe('number');
  });
});
