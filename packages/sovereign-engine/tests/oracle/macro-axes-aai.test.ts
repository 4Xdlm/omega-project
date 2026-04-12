/**
 * Tests: AAI Macro-Axis
 * Invariant: ART-SCORE-01 (Macro-axe AAI calculé - 25%, plancher 85)
 */

import { describe, it, expect } from 'vitest';
import { computeAAI } from '../../src/oracle/macro-axes.js';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import type { ForgePacket, SovereignProvider } from '../../src/types.js';

describe('AAI Macro-Axis (ART-SCORE-01)', () => {
  const mockPacket: ForgePacket = {
    scene_id: 'test-aai',
    canon: [],
    constraints: [],
    emotion_physics: [],
  };

  const mockProvider: SovereignProvider = {
    model_id: 'mock',
    llm_generate: async () => ({
      text: JSON.stringify({ score: 75, rationale: 'Test', worst_sentences: [] }),
      usage: { input_tokens: 0, output_tokens: 0 },
    }),
  };

  it('MACRO-AAI-01: AAI calculé correctement (weighted mean SDT + AUTH)', async () => {
    const prose = 'Ses épaules s\'affaissèrent. Son regard tomba vers le sol. Le vent sifflait dehors.';
    const result = await computeAAI(mockPacket, prose, mockProvider);

    // Vérifier structure MacroAxisScore
    expect(result.name).toBe('aai');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(0.25); // 25% du composite
    expect(result.method).toBe('HYBRID');

    // Vérifier 2 sous-composants
    expect(result.sub_scores.length).toBe(2);
    const sdt = result.sub_scores.find((s) => s.name === 'show_dont_tell');
    const auth = result.sub_scores.find((s) => s.name === 'authenticity');
    expect(sdt).toBeDefined();
    expect(auth).toBeDefined();

    // Vérifier pondération (show_dont_tell 60% + authenticity 40%)
    const expected_score = sdt!.score * 0.6 + auth!.score * 0.4;
    expect(Math.abs(result.score - expected_score)).toBeLessThan(0.1);
  });

  it('MACRO-AAI-02: plancher 85 respecté (score < 85 → flag)', async () => {
    // Prose avec telling massif pour score bas
    const prose_telling = 'Il était triste. Il était furieux. Il sentait la peur. Il éprouvait de la colère.';
    const result = await computeAAI(mockPacket, prose_telling, mockProvider);

    // Score devrait être bas (< 85)
    expect(result.score).toBeLessThan(85);

    // Vérifier que le plancher config existe
    expect(SOVEREIGN_CONFIG.AAI_FLOOR).toBe(85);

    // Note: Le verdict SEAL vérifie ce plancher dans s-score.ts
  });

  it('BUG-01: AAI varies for different prose types (CALC path)', async () => {
    // BUG-01 diagnostic: with real provider (no llm_generate), adversarial judge
    // falls back to CALC-only. Show_dont_tell CALC is deterministic.
    // This test verifies that AAI DOES vary when telling violations differ.
    const prose_showing = 'Ses mains tremblaient sur la porcelaine. Le thé fumait.';
    const prose_telling = 'Il était triste. Il sentait la peur. Il éprouvait de la joie.';

    // Use provider WITHOUT llm_generate to simulate production path
    const calcOnlyProvider: SovereignProvider = {} as SovereignProvider;

    const result_show = await computeAAI(mockPacket, prose_showing, calcOnlyProvider);
    const result_tell = await computeAAI(mockPacket, prose_telling, calcOnlyProvider);

    // AAI MUST differ between showing and telling prose
    expect(result_show.score).toBeGreaterThan(result_tell.score);
    // Showing prose → high AAI (CALC: 0 violations)
    expect(result_show.score).toBeGreaterThanOrEqual(85);
    // Telling prose → lower AAI (CALC: multiple telling violations)
    expect(result_tell.score).toBeLessThan(90);
  });

  it('MACRO-AAI-03: redistribution poids totale = 100%', () => {
    // Vérifier que la somme des poids macro = 100%
    const weights = SOVEREIGN_CONFIG.MACRO_WEIGHTS;
    const total = weights.ecc + weights.rci + weights.sii + weights.ifi + weights.aai;

    expect(total).toBeCloseTo(1.0, 5); // 100% = 1.0 avec précision float

    // Vérifier distribution exacte Sprint 11
    expect(weights.ecc).toBe(0.33); // 33%
    expect(weights.rci).toBe(0.17); // 17%
    expect(weights.sii).toBe(0.15); // 15%
    expect(weights.ifi).toBe(0.10); // 10%
    expect(weights.aai).toBe(0.25); // 25%
  });
});
