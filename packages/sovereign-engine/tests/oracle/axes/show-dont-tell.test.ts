/**
 * Tests: Show Don't Tell Axis
 * Invariant: ART-SDT-02 (Axe show_dont_tell intégré, poids ×3.0)
 */

import { describe, it, expect } from 'vitest';
import { scoreShowDontTell } from '../../../src/oracle/axes/show-dont-tell.js';
import type { ForgePacket, SovereignProvider } from '../../../src/types.js';

describe('Show Don\'t Tell Axis (ART-SDT-02)', () => {
  const mockPacket: ForgePacket = {
    scene_id: 'test-scene',
    canon: [],
    constraints: [],
    emotion_physics: [],
  };

  const mockProvider: SovereignProvider = {
    model_id: 'mock',
    llm_generate: async () => ({ text: '', usage: { input_tokens: 0, output_tokens: 0 } }),
  };

  it('AXE-SDT-01: retourne score [0,100], poids 3.0, méthode HYBRID', async () => {
    const prose = 'Ses épaules s\'affaissèrent. Son regard tomba vers le sol.';
    const result = await scoreShowDontTell(mockPacket, prose, mockProvider);

    // Vérifier structure AxisScore
    expect(result.axis_id).toBe('show_dont_tell');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(3.0); // Poids ×3.0 comme spécifié
    expect(result.method).toBe('HYBRID');
    expect(result.details).toBeDefined();

    // Prose avec bon showing → score élevé
    expect(result.score).toBeGreaterThan(80);
  });
});
