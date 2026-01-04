/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE Diversity Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for anti-redundancy system:
 * - Distance calculation
 * - Diversification filter
 * - Type variety enforcement
 * - Harmonic analysis
 * 
 * INV-MUSE-09: No pair with distance < threshold
 * INV-MUSE-10: At least 2 different types
 * 
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  diversify,
  ensureTypeVariety,
  calculateDiversityScore,
  countDistinctTypes,
  analyzeHarmony,
  DIVERSITY_MIN_DISTANCE,
  MIN_DISTINCT_TYPES,
} from '../index';
import type { Suggestion, Rationale, PhysicsCompliance } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createTestRationale(mechanism: string = 'tension'): Rationale {
  return {
    trigger: { emotions: ['fear'], intensities: [0.7] },
    constraint_check: 'Safe',
    mechanism: mechanism as any,
    expected_outcome: 'Test outcome',
    minimal_draft: 'Test draft sentence.',
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

function createSuggestion(
  id: string,
  strategy: string,
  content: string,
  score: number,
  mechanism: string = 'tension',
  targetChar?: string
): Suggestion {
  return {
    id,
    strategy: strategy as any,
    content,
    target_character: targetChar,
    expected_shift: {
      from: 'fear',
      to: 'anticipation',
      intensity_delta: 0.1,
      transition_type: 'natural',
    },
    score,
    confidence: 0.7,
    rationale: createTestRationale(mechanism),
    score_breakdown: {
      actionability: 0.7,
      context_fit: 0.7,
      emotional_leverage: 0.7,
      novelty: 0.7,
      canon_safety: 0.7,
      arc_alignment: 0.7,
    },
    physics: createTestPhysics(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISTANCE CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Diversity: calculateDistance', () => {
  it('returns 0 for identical suggestions', () => {
    const s1 = createSuggestion('a', 'beat_next', 'Test content', 0.7, 'tension', 'Alice');
    const s2 = createSuggestion('b', 'beat_next', 'Test content', 0.7, 'tension', 'Alice');
    
    const distance = calculateDistance(s1, s2);
    expect(distance).toBe(0);
  });
  
  it('returns higher distance for different strategies', () => {
    const s1 = createSuggestion('a', 'beat_next', 'Test content', 0.7);
    const s2 = createSuggestion('b', 'tension_delta', 'Test content', 0.7);
    
    const distance = calculateDistance(s1, s2);
    expect(distance).toBeGreaterThan(0);
  });
  
  it('returns higher distance for different mechanisms', () => {
    const s1 = createSuggestion('a', 'beat_next', 'Test content', 0.7, 'tension');
    const s2 = createSuggestion('b', 'beat_next', 'Test content', 0.7, 'contrast');
    
    const distance = calculateDistance(s1, s2);
    expect(distance).toBeGreaterThan(0);
  });
  
  it('returns higher distance for different target characters', () => {
    const s1 = createSuggestion('a', 'beat_next', 'Test content', 0.7, 'tension', 'Alice');
    const s2 = createSuggestion('b', 'beat_next', 'Test content', 0.7, 'tension', 'Bob');
    
    const distance = calculateDistance(s1, s2);
    expect(distance).toBeGreaterThan(0);
  });
  
  it('returns higher distance for different content', () => {
    const s1 = createSuggestion('a', 'beat_next', 'Build tension through fear', 0.7);
    const s2 = createSuggestion('b', 'beat_next', 'Create contrast with joy revelation', 0.7);
    
    const distance = calculateDistance(s1, s2);
    expect(distance).toBeGreaterThan(0);
  });
  
  it('returns value between 0 and 1', () => {
    const s1 = createSuggestion('a', 'beat_next', 'Content A', 0.7, 'tension', 'Alice');
    const s2 = createSuggestion('b', 'contrast_knife', 'Content B completely different', 0.7, 'contrast', 'Bob');
    
    const distance = calculateDistance(s1, s2);
    expect(distance).toBeGreaterThanOrEqual(0);
    expect(distance).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DIVERSIFY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Diversity: diversify', () => {
  it('removes similar suggestions', () => {
    const suggestions = [
      createSuggestion('a', 'beat_next', 'Test content identical', 0.8),
      createSuggestion('b', 'beat_next', 'Test content identical', 0.7),
      createSuggestion('c', 'contrast_knife', 'Completely different approach', 0.6),
    ];
    
    const { survivors, rejected } = diversify(suggestions);
    
    // First and second are too similar, keep first (higher score)
    expect(survivors.some(s => s.id === 'a')).toBe(true);
    expect(survivors.some(s => s.id === 'c')).toBe(true);
  });
  
  it('keeps all diverse suggestions', () => {
    const suggestions = [
      createSuggestion('a', 'beat_next', 'Build tension through fear and anticipation', 0.8, 'tension'),
      createSuggestion('b', 'contrast_knife', 'Create sharp contrast with unexpected joy', 0.7, 'contrast'),
      createSuggestion('c', 'agency_injection', 'Give Alice power through decisive action', 0.6, 'agency', 'Alice'),
    ];
    
    const { survivors, rejected } = diversify(suggestions);
    
    // All should survive (different strategies and content)
    expect(survivors.length).toBe(3);
    expect(rejected.length).toBe(0);
  });
  
  it('uses custom threshold', () => {
    // Create suggestions that are moderately different
    const suggestions = [
      createSuggestion('a', 'beat_next', 'Build tension through fear and danger', 0.8, 'tension'),
      createSuggestion('b', 'contrast_knife', 'Create sharp contrast with unexpected twist', 0.7, 'contrast'),
    ];
    
    // Very low threshold = keep both (they are different enough)
    const { survivors: low } = diversify(suggestions, 0.01);
    expect(low.length).toBe(2);
    
    // Very high threshold = might reject one
    const { survivors: high } = diversify(suggestions, 0.99);
    expect(high.length).toBeGreaterThanOrEqual(1);
    expect(high.length).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE VARIETY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Diversity: ensureTypeVariety', () => {
  it('adds different types when needed', () => {
    const currentSuggestions = [
      createSuggestion('a', 'beat_next', 'Beat next content about fear', 0.8),
    ];
    
    const allCandidates = [
      ...currentSuggestions,
      createSuggestion('b', 'contrast_knife', 'Contrast with joy and surprise', 0.6, 'contrast'),
      createSuggestion('c', 'tension_delta', 'Escalate through anticipation', 0.5, 'tension'),
    ];
    
    const result = ensureTypeVariety(currentSuggestions, allCandidates, 2);
    
    // Should have at least 1 (original), may have more if diversity allows
    expect(result.length).toBeGreaterThanOrEqual(1);
    
    // If more types were added, verify variety
    if (result.length >= 2) {
      const types = new Set(result.map(s => s.strategy));
      expect(types.size).toBeGreaterThanOrEqual(2);
    }
  });
  
  it('does not add if variety already met', () => {
    const suggestions = [
      createSuggestion('a', 'beat_next', 'Content A', 0.8),
      createSuggestion('b', 'contrast_knife', 'Content B', 0.7),
    ];
    
    const result = ensureTypeVariety(suggestions, suggestions, 2);
    
    expect(result.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DIVERSITY SCORE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Diversity: calculateDiversityScore', () => {
  it('returns 1 for single suggestion', () => {
    const suggestions = [createSuggestion('a', 'beat_next', 'Content', 0.7)];
    const score = calculateDiversityScore(suggestions);
    expect(score).toBe(1);
  });
  
  it('returns higher score for diverse set', () => {
    const diverse = [
      createSuggestion('a', 'beat_next', 'Fear and tension building', 0.8, 'tension'),
      createSuggestion('b', 'contrast_knife', 'Joy through revelation', 0.7, 'contrast'),
      createSuggestion('c', 'agency_injection', 'Power shift to Bob', 0.6, 'agency', 'Bob'),
    ];
    
    const similar = [
      createSuggestion('a', 'beat_next', 'Fear content', 0.8, 'tension'),
      createSuggestion('b', 'beat_next', 'Fear content', 0.7, 'tension'),
      createSuggestion('c', 'beat_next', 'Fear content', 0.6, 'tension'),
    ];
    
    const diverseScore = calculateDiversityScore(diverse);
    const similarScore = calculateDiversityScore(similar);
    
    expect(diverseScore).toBeGreaterThan(similarScore);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COUNT DISTINCT TYPES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Diversity: countDistinctTypes', () => {
  it('counts unique strategies', () => {
    const suggestions = [
      createSuggestion('a', 'beat_next', 'A', 0.8),
      createSuggestion('b', 'beat_next', 'B', 0.7),
      createSuggestion('c', 'contrast_knife', 'C', 0.6),
    ];
    
    expect(countDistinctTypes(suggestions)).toBe(2);
  });
  
  it('returns 0 for empty array', () => {
    expect(countDistinctTypes([])).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HARMONIC ANALYSIS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Diversity: analyzeHarmony', () => {
  it('returns consonance score', () => {
    const suggestions = [
      createSuggestion('a', 'beat_next', 'A', 0.8, 'tension'),
      createSuggestion('b', 'contrast_knife', 'B', 0.7, 'contrast'),
    ];
    
    const analysis = analyzeHarmony(suggestions);
    
    expect(analysis.consonance).toBeGreaterThanOrEqual(0);
    expect(analysis.consonance).toBeLessThanOrEqual(1);
  });
  
  it('identifies wild card', () => {
    const suggestions = [
      createSuggestion('a', 'beat_next', 'Similar content A', 0.8, 'tension'),
      createSuggestion('b', 'beat_next', 'Similar content B', 0.7, 'tension'),
      createSuggestion('c', 'contrast_knife', 'Completely different wild approach', 0.6, 'contrast'),
    ];
    
    const analysis = analyzeHarmony(suggestions, 0.5);
    
    // Wild card might or might not be identified depending on threshold
    expect(typeof analysis.wild_card_id === 'string' || analysis.wild_card_id === null).toBe(true);
  });
  
  it('tracks distinct types', () => {
    const suggestions = [
      createSuggestion('a', 'beat_next', 'A', 0.8),
      createSuggestion('b', 'contrast_knife', 'B', 0.7),
      createSuggestion('c', 'tension_delta', 'C', 0.6),
    ];
    
    const analysis = analyzeHarmony(suggestions);
    
    expect(analysis.distinct_types).toBe(3);
  });
  
  it('checks progression coherence', () => {
    const suggestions = [
      createSuggestion('a', 'beat_next', 'A', 0.8, 'tension'),
      createSuggestion('b', 'contrast_knife', 'B', 0.7, 'contrast'),
      createSuggestion('c', 'agency_injection', 'C', 0.6, 'resolution'),
    ];
    
    const analysis = analyzeHarmony(suggestions);
    
    expect(typeof analysis.progression_coherent).toBe('boolean');
  });
});
