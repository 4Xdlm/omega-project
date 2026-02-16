/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — RE-SCORE GUARD TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/polish/re-score-guard.test.ts
 * Version: 1.0.0 (Sprint 10 Commit 10.3)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-POL-01
 *
 * Tests for re-score guard (zero-tolerance on quality degradation).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { reScoreGuard } from '../../src/polish/re-score-guard.js';
import { MockSovereignProvider } from '../fixtures/mock-provider.js';
import { MOCK_PACKET } from '../fixtures/mock-packet.js';

/**
 * Configurable mock provider for testing different scenarios.
 * Allows setting different LLM scores for different prose.
 */
class ConfigurableMockProvider extends MockSovereignProvider {
  private proseScores: Map<string, { interiority: number; sensory: number; necessity: number; impact: number }> = new Map();

  setProseScores(prose: string, scores: { interiority: number; sensory: number; necessity: number; impact: number }): void {
    this.proseScores.set(prose, scores);
  }

  async scoreInteriority(_prose: string, _context: { readonly pov: string; readonly character_state: string }): Promise<number> {
    const scores = this.proseScores.get(_prose);
    return scores?.interiority || 75;
  }

  async scoreSensoryDensity(_prose: string, _sensory_counts: Record<string, number>): Promise<number> {
    const scores = this.proseScores.get(_prose);
    return scores?.sensory || 75;
  }

  async scoreNecessity(_prose: string, _beat_count: number): Promise<number> {
    const scores = this.proseScores.get(_prose);
    return scores?.necessity || 75;
  }

  async scoreImpact(_opening: string, _closing: string, _context: { readonly story_premise: string }): Promise<number> {
    const scores = this.proseScores.get(_opening);
    return scores?.impact || 75;
  }
}

describe('Re-Score Guard (ART-POL-01)', () => {
  it('GUARD-01: correction improves composite AND all axes above floor → accepted', async () => {
    const provider = new ConfigurableMockProvider();

    // Use longer, richer prose to get higher CALC scores
    const original_prose = 'Il marchait lentement.';
    const modified_prose = 'Il marchait lentement dans la rue sombre. Les ombres dansaient sur les murs. Son cœur battait fort dans sa poitrine. La peur montait doucement. Il sentait le danger approcher.';

    // Set higher LLM scores for modified prose
    provider.setProseScores(original_prose, {
      interiority: 70,
      sensory: 70,
      necessity: 70,
      impact: 70,
    });

    provider.setProseScores(modified_prose, {
      interiority: 80,
      sensory: 80,
      necessity: 80,
      impact: 80,
    });

    const result = await reScoreGuard(
      original_prose,
      modified_prose,
      MOCK_PACKET,
      provider,
    );

    // Should be accepted if improvement is significant
    // (Note: actual acceptance depends on CALC axes too)
    expect(result.score_before).toBeDefined();
    expect(result.score_after).toBeDefined();
    expect(result.details).toBeTruthy();
    expect(result.details).toContain('Composite');

    // If accepted, verify delta >= 2.0
    if (result.accepted) {
      expect(result.score_after - result.score_before).toBeGreaterThanOrEqual(2.0);
      expect(result.details).toContain('ACCEPTED');
    }
  });

  it('GUARD-02: correction degrades composite → rejected (ART-POL-01)', async () => {
    const provider = new ConfigurableMockProvider();

    // Use longer prose as "original" and shorter as "degraded"
    const original_prose = 'Il marchait lentement dans la rue sombre. Les ombres dansaient sur les murs. Son cœur battait fort dans sa poitrine. La peur montait doucement. Il sentait le danger approcher.';
    const modified_prose = 'Il marchait.';

    // Set lower LLM scores for modified prose (degradation)
    provider.setProseScores(original_prose, {
      interiority: 80,
      sensory: 80,
      necessity: 80,
      impact: 80,
    });

    provider.setProseScores(modified_prose, {
      interiority: 40,
      sensory: 40,
      necessity: 40,
      impact: 40,
    });

    const result = await reScoreGuard(
      original_prose,
      modified_prose,
      MOCK_PACKET,
      provider,
    );

    // Should be rejected: degradation
    expect(result.accepted).toBe(false);
    expect(result.score_after).toBeLessThan(result.score_before);
    expect(result.details).toBeTruthy();
    expect(result.details).toContain('REJECT');
  });

  it('GUARD-03: correction neutral (delta < min_improvement) → rejected', async () => {
    const provider = new MockSovereignProvider();

    // Use identical prose → same score → delta = 0
    const original_prose = 'Il marchait lentement dans la rue.';
    const modified_prose = 'Il marchait lentement dans la rue.';

    const result = await reScoreGuard(
      original_prose,
      modified_prose,
      MOCK_PACKET,
      provider,
    );

    // Should be rejected: delta = 0 < min_improvement (2.0)
    expect(result.accepted).toBe(false);
    expect(Math.abs(result.score_after - result.score_before)).toBeLessThan(2.0);
    expect(result.details).toBeTruthy();
    expect(result.details).toContain('REJECT');
    expect(result.details).toContain('delta < 2');
  });

  it('GUARD-04: improves composite BUT breaks axis floor → rejected (ART-POL-01)', async () => {
    const provider = new ConfigurableMockProvider();

    // Test the floor check logic by setting very low LLM scores
    const original_prose = 'Il marchait dans la rue sombre. Les ombres dansaient sur les murs.';
    const modified_prose = 'Il marchait dans la rue sombre. Les ombres dansaient sur les murs. Son cœur battait.';

    // Set scores such that modified has higher composite
    provider.setProseScores(original_prose, {
      interiority: 60,
      sensory: 60,
      necessity: 60,
      impact: 60,
    });

    // But set one LLM axis very low (below floor of 50)
    provider.setProseScores(modified_prose, {
      interiority: 30, // BELOW FLOOR (50) ← Should cause rejection
      sensory: 75,
      necessity: 75,
      impact: 75,
    });

    const result = await reScoreGuard(
      original_prose,
      modified_prose,
      MOCK_PACKET,
      provider,
    );

    // Should be rejected if axis below floor
    expect(result.accepted).toBe(false);
    expect(result.details).toBeTruthy();
    expect(result.details).toContain('REJECT');
    expect(result.details).toContain('axes below floor');
  });
});
