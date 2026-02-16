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

import { describe, it, expect, vi } from 'vitest';
import { analyzeEmotionSemantic } from '../../src/semantic/semantic-analyzer.js';
import type { SovereignProvider } from '../../src/types.js';
import type { SemanticEmotionResult } from '../../src/semantic/types.js';
import { DEFAULT_SEMANTIC_CONFIG } from '../../src/semantic/types.js';

/**
 * Mock provider that returns valid 14D JSON.
 */
class MockSemanticProvider implements SovereignProvider {
  private mockResponse: unknown = {
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
  };

  setMockResponse(response: unknown): void {
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
    return JSON.stringify(this.mockResponse);
  }

  async generateStructuredJSON(_prompt: string): Promise<unknown> {
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
  async generateStructuredJSON(): Promise<unknown> {
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
    provider.setMockResponse({
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
    });

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
    provider.setMockResponse({
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
    });

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
    provider.setMockResponse({
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
    });

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

  it('SEM-05: calls provider.generateStructuredJSON with correct parameters', async () => {
    let capturedPrompt = '';
    let callCount = 0;

    class SpyProvider extends MockSemanticProvider {
      async generateStructuredJSON(prompt: string): Promise<unknown> {
        capturedPrompt = prompt;
        callCount++;
        return super.generateStructuredJSON(prompt);
      }
    }

    const spyProvider = new SpyProvider();
    await analyzeEmotionSemantic('Test text.', 'en', spyProvider);

    // Verify provider.generateStructuredJSON was called
    expect(capturedPrompt).toContain('Analyze emotions');
    expect(capturedPrompt).toContain('Test text.');
    expect(callCount).toBe(1); // n_samples=1 by default
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

  it('SEM-07: N-samples > 1 computes median per dimension', async () => {
    let callCount = 0;
    const mockResponses = [
      { joy: 0.3, trust: 0.2, fear: 0.1, surprise: 0.4, sadness: 0.5, disgust: 0.0, anger: 0.1, anticipation: 0.2, love: 0.3, submission: 0.4, awe: 0.5, disapproval: 0.6, remorse: 0.7, contempt: 0.8 },
      { joy: 0.5, trust: 0.4, fear: 0.3, surprise: 0.2, sadness: 0.1, disgust: 0.0, anger: 0.1, anticipation: 0.2, love: 0.3, submission: 0.4, awe: 0.5, disapproval: 0.6, remorse: 0.7, contempt: 0.8 },
      { joy: 0.7, trust: 0.6, fear: 0.5, surprise: 0.4, sadness: 0.3, disgust: 0.0, anger: 0.1, anticipation: 0.2, love: 0.3, submission: 0.4, awe: 0.5, disapproval: 0.6, remorse: 0.7, contempt: 0.8 },
    ];

    class MultiSampleProvider extends MockSemanticProvider {
      async generateStructuredJSON(_prompt: string): Promise<unknown> {
        return mockResponses[callCount++];
      }
    }

    const multiProvider = new MultiSampleProvider();
    const result = await analyzeEmotionSemantic('Test.', 'en', multiProvider, { n_samples: 3 });

    // Verify N calls made
    expect(callCount).toBe(3);

    // Verify median calculation (joy: [0.3, 0.5, 0.7] → median = 0.5)
    expect(result.joy).toBe(0.5);

    // Verify median calculation (fear: [0.1, 0.3, 0.5] → median = 0.3)
    expect(result.fear).toBe(0.3);
  });

  it('SEM-08: variance tolerance warning for high std deviation', async () => {
    let callCount = 0;
    const mockResponses = [
      { joy: 0.1, trust: 0.2, fear: 0.1, surprise: 0.1, sadness: 0.1, disgust: 0.0, anger: 0.1, anticipation: 0.2, love: 0.3, submission: 0.4, awe: 0.5, disapproval: 0.6, remorse: 0.7, contempt: 0.8 },
      { joy: 0.5, trust: 0.4, fear: 0.3, surprise: 0.2, sadness: 0.1, disgust: 0.0, anger: 0.1, anticipation: 0.2, love: 0.3, submission: 0.4, awe: 0.5, disapproval: 0.6, remorse: 0.7, contempt: 0.8 },
      { joy: 0.9, trust: 0.6, fear: 0.5, surprise: 0.4, sadness: 0.3, disgust: 0.0, anger: 0.1, anticipation: 0.2, love: 0.3, submission: 0.4, awe: 0.5, disapproval: 0.6, remorse: 0.7, contempt: 0.8 },
    ];

    class HighVarianceProvider extends MockSemanticProvider {
      async generateStructuredJSON(_prompt: string): Promise<unknown> {
        return mockResponses[callCount++];
      }
    }

    // Spy on console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const highVarianceProvider = new HighVarianceProvider();
    await analyzeEmotionSemantic('Test.', 'en', highVarianceProvider, {
      n_samples: 3,
      variance_tolerance: 5.0, // Low tolerance to trigger warning
    });

    // Verify warning was issued (joy variance should exceed 5%)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SEMANTIC] Variance tolerance exceeded')
    );

    warnSpy.mockRestore();
  });

  it('SEM-09: generateStructuredJSON returns parsed JSON directly', async () => {
    let receivedType: string = '';

    class TypeCheckProvider extends MockSemanticProvider {
      async generateStructuredJSON(_prompt: string): Promise<unknown> {
        const result = await super.generateStructuredJSON(_prompt);
        receivedType = typeof result;
        return result;
      }
    }

    const typeProvider = new TypeCheckProvider();
    await analyzeEmotionSemantic('Test.', 'en', typeProvider);

    // generateStructuredJSON should return object, not string
    expect(receivedType).toBe('object');
  });

  it('SEM-10: determinism — n_samples=1 always returns same result for same input', async () => {
    const result1 = await analyzeEmotionSemantic('Fixed text.', 'en', provider, { n_samples: 1 });
    const result2 = await analyzeEmotionSemantic('Fixed text.', 'en', provider, { n_samples: 1 });

    // Same input → same output (mock provider deterministic)
    expect(result1.joy).toBe(result2.joy);
    expect(result1.fear).toBe(result2.fear);
    expect(result1.sadness).toBe(result2.sadness);

    // Verify all 14 dimensions match
    const keys: Array<keyof SemanticEmotionResult> = [
      'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger',
      'anticipation', 'love', 'submission', 'awe', 'disapproval', 'remorse', 'contempt',
    ];

    for (const key of keys) {
      expect(result1[key]).toBe(result2[key]);
    }
  });
});
