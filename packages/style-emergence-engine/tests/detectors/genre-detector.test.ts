import { describe, it, expect } from 'vitest';
import { detectGenre } from '../../src/detectors/genre-detector.js';
import { buildMinimalProseParagraph, getDefaultEConfig } from '../fixtures.js';

const config = getDefaultEConfig();

describe('Genre Detector', () => {
  it('no genre markers -> PASS', () => {
    const para = buildMinimalProseParagraph({ text: 'The keeper checked the mechanism. Oil levels were low.' });
    const result = detectGenre([para], config);
    expect(result.verdict).toBe('PASS');
  });

  it('detects fantasy markers', () => {
    const para = buildMinimalProseParagraph({ text: 'The chosen one followed the ancient prophecy to find the dark lord in the magical realm.' });
    const result = detectGenre([para], config);
    expect(result.genre_scores['fantasy']).toBeGreaterThan(0);
  });

  it('detects romance markers', () => {
    const para = buildMinimalProseParagraph({ text: 'Her heart skipped when their eyes met. It was love at first sight with a tender embrace and passion.' });
    const result = detectGenre([para], config);
    expect(result.genre_scores['romance']).toBeGreaterThan(0);
  });

  it('detects thriller markers', () => {
    const para = buildMinimalProseParagraph({ text: 'The ticking clock drove the conspiracy deeper. A shadowy figure appeared.' });
    const result = detectGenre([para], config);
    expect(result.genre_scores['thriller']).toBeGreaterThan(0);
  });

  it('computes specificity', () => {
    const para = buildMinimalProseParagraph({ text: 'The chosen one found the dark lord.' });
    const result = detectGenre([para], config);
    expect(result.specificity).toBeGreaterThanOrEqual(0);
  });

  it('mixed genre -> low specificity', () => {
    const para = buildMinimalProseParagraph({ text: 'The keeper worked. No special markers here.' });
    const result = detectGenre([para], config);
    expect(result.specificity).toBeLessThanOrEqual(0.6);
  });

  it('respects threshold', () => {
    const para = buildMinimalProseParagraph({ text: 'Normal text without genre markers.' });
    const result = detectGenre([para], config);
    expect(result.verdict).toBe('PASS');
  });

  it('handles empty', () => {
    const result = detectGenre([], config);
    expect(result.top_score).toBe(0);
    expect(result.verdict).toBe('PASS');
  });

  it('is deterministic', () => {
    const para = buildMinimalProseParagraph({ text: 'The chosen one arose.' });
    const r1 = detectGenre([para], config);
    const r2 = detectGenre([para], config);
    expect(r1.top_genre).toBe(r2.top_genre);
    expect(r1.specificity).toBe(r2.specificity);
  });

  it('lists found markers', () => {
    const para = buildMinimalProseParagraph({ text: 'The chosen one followed the ancient prophecy.' });
    const result = detectGenre([para], config);
    expect(result.genre_markers_found.length).toBeGreaterThan(0);
  });
});
