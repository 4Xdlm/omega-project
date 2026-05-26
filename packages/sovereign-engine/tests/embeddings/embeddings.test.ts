/**
 * OMEGA V2.2 — Embeddings Tests
 *
 * Unit tests (pure functions) + integration tests (Ollama API conditional).
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  crossChunkContinuity,
  l2Norm,
  normalize,
  OllamaEmbedder,
  DEFAULT_OLLAMA_CONFIG,
  EmbeddingError,
} from '../../src/embeddings/index.js';

describe('OMEGA V2.2 — Embeddings Similarity (pure)', () => {
  describe('cosineSimilarity', () => {
    it('identical vectors → 1', () => {
      const a = new Float32Array([1, 2, 3]);
      expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
    });

    it('orthogonal vectors → 0', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([0, 1]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('opposite vectors → -1', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([-1, 0]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5);
    });

    it('throws on dimension mismatch', () => {
      const a = new Float32Array([1, 2]);
      const b = new Float32Array([1, 2, 3]);
      expect(() => cosineSimilarity(a, b)).toThrow(EmbeddingError);
    });

    it('empty vectors → 0', () => {
      const a = new Float32Array([]);
      const b = new Float32Array([]);
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('zero norm → 0', () => {
      const a = new Float32Array([0, 0, 0]);
      const b = new Float32Array([1, 2, 3]);
      expect(cosineSimilarity(a, b)).toBe(0);
    });
  });

  describe('crossChunkContinuity', () => {
    it('empty embeddings → score 0', () => {
      const r = crossChunkContinuity([]);
      expect(r.score).toBe(0);
      expect(r.chunk_count).toBe(0);
    });

    it('single chunk → score 0', () => {
      const r = crossChunkContinuity([new Float32Array([1, 2])]);
      expect(r.score).toBe(0);
      expect(r.chunk_count).toBe(1);
    });

    it('identical chunks → high continuity', () => {
      const v = new Float32Array([1, 2, 3]);
      const r = crossChunkContinuity([v, v, v]);
      expect(r.score).toBeCloseTo(1, 5);
      expect(r.pair_scores.length).toBe(2);
    });

    it('orthogonal chunks → 0', () => {
      const r = crossChunkContinuity([
        new Float32Array([1, 0]),
        new Float32Array([0, 1]),
        new Float32Array([1, 0]),
      ]);
      expect(r.score).toBeCloseTo(0, 5);
    });
  });

  describe('l2Norm', () => {
    it('unit vector', () => {
      expect(l2Norm(new Float32Array([1, 0, 0]))).toBe(1);
    });

    it('3-4-5 triangle', () => {
      expect(l2Norm(new Float32Array([3, 4]))).toBe(5);
    });

    it('zero vector', () => {
      expect(l2Norm(new Float32Array([0, 0, 0]))).toBe(0);
    });
  });

  describe('normalize', () => {
    it('zero vector → zero', () => {
      const v = normalize(new Float32Array([0, 0]));
      expect(v[0]).toBe(0);
      expect(v[1]).toBe(0);
    });

    it('unit vector preserved', () => {
      const v = normalize(new Float32Array([1, 0]));
      expect(v[0]).toBeCloseTo(1, 5);
      expect(v[1]).toBe(0);
    });

    it('non-unit vector normalized', () => {
      const v = normalize(new Float32Array([3, 4]));
      expect(l2Norm(v)).toBeCloseTo(1, 5);
    });
  });
});

describe('OMEGA V2.2 — OllamaEmbedder (config validation)', () => {
  it('rejects negative dimensions', () => {
    expect(
      () =>
        new OllamaEmbedder({
          ...DEFAULT_OLLAMA_CONFIG,
          dimensions: -1,
        })
    ).toThrow(EmbeddingError);
  });

  it('rejects non-http endpoint', () => {
    expect(
      () =>
        new OllamaEmbedder({
          ...DEFAULT_OLLAMA_CONFIG,
          endpoint: 'ftp://localhost',
        })
    ).toThrow(EmbeddingError);
  });

  it('default config valid', () => {
    expect(() => new OllamaEmbedder()).not.toThrow();
  });

  it('embed empty text rejected', async () => {
    const e = new OllamaEmbedder();
    await expect(e.embed('')).rejects.toThrow(EmbeddingError);
    await expect(e.embed('   ')).rejects.toThrow(EmbeddingError);
  });
});

describe('OMEGA V2.2 — OllamaEmbedder (integration, conditional)', () => {
  // These tests require Ollama running + nomic-embed-text loaded.
  // If unavailable, tests skip via healthCheck.

  it('healthCheck returns ok when Ollama runs with model', async () => {
    const e = new OllamaEmbedder();
    const health = await e.healthCheck();
    // Don't fail CI if Ollama down — log only
    if (!health.ok) {
      console.warn(`[SKIP] Ollama unavailable: ${health.reason}`);
      return;
    }
    expect(health.ok).toBe(true);
  }, 10000);

  it('embed returns 768-dim vector for nomic-embed-text', async () => {
    const e = new OllamaEmbedder();
    const health = await e.healthCheck();
    if (!health.ok) {
      console.warn(`[SKIP] Ollama unavailable: ${health.reason}`);
      return;
    }
    const v = await e.embed('Le ciel était bleu et calme.');
    expect(v).toBeInstanceOf(Float32Array);
    expect(v.length).toBe(768);
  }, 30000);

  it('embeddings of similar texts have high cosine similarity', async () => {
    const e = new OllamaEmbedder();
    const health = await e.healthCheck();
    if (!health.ok) {
      console.warn(`[SKIP] Ollama unavailable: ${health.reason}`);
      return;
    }
    const v1 = await e.embed('Le chat dort sur le canapé.');
    const v2 = await e.embed('Un chat sommeille sur le sofa.');
    const sim = cosineSimilarity(v1, v2);
    expect(sim).toBeGreaterThan(0.5);
  }, 30000);

  it('embeddings of opposite themes have lower similarity', async () => {
    const e = new OllamaEmbedder();
    const health = await e.healthCheck();
    if (!health.ok) {
      console.warn(`[SKIP] Ollama unavailable: ${health.reason}`);
      return;
    }
    const v1 = await e.embed('La joie illuminait le visage de l\'enfant.');
    const v2 = await e.embed('La tristesse pesait dans la pièce sombre.');
    const sim = cosineSimilarity(v1, v2);
    expect(sim).toBeLessThan(0.9); // not identical but related (both emotional)
  }, 30000);
});
