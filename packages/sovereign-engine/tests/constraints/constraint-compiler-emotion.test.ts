/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — CONSTRAINT COMPILER EMOTION INTEGRATION TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/constraints/constraint-compiler-emotion.test.ts
 * Version: 1.0.0 (Sprint 10 Commit 10.5)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-05
 *
 * Tests for emotion-to-action and contradiction integration in constraint compiler.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { compilePhysicsSection } from '../../src/constraints/constraint-compiler.js';
import type { ForgeEmotionBrief } from '@omega/omega-forge';
import type { PhysicsCompilerConfig } from '../../src/constraints/types.js';

describe('Constraint Compiler — Emotion Integration (ART-SEM-05)', () => {
  it('COMPILE-NEW-01: prompt compiled contains physical actions when emotions present in packet', () => {
    // Mock brief with emotions
    const brief: ForgeEmotionBrief = {
      language: 'fr',
      trajectory: [
        { quartile: 'Q1', timestamp: 0, vector: {} as any },
        { quartile: 'Q2', timestamp: 250, vector: {} as any },
        { quartile: 'Q3', timestamp: 500, vector: {} as any },
        { quartile: 'Q4', timestamp: 750, vector: {} as any },
      ],
      physics_profiles: [
        { emotion: 'fear', mass: 5.5, lambda: 0.12 },
        { emotion: 'sadness', mass: 4.2, lambda: 0.10 },
        { emotion: 'joy', mass: 3.1, lambda: 0.08 },
      ],
      quartile_targets: [
        { quartile: 'Q1', dominant: 'fear', secondary: 'sadness' },
        { quartile: 'Q2', dominant: 'fear', secondary: 'sadness' },
        { quartile: 'Q3', dominant: 'sadness', secondary: 'joy' },
        { quartile: 'Q4', dominant: 'joy', secondary: 'fear' },
      ],
      transition_map: [],
      forbidden_transitions: [],
      decay_expectations: [],
      blend_zones: [],
    };

    const config: PhysicsCompilerConfig = {
      physics_prompt_budget_tokens: 800,
      physics_prompt_tokenizer_id: 'chars_div_4',
      top_k_emotions: 3,
      top_k_transitions: 3,
    };

    const result = compilePhysicsSection(brief, config);

    // Should contain physical actions section
    expect(result.text).toContain('Actions corporelles');
    expect(result.text).toContain('MONTRE');
    expect(result.text).toContain('fear');

    // Should contain at least one action from EMOTION_ACTION_MAP
    // (fear actions: regard fuyant, mains moites, respiration courte, etc.)
    expect(
      result.text.includes('regard fuyant') ||
      result.text.includes('mains moites') ||
      result.text.includes('respiration courte')
    ).toBe(true);
  });

  it('COMPILE-NEW-02: prompt contains contradiction instructions when contradictions detected', () => {
    // Mock brief with contradictory emotions (high mass for multiple opposing emotions)
    const brief: ForgeEmotionBrief = {
      language: 'fr',
      trajectory: [
        { quartile: 'Q1', timestamp: 0, vector: {} as any },
        { quartile: 'Q2', timestamp: 250, vector: {} as any },
        { quartile: 'Q3', timestamp: 500, vector: {} as any },
        { quartile: 'Q4', timestamp: 750, vector: {} as any },
      ],
      physics_profiles: [
        { emotion: 'joy', mass: 6.0, lambda: 0.10 }, // High mass → high intensity
        { emotion: 'sadness', mass: 5.5, lambda: 0.12 }, // High mass → contradiction with joy
        { emotion: 'fear', mass: 5.0, lambda: 0.11 }, // High mass → triple contradiction
      ],
      quartile_targets: [
        { quartile: 'Q1', dominant: 'joy', secondary: 'sadness' },
        { quartile: 'Q2', dominant: 'joy', secondary: 'fear' },
        { quartile: 'Q3', dominant: 'sadness', secondary: 'fear' },
        { quartile: 'Q4', dominant: 'fear', secondary: 'joy' },
      ],
      transition_map: [],
      forbidden_transitions: [],
      decay_expectations: [],
      blend_zones: [],
    };

    const config: PhysicsCompilerConfig = {
      physics_prompt_budget_tokens: 800,
      physics_prompt_tokenizer_id: 'chars_div_4',
      top_k_emotions: 3,
      top_k_transitions: 3,
    };

    const result = compilePhysicsSection(brief, config);

    // Should contain contradiction handling section
    expect(result.text).toContain('contradictions émotionnelles') ||
      expect(result.text).toContain('tension narrative');
  });

  it('COMPILE-NEW-03: budget 800 tokens respected even with actions + contradictions added', () => {
    // Mock brief with many emotions and contradictions
    const brief: ForgeEmotionBrief = {
      language: 'fr',
      trajectory: [
        { quartile: 'Q1', timestamp: 0, vector: {} as any },
        { quartile: 'Q2', timestamp: 250, vector: {} as any },
        { quartile: 'Q3', timestamp: 500, vector: {} as any },
        { quartile: 'Q4', timestamp: 750, vector: {} as any },
      ],
      physics_profiles: [
        { emotion: 'joy', mass: 6.0, lambda: 0.10 },
        { emotion: 'sadness', mass: 5.5, lambda: 0.12 },
        { emotion: 'fear', mass: 5.0, lambda: 0.11 },
        { emotion: 'anger', mass: 4.8, lambda: 0.13 },
        { emotion: 'trust', mass: 4.5, lambda: 0.09 },
      ],
      quartile_targets: [
        { quartile: 'Q1', dominant: 'joy', secondary: 'sadness' },
        { quartile: 'Q2', dominant: 'fear', secondary: 'anger' },
        { quartile: 'Q3', dominant: 'sadness', secondary: 'trust' },
        { quartile: 'Q4', dominant: 'trust', secondary: 'joy' },
      ],
      transition_map: [
        { from_quartile: 'Q1', to_quartile: 'Q2', from_dominant: 'joy', to_dominant: 'fear', required_force: 8.5, feasible: false, narrative_hint_fr: 'nécessite un choc narratif fort' },
        { from_quartile: 'Q2', to_quartile: 'Q3', from_dominant: 'fear', to_dominant: 'sadness', required_force: 3.2, feasible: true, narrative_hint_fr: 'transition fluide possible' },
        { from_quartile: 'Q3', to_quartile: 'Q4', from_dominant: 'sadness', to_dominant: 'trust', required_force: 6.0, feasible: true, narrative_hint_fr: 'résolution progressive' },
      ],
      forbidden_transitions: [
        { from: 'joy', to: 'contempt', reason_fr: 'incompatible psychologiquement' },
      ],
      decay_expectations: [
        { emotion: 'fear', peak_quartile: 'Q2', decay_quartile: 'Q3', instruction_fr: 'Après le pic de peur en Q2, laisser l\'émotion retomber naturellement en Q3' },
      ],
      blend_zones: [
        { quartile: 'Q3', emotions: ['sadness', 'trust'], instruction_fr: 'En Q3, laisser coexister tristesse et confiance sans forcer une résolution' },
      ],
    };

    const config: PhysicsCompilerConfig = {
      physics_prompt_budget_tokens: 800,
      physics_prompt_tokenizer_id: 'chars_div_4',
      top_k_emotions: 3,
      top_k_transitions: 3,
    };

    const result = compilePhysicsSection(brief, config);

    // Budget should be respected (token_count <= budget)
    expect(result.token_count).toBeLessThanOrEqual(800);

    // Should still contain some content (not empty due to over-budgeting)
    expect(result.text.length).toBeGreaterThan(100);

    // CRITICAL constraints should always be present
    expect(result.text).toContain('Arc émotionnel');
  });
});
