/**
 * Tests: Adversarial Judge Cache
 * Invariant: ART-AUTH-02 (fraud_score LLM reproductible via cache)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { judgeFraudScore } from '../../src/authenticity/adversarial-judge.js';
import { SemanticCache } from '../../src/semantic/semantic-cache.js';
import type { SovereignProvider } from '../../src/types.js';

describe('Adversarial Judge Cache (ART-AUTH-02)', () => {
  let cache: SemanticCache;
  let callCount: number;

  beforeEach(() => {
    cache = new SemanticCache();
    callCount = 0;
  });

  /**
   * Mock provider qui compte les appels LLM
   */
  function createMockProvider(): SovereignProvider {
    return {
      model_id: 'mock-model-v1',
      llm_generate: async (params) => {
        callCount++;
        // Retourner un JSON valide simulé
        return {
          text: JSON.stringify({
            score: 75,
            rationale: 'Quelques transitions rigides mais présence d\'aspérités humaines.',
            worst_sentences: ['Phrase 1', 'Phrase 2', 'Phrase 3'],
          }),
          usage: { input_tokens: 100, output_tokens: 50 },
        };
      },
    };
  }

  it('AUTH-02: cache → 2 appels identiques → 1 seule requête provider', async () => {
    const provider = createMockProvider();
    const prose = 'Il marchait lentement dans la rue déserte. Le vent sifflait entre les immeubles.';

    // Premier appel
    const result1 = await judgeFraudScore(prose, provider, cache);
    expect(result1.fraud_score).toBe(75);
    expect(result1.cached).toBe(false);
    expect(result1.method).toBe('llm');
    expect(callCount).toBe(1); // 1 appel LLM

    // Deuxième appel (même prose, même provider)
    const result2 = await judgeFraudScore(prose, provider, cache);
    expect(result2.fraud_score).toBe(75);
    expect(result2.cached).toBe(true); // Cache hit
    expect(result2.method).toBe('llm');
    expect(callCount).toBe(1); // Toujours 1 seul appel LLM (cache utilisé)
  });

  it('AUTH-03: fraud_score reproductible (même texte = même score via cache)', async () => {
    const provider = createMockProvider();
    const prose = 'Le ciel était bleu. Les oiseaux chantaient. La vie continuait.';

    // 3 appels consécutifs
    const result1 = await judgeFraudScore(prose, provider, cache);
    const result2 = await judgeFraudScore(prose, provider, cache);
    const result3 = await judgeFraudScore(prose, provider, cache);

    // Scores identiques (reproductibilité)
    expect(result1.fraud_score).toBe(result2.fraud_score);
    expect(result2.fraud_score).toBe(result3.fraud_score);

    // Rationale identique
    expect(result1.rationale).toBe(result2.rationale);
    expect(result2.rationale).toBe(result3.rationale);

    // Seulement 1 appel LLM total
    expect(callCount).toBe(1);

    // Premier non-cached, suivants cached
    expect(result1.cached).toBe(false);
    expect(result2.cached).toBe(true);
    expect(result3.cached).toBe(true);
  });
});
