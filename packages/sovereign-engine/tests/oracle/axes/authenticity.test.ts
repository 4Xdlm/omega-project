/**
 * Tests: Authenticity Axis
 * Invariant: ART-AUTH-01 (Axe authenticity intégré, poids ×2.0)
 */

import { describe, it, expect } from 'vitest';
import { scoreAuthenticityAxis } from '../../../src/oracle/axes/authenticity.js';
import type { ForgePacket, SovereignProvider } from '../../../src/types.js';

describe('Authenticity Axis (ART-AUTH-01)', () => {
  const mockPacket: ForgePacket = {
    scene_id: 'test-scene',
    canon: [],
    constraints: [],
    emotion_physics: [],
  };

  const mockProvider: SovereignProvider = {
    model_id: 'mock',
    llm_generate: async () => ({
      text: JSON.stringify({ score: 80, rationale: 'Test rationale', worst_sentences: [] }),
      usage: { input_tokens: 0, output_tokens: 0 },
    }),
  };

  it('AXE-AUTH-01: retourne score [0,100], poids 2.0, méthode HYBRID', async () => {
    const prose = 'Il marchait. Le vent soufflait. La nuit tombait.';
    const result = await scoreAuthenticityAxis(mockPacket, prose, mockProvider);

    // Vérifier structure AxisScore
    expect(result.axis_id).toBe('authenticity');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(2.0); // Poids ×2.0 comme spécifié
    expect(result.method).toBe('HYBRID');
    expect(result.details).toBeDefined();
    expect(result.details.calc_score).toBeDefined();
  });
});
