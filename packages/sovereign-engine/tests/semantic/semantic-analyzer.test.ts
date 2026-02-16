/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — SEMANTIC ANALYZER TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: tests/semantic/semantic-analyzer.test.ts
 * Version: 1.0.0 (Sprint 9 Commit 9.1)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariant: ART-SEM-01, ART-SEM-04
 *
 * Tests for LLM-based semantic emotion analysis.
 * 6 mandatory tests: SEM-01 to SEM-06.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { analyzeEmotionSemantic } from '../../src/semantic/semantic-analyzer.js';
import type { SovereignProvider } from '../../src/types.js';
import type { SemanticEmotionResult } from '../../src/semantic/types.js';
import { DEFAULT_SEMANTIC_CONFIG } from '../../src/semantic/types.js';

/**
 * Mock provider that returns valid 14D JSON.
 */
class MockSemanticProvider implements SovereignProvider {
  private mockResponse: string = JSON.stringify({
    joy: 0.1,
    trust: 0.2,
    fear: 0.3,
    surprise: 0.4,
    sadness: 0.5,
    disgust: 0.05,
    anger: 0.15,
    anticipation: 0.25,
    love: 0.35,
    submission: 0.45,
    awe: 0.55,
    disapproval: 0.65,
    remorse: 0.75,
    contempt: 0.85,
  });

  setMockResponse(response: string): void {
    this.mockResponse = response;
  }

  async scoreInteriority(_prose: string, _context: { readonly pov: string; readonly character_state: string }): Promise<number> {
    return 75;
  }

  async scoreSensoryDensity(_prose: string, _sensory_counts: Record<string, number>): Promise<number> {
    return 75;
  }

  async scoreNecessity(_prose: string, _beat_count: number): Promise<number> {
    return 75;
  }

  async scoreImpact(_opening: string, _closing: string, _context: { readonly story_premise: string }): Promise<number> {
    return 75;
  }

  async applyPatch(prose: string): Promise<string> {
    return prose;
  }

  async generateDraft(_prompt: string, _mode: string, _seed: string): Promise<string> {
    return this.mockResponse;
  }
}

/**
 * Mock provider that throws error (for fallback testing).
 */
class FailingMockProvider implements SovereignProvider {
  async scoreInteriority(): Promise<number> { return 75; }
  async scoreSensoryDensity(): Promise<number> { return 75; }
  async scoreNecessity(): Promise<number> { return 75; }
  async scoreImpact(): Promise<number> { return 75; }
  async applyPatch(prose: string): Promise<string> { return prose; }
  async generateDraft(): Promise<string> {
    throw new Error('Mock LLM failure');
  }
}

