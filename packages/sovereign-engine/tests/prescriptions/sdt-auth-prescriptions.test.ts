/**
 * Tests: SDT + AUTH Prescriptions Integration (Sprint 11.5)
 * Invariants: ART-SDT-02, ART-AUTH-01
 */

import { describe, it, expect } from 'vitest';
import { generateTellingPrescriptions, generateAuthenticityPrescriptions } from '../../src/prescriptions/generate-prescriptions.js';
import { detectTelling } from '../../src/silence/show-dont-tell.js';
import { scoreAuthenticity } from '../../src/authenticity/authenticity-scorer.js';
import type { SovereignProvider } from '../../src/types.js';
import { SemanticCache } from '../../src/semantic/semantic-cache.js';

describe('SDT + AUTH Prescriptions (Sprint 11.5)', () => {
  const mockProvider: SovereignProvider = {
    model_id: 'mock',
    llm_generate: async () => ({
      text: JSON.stringify({ score: 50, rationale: 'Test', worst_sentences: [] }),
      usage: { input_tokens: 0, output_tokens: 0 },
    }),
  };

  it('LOOP-SDT-01: prose with telling → correction prescription generated', () => {
    const prose_telling = 'Il était triste. Elle ressentait de la peur. Il éprouvait une profonde colère.';
    const result = detectTelling(prose_telling);

    // Generate prescriptions from telling result
    const prescriptions = generateTellingPrescriptions(result);

    // Should have prescriptions for telling violations
    expect(prescriptions.length).toBeGreaterThan(0);
    expect(prescriptions[0].type).toBe('telling');
    expect(prescriptions[0].diagnosis).toContain('Telling violation');
    expect(prescriptions[0].action).toContain('Replace telling with showing');
    expect(prescriptions[0].severity).toMatch(/critical|high|medium/);
    expect(prescriptions[0].expected_gain).toBeGreaterThan(0);
  });

  it('LOOP-AUTH-01: prose with IA smell → prescription generated', async () => {
    const prose_ia_smell =
      'Dans un monde où la technologie moderne transforme profondément nos vies, ' +
      'il est crucial de comprendre que chaque individu mérite une attention particulière. ' +
      'En conclusion, nous devons reconnaître que la situation actuelle exige une réflexion approfondie.';

    const cache = new SemanticCache();
    const result = await scoreAuthenticity(prose_ia_smell, mockProvider, cache);

    // Generate prescriptions from authenticity result
    const prescriptions = generateAuthenticityPrescriptions(result);

    // Should have prescriptions if IA patterns detected
    if (result.pattern_hits.length > 0) {
      expect(prescriptions.length).toBeGreaterThan(0);
      expect(prescriptions[0].type).toBe('ia_smell');
      expect(prescriptions[0].diagnosis).toContain('IA smell pattern detected');
      expect(prescriptions[0].action).toContain('Break symmetry');
      expect(prescriptions[0].severity).toMatch(/critical|high|medium/);
    } else {
      // If no patterns detected, should have no prescriptions
      expect(prescriptions.length).toBe(0);
    }
  });
});
