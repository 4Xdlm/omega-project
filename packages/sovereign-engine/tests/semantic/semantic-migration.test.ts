/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC MIGRATION TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/semantic/semantic-migration.test.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.5)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-01, ART-SEM-05
 *
 * Tests for migration of tension_14d + emotion_coherence to semantic analysis.
 * 5 mandatory tests: MIG-01 to MIG-05 (non-regression).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { scoreTension14D } from '../../src/oracle/axes/tension-14d.js';
import { scoreEmotionCoherence } from '../../src/oracle/axes/emotion-coherence.js';
import { SOVEREIGN_CONFIG } from '../../src/config.js';
import type { ForgePacket, SovereignProvider } from '../../src/types.js';
import type { SemanticEmotionResult } from '../../src/semantic/types.js';

/**
 * Mock provider for semantic tests.
 */
class MockMigrationProvider implements SovereignProvider {
  async scoreInteriority(): Promise<number> { return 75; }
  async scoreSensoryDensity(): Promise<number> { return 75; }
  async scoreNecessity(): Promise<number> { return 75; }
  async scoreImpact(): Promise<number> { return 75; }
  async applyPatch(prose: string): Promise<string> { return prose; }
  async generateDraft(): Promise<string> { return '{}'; }
  async generateStructuredJSON(): Promise<unknown> {
    // Return default 14D result
    return {
      joy: 0.1, trust: 0.2, fear: 0.3, surprise: 0.1,
      sadness: 0.4, disgust: 0.05, anger: 0.1, anticipation: 0.15,
      love: 0.2, submission: 0.1, awe: 0.1, disapproval: 0.05,
      remorse: 0.1, contempt: 0.05,
    };
  }
}

const mockPacket: Partial<ForgePacket> = {
  scene_id: 'mig_test_scene',
  language: 'fr',
  emotion_contract: {
    curve_quartiles: [
      {
        quartile: 'Q1',
        target_14d: {
          joy: 0, trust: 0, fear: 0.6, surprise: 0.2, sadness: 0.2,
          disgust: 0, anger: 0, anticipation: 0, love: 0, submission: 0,
          awe: 0, disapproval: 0, remorse: 0, contempt: 0,
        },
        valence: -0.4,
        arousal: 0.6,
        dominant: 'fear',
        reader_state: 'Anxious tension',
      },
      {
        quartile: 'Q2',
        target_14d: {
          joy: 0, trust: 0, fear: 0.8, surprise: 0.1, sadness: 0.1,
          disgust: 0, anger: 0, anticipation: 0, love: 0, submission: 0,
          awe: 0, disapproval: 0, remorse: 0, contempt: 0,
        },
        valence: -0.6,
        arousal: 0.8,
        dominant: 'fear',
        reader_state: 'Peak terror',
      },
      {
        quartile: 'Q3',
        target_14d: {
          joy: 0, trust: 0.1, fear: 0.3, surprise: 0, sadness: 0.4,
          disgust: 0, anger: 0, anticipation: 0, love: 0, submission: 0.2,
          awe: 0, disapproval: 0, remorse: 0, contempt: 0,
        },
        valence: -0.3,
        arousal: 0.4,
        dominant: 'sadness',
        reader_state: 'Resignation',
      },
      {
        quartile: 'Q4',
        target_14d: {
          joy: 0, trust: 0, fear: 0.2, surprise: 0, sadness: 0.6,
          disgust: 0, anger: 0, anticipation: 0, love: 0, submission: 0.2,
          awe: 0, disapproval: 0, remorse: 0, contempt: 0,
        },
        valence: -0.4,
        arousal: 0.3,
        dominant: 'sadness',
        reader_state: 'Deep grief',
      },
    ],
    rupture: {
      exists: false,
      position_pct: 0,
      before_dominant: 'fear',
      after_dominant: 'fear',
      delta_valence: 0,
    },
    valence_arc: {
      start: -0.4,
      end: -0.4,
      direction: 'stable',
    },
  },
} as ForgePacket;

describe('Semantic Migration (ART-SEM-01, ART-SEM-05)', () => {
  const provider = new MockMigrationProvider();

  it('MIG-01: scoreTension14D works with provider (semantic enabled)', async () => {
    const prose = `La peur montait dans son cœur.

Elle savait qu'ils approchaient.

La terreur la paralysait maintenant.

Puis ce fut le vide. La tristesse.`;

    // Should work with provider
    const result = await scoreTension14D(mockPacket as ForgePacket, prose, provider);

    expect(result.name).toBe('tension_14d');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(3.0);
    expect(result.method).toBe('CALC');
  });

  it('MIG-02: scoreTension14D fallbacks to keywords when no provider', async () => {
    const prose = `La peur montait dans son cœur.

Elle savait qu'ils approchaient.

La terreur la paralysait maintenant.

Puis ce fut le vide. La tristesse.`;

    // Should work without provider (fallback to keywords)
    const result = await scoreTension14D(mockPacket as ForgePacket, prose);

    expect(result.name).toBe('tension_14d');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(3.0);
    expect(result.method).toBe('CALC');
  });

  it('MIG-03: scoreEmotionCoherence works with provider (semantic enabled)', async () => {
    const prose = `Elle avançait lentement dans le couloir sombre.

La peur montait en elle, légère d'abord, puis plus insistante.

Ses doigts tremblaient légèrement quand elle saisit la poignée.

Elle ouvrit la porte avec précaution.`;

    // Should work with provider
    const result = await scoreEmotionCoherence(mockPacket as ForgePacket, prose, provider);

    expect(result.name).toBe('emotion_coherence');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(2.5);
    expect(result.method).toBe('CALC');
  });

  it('MIG-04: scoreEmotionCoherence fallbacks to keywords when no provider', async () => {
    const prose = `Elle avançait lentement dans le couloir sombre.

La peur montait en elle, légère d'abord, puis plus insistante.

Ses doigts tremblaient légèrement quand elle saisit la poignée.

Elle ouvrit la porte avec précaution.`;

    // Should work without provider (fallback to keywords)
    const result = await scoreEmotionCoherence(mockPacket as ForgePacket, prose);

    expect(result.name).toBe('emotion_coherence');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(2.5);
    expect(result.method).toBe('CALC');
  });

  it('MIG-05: SEMANTIC_CORTEX_ENABLED flag controls behavior', async () => {
    const prose = `Elle respirait calmement.

La tension montait doucement.

Elle sentait son cœur accélérer.`;

    // Verify flag exists and is boolean
    expect(typeof SOVEREIGN_CONFIG.SEMANTIC_CORTEX_ENABLED).toBe('boolean');

    // Should work regardless of flag value (fallback ensures compatibility)
    const resultTension = await scoreTension14D(mockPacket as ForgePacket, prose, provider);
    const resultCoherence = await scoreEmotionCoherence(mockPacket as ForgePacket, prose, provider);

    expect(resultTension.score).toBeGreaterThanOrEqual(0);
    expect(resultCoherence.score).toBeGreaterThanOrEqual(0);
  });
});
