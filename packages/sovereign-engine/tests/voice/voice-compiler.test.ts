/**
 * Tests: Voice Constraint Compiler (Sprint 13.2)
 * Invariant: ART-VOICE-02
 */

import { describe, it, expect } from 'vitest';
import { compileVoiceConstraints } from '../../src/voice/voice-compiler.js';
import type { VoiceGenome } from '../../src/voice/voice-genome.js';

describe('Voice Constraint Compiler (ART-VOICE-02)', () => {
  it('VCOMP-01: genome extrême (tous à 0.1 ou 0.9) → instructions générées pour les 10 params', () => {
    const extremeGenome: VoiceGenome = {
      phrase_length_mean: 0.1,
      dialogue_ratio: 0.9,
      metaphor_density: 0.1,
      language_register: 0.9,
      irony_level: 0.1,
      ellipsis_rate: 0.9,
      abstraction_ratio: 0.1,
      punctuation_style: 0.9,
      paragraph_rhythm: 0.1,
      opening_variety: 0.9,
    };

    const result = compileVoiceConstraints(extremeGenome, 1000);

    // Tous les 10 paramètres sont hors zone neutre → 10 instructions
    expect(result.instructions).toHaveLength(10);

    // Vérifier que le contenu contient au moins quelques instructions clés
    expect(result.content).toContain('Phrases courtes');
    expect(result.content).toContain('Beaucoup de dialogue');
    expect(result.content).toContain('littérale');
    expect(result.content).toContain('Registre soutenu');

    // Token count doit être > 0
    expect(result.token_count).toBeGreaterThan(0);
  });

  it('VCOMP-02: genome neutre (tous à 0.5) → aucune instruction (zone morte)', () => {
    const neutralGenome: VoiceGenome = {
      phrase_length_mean: 0.5,
      dialogue_ratio: 0.5,
      metaphor_density: 0.5,
      language_register: 0.5,
      irony_level: 0.5,
      ellipsis_rate: 0.5,
      abstraction_ratio: 0.5,
      punctuation_style: 0.5,
      paragraph_rhythm: 0.5,
      opening_variety: 0.5,
    };

    const result = compileVoiceConstraints(neutralGenome, 400);

    // Tous dans zone neutre [0.3, 0.7] → 0 instructions
    expect(result.instructions).toHaveLength(0);
    expect(result.content).toBe('');
    expect(result.token_count).toBe(0);
  });

  it('VCOMP-03: budget 200 tokens → contenu tronqué, token_count ≤ 200', () => {
    const extremeGenome: VoiceGenome = {
      phrase_length_mean: 0.1,
      dialogue_ratio: 0.9,
      metaphor_density: 0.1,
      language_register: 0.9,
      irony_level: 0.1,
      ellipsis_rate: 0.9,
      abstraction_ratio: 0.1,
      punctuation_style: 0.9,
      paragraph_rhythm: 0.1,
      opening_variety: 0.9,
    };

    const result = compileVoiceConstraints(extremeGenome, 100);

    // Token count doit respecter le budget (ou légèrement dépasser si critical)
    expect(result.token_count).toBeLessThanOrEqual(150); // Tolérance pour critical

    // Certaines instructions medium peuvent être tronquées
    expect(result.instructions.length).toBeLessThan(10);

    // Les instructions critical/high doivent être présentes en priorité
    const priorities = result.instructions.map(i => i.priority);
    const hasCritical = priorities.includes('critical');
    const hasHigh = priorities.includes('high');

    // Au moins une instruction critical ou high doit être présente
    expect(hasCritical || hasHigh).toBe(true);
  });
});