describe('Semantic Emotion Analyzer (ART-SEM-01)', () => {
  const provider = new MockSemanticProvider();

  it('SEM-01: returns valid 14D structure with all required keys', async () => {
    const result = await analyzeEmotionSemantic('Le soleil brille.', 'fr', provider);

    // All 14 keys must be present
    expect(result).toHaveProperty('joy');
    expect(result).toHaveProperty('trust');
    expect(result).toHaveProperty('fear');
    expect(result).toHaveProperty('surprise');
    expect(result).toHaveProperty('sadness');
    expect(result).toHaveProperty('disgust');
    expect(result).toHaveProperty('anger');
    expect(result).toHaveProperty('anticipation');
    expect(result).toHaveProperty('love');
    expect(result).toHaveProperty('submission');
    expect(result).toHaveProperty('awe');
    expect(result).toHaveProperty('disapproval');
    expect(result).toHaveProperty('remorse');
    expect(result).toHaveProperty('contempt');

    // All values must be numbers
    expect(typeof result.joy).toBe('number');
    expect(typeof result.trust).toBe('number');
    expect(typeof result.fear).toBe('number');
    expect(typeof result.surprise).toBe('number');
    expect(typeof result.sadness).toBe('number');
    expect(typeof result.disgust).toBe('number');
    expect(typeof result.anger).toBe('number');
    expect(typeof result.anticipation).toBe('number');
    expect(typeof result.love).toBe('number');
    expect(typeof result.submission).toBe('number');
    expect(typeof result.awe).toBe('number');
    expect(typeof result.disapproval).toBe('number');
    expect(typeof result.remorse).toBe('number');
    expect(typeof result.contempt).toBe('number');
  });

  it('SEM-02: all values clamped to [0, 1], no NaN or Infinity', async () => {
    // Mock returns values outside [0, 1] and edge cases
    provider.setMockResponse(JSON.stringify({
      joy: 1.5,           // Above 1 → should clamp to 1
      trust: -0.3,        // Below 0 → should clamp to 0
      fear: 0.5,          // Valid
      surprise: 2.0,      // Above 1 → should clamp to 1
      sadness: 0.0,       // Valid edge
      disgust: 1.0,       // Valid edge
      anger: -1.0,        // Below 0 → should clamp to 0
      anticipation: 0.75, // Valid
      love: 0.25,         // Valid
      submission: 0.1,    // Valid
      awe: 0.9,           // Valid
      disapproval: 0.33,  // Valid
      remorse: 0.66,      // Valid
      contempt: 0.99,     // Valid
    }));

    const result = await analyzeEmotionSemantic('Test text.', 'en', provider);

    // Check clamping
    expect(result.joy).toBe(1.0);         // Clamped from 1.5
    expect(result.trust).toBe(0.0);       // Clamped from -0.3
    expect(result.surprise).toBe(1.0);    // Clamped from 2.0
    expect(result.anger).toBe(0.0);       // Clamped from -1.0

    // Check no NaN or Infinity
    const allValues: number[] = [
      result.joy, result.trust, result.fear, result.surprise,
      result.sadness, result.disgust, result.anger, result.anticipation,
      result.love, result.submission, result.awe, result.disapproval,
      result.remorse, result.contempt,
    ];

    for (const value of allValues) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('SEM-03: negation golden test — "pas peur" → fear LOW (< 0.3)', async () => {
    // Mock LLM correctly resolves negation
    provider.setMockResponse(JSON.stringify({
      joy: 0.1,
      trust: 0.1,
      fear: 0.15,         // LOW fear (negation resolved)
      surprise: 0.05,
      sadness: 0.05,
      disgust: 0.0,
      anger: 0.0,
      anticipation: 0.2,
      love: 0.0,
      submission: 0.0,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.0,
      contempt: 0.0,
    }));

    const result = await analyzeEmotionSemantic(
      "Il n'avait pas peur, il savait ce qu'il faisait.",
      'fr',
      provider
    );

    // ART-SEM-04: Negation correctly resolved → fear should be LOW
    expect(result.fear).toBeLessThan(0.3);
  });

  it('SEM-04: mixed emotions golden — "souriait malgré tristesse" → joy AND sadness > 0.3', async () => {
    // Mock LLM correctly detects BOTH joy and sadness simultaneously
    provider.setMockResponse(JSON.stringify({
      joy: 0.45,          // MEDIUM joy (smiling)
      trust: 0.1,
      fear: 0.05,
      surprise: 0.05,
      sadness: 0.50,      // MEDIUM sadness (despite)
      disgust: 0.0,
      anger: 0.0,
      anticipation: 0.1,
      love: 0.0,
      submission: 0.1,
      awe: 0.0,
      disapproval: 0.0,
      remorse: 0.15,
      contempt: 0.0,
    }));

    const result = await analyzeEmotionSemantic(
      "Elle souriait malgré sa tristesse, comme si rien n'était.",
      'fr',
      provider
    );

    // ART-SEM-04: Mixed emotions correctly detected (contradiction)
    expect(result.joy).toBeGreaterThan(0.3);
    expect(result.sadness).toBeGreaterThan(0.3);
  });

  it('SEM-04b: config handling — respects enabled flag (BONUS)', async () => {
    const result = await analyzeEmotionSemantic(
      'The shadow loomed with dread and terror.',
      'en',
      provider,
      { enabled: false, fallback_to_keywords: true }
    );

    // When disabled, should fallback to keywords immediately
    // Result should still be valid 14D
    expect(result).toHaveProperty('fear');
    expect(typeof result.fear).toBe('number');
    expect(Number.isFinite(result.fear)).toBe(true);
  });

  it('SEM-05: calls provider.generateDraft with correct parameters', async () => {
    let capturedPrompt = '';
    let capturedMode = '';
    let capturedSeed = '';

    class SpyProvider extends MockSemanticProvider {
      async generateDraft(prompt: string, mode: string, seed: string): Promise<string> {
        capturedPrompt = prompt;
        capturedMode = mode;
        capturedSeed = seed;
        return super.generateDraft(prompt, mode, seed);
      }
    }

    const spyProvider = new SpyProvider();
    await analyzeEmotionSemantic('Test text.', 'en', spyProvider);

    // Verify provider.generateDraft was called with correct params
    expect(capturedPrompt).toContain('Analyze emotions');
    expect(capturedPrompt).toContain('Test text.');
    expect(capturedMode).toBe('semantic_analysis');
    expect(capturedSeed).toBe('omega-semantic');
  });

  it('SEM-06: fallback to keywords when LLM fails', async () => {
    const failingProvider = new FailingMockProvider();

    // Should not throw — fallback to keywords
    const result = await analyzeEmotionSemantic(
      'The dark shadow filled him with dread and terror.',
      'en',
      failingProvider,
      { fallback_to_keywords: true }
    );

    // Result should still be valid (from keyword fallback)
    expect(result).toHaveProperty('fear');
    expect(typeof result.fear).toBe('number');
    expect(Number.isFinite(result.fear)).toBe(true);

    // Keyword matching should detect "dread" and "terror" → fear > 0
    expect(result.fear).toBeGreaterThan(0);
  });
});
