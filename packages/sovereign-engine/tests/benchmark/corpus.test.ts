/**
 * Tests: Benchmark Corpus (Sprint 17.1)
 * Invariant: ART-BENCH-01
 */

import { describe, it, expect } from 'vitest';
import { OMEGA_CORPUS, HUMAN_CORPUS, FULL_CORPUS } from '../../src/benchmark/corpus.js';

describe('BenchmarkCorpus (ART-BENCH-01)', () => {
  it('CORP-01: 10 textes OMEGA', () => {
    expect(OMEGA_CORPUS.length).toBe(10);
    for (const sample of OMEGA_CORPUS) {
      expect(sample.source).toBe('omega');
      expect(sample.id).toMatch(/^OMEGA-/);
      expect(sample.prose.length).toBeGreaterThan(100);
      expect(sample.genre.length).toBeGreaterThan(0);
      expect(sample.word_count).toBeGreaterThan(100);
    }
  });

  it('CORP-02: 10 textes humains', () => {
    expect(HUMAN_CORPUS.length).toBe(10);
    for (const sample of HUMAN_CORPUS) {
      expect(sample.source).toBe('human');
      expect(sample.id).toMatch(/^HUMAN-/);
      expect(sample.prose.length).toBeGreaterThan(100);
      expect(sample.genre.length).toBeGreaterThan(0);
      expect(sample.word_count).toBeGreaterThan(100);
    }
  });

  it('CORP-03: corpus complet = 20 échantillons', () => {
    expect(FULL_CORPUS.length).toBe(20);
    const ids = FULL_CORPUS.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(20); // all unique
  });

  it('CORP-04: genres variés dans OMEGA', () => {
    const genres = new Set(OMEGA_CORPUS.map(s => s.genre));
    expect(genres.size).toBeGreaterThanOrEqual(8); // at least 8 different genres
  });

  it('CORP-05: genres variés dans humains', () => {
    const genres = new Set(HUMAN_CORPUS.map(s => s.genre));
    expect(genres.size).toBeGreaterThanOrEqual(8);
  });
});
